/**
 * 扫描一体机工作站 - 业务编排 composable
 *
 * 由 KioskLayout.vue 顶层调用一次，4 个 stage 子路由通过 inject('kioskCtx') 共享。
 * 所有业务逻辑（API 调用 / SSE 接入 / 轮询 / 恢复 / 互斥规则 / 错误处理）在这里
 * 统一收口；UI 层只读 reactive state + 调用本 composable 暴露的 method，不直接调底层 API。
 *
 * 业务约束：
 *   - canStartScan / canSwitchExam / canSwitchScanner / canSwitchScanMode 由后端上下文和本地任务状态共同决定
 *   - SSE 增量 → 800ms 防抖刷新 context + ledger
 *   - 健康轮询 5s / 上下文轮询 15s / 任务轮询 1.5s / busy 轮询 2s
 *   - 任务终态收口：REPORTED/CANCELLED 关闭锚点；FAILED 保留中间页供重试
 *   - 单页废弃：仅 DATABASE 来源 + 已落库 localPageId
 */

import type { LocationQueryValue } from 'vue-router'
import type {
  AgentHealthResponse,
  AgentHealthStatus,
  AgentUpdateStatus,
  LocalScanJobStatus,
  ScanJobListResponse,
  ScanJobResponse,
  ScannerDeviceInfo,
  ScannerListResponse,
} from '@/apis/mark/scanner-agent-local'
import type {
  ExamScannerBatchLifecycleVO,
  ExamScannerBoundPaperItemVO,
  ExamScannerKioskBatchHistoryItem,
  ExamScannerKioskBatchHistoryRequest,
  ExamScannerKioskContextVO,
  ExamScannerKioskExamOptionRequest,
  ExamScannerKioskExamOptionVO,
  ExamScannerLedgerDataSource,
  ExamScannerPageLedgerVO,
  ExamScannerPageRegistrationStatus,
  ExamScannerScanConfigVO,
  ExamScannerScanConfigOptionsVO,
  ScanAttentionTypeCode,
  ScannerKioskScanMode,
} from '@/apis/mark/scanner-kiosk'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SCANNER_ENDPOINT_ONLINE_STATUS_LABEL } from '@/apis/mark/exam-mark-scanner'
import {
  activateLocalAgent,
  AGENT_HEALTH_STATUS_LABEL,
  AGENT_UPDATE_STATUS_LABEL,
  cancelScanJob,
  deleteScanJob,
  discardScanJob,
  endBatch,
  getAgentHealth,
  getAgentSetupContext,
  getPageImageUrl,
  getScanJob,
  installAgentUpdate,
  listLocalScanners,
  listScanJobs,
  LocalAgentUnavailableError,
  pauseScanJob,
  resumeScanJob,
  retryCommit,
  retryUpload,
  ScannerBusyError,
  setPreferredLocalScanner,
  startScanJob,
} from '@/apis/mark/scanner-agent-local'
import {
  bindScannerKioskExam,
  closeScannerKioskBatch,
  discardScannedPage,
  discardScannerKioskBatch,
  fetchScannerPageLedger,
  getScannerKioskBootstrap,
  getScannerKioskContext,
  listScannerKioskBoundPapers,
  pageScannerKioskBatchHistory,
  pageScannerKioskExamOptions,
  startScannerKioskBatch,
} from '@/apis/mark/scanner-kiosk'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { getSemesterDescription, SemesterOptions } from '@/types/enums'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import {
  clearKioskAuthSession,
  getKioskBindingProfile,
  hasMarkScannerKioskAuth,
  KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE,
  KIOSK_BROWSER_SESSION_SYNC_MESSAGE,
  needsKioskBrowserSessionSync,
  recoverKioskBrowserSessionFromAgent,
  saveKioskAuthSession,
} from '@/utils/kiosk-auth'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'
import { promptModal } from '@/views/quality/_helpers'

// ================================================================
// 静态字典：扫描策略色彩 / 单面双面扫描文案，由 UI / SideRail 直接读取。
// ================================================================

type ScanColorMode = ExamScannerScanConfigVO['colorMode']
type ScanDuplexMode = ExamScannerScanConfigVO['duplexMode']

export const SCANNER_COLOR_MODE_LABEL: Record<ScanColorMode, string> = {
  COLOR: '彩色',
  GRAY: '灰度',
  LINEART: '黑白',
}

export const SCANNER_DUPLEX_MODE_LABEL: Record<ScanDuplexMode, string> = {
  SIMPLEX: '单面扫描',
  DUPLEX: '双面扫描',
}

/** 本地扫描任务状态文案：一体机页面只展示现场操作语义，不暴露 Agent 状态编码。 */
const LOCAL_SCAN_JOB_STATUS_LABEL: Record<LocalScanJobStatus, string> = {
  CREATED: '已创建',
  SCANNING: '扫描中',
  PAUSED: '已暂停',
  READYTOUPLOAD: '待上传',
  UPLOADING: '上传中',
  REPORTED: '已上报',
  FAILED: '处理失败',
  RETRYING: '重试中',
  CANCELLED: '已取消',
}

const KIOSK_BATCH_SUBMITTED_HINT
  = '批次已上传，可在阅卷中心「扫描录入」查看异常；试卷与答题卡均支持在线复核'

export { getSemesterDescription, SemesterOptions }

// ================================================================
// 主 composable
// ================================================================

export function useKioskWorkflow() {
  const route = useRoute()
  const router = useRouter()
  const gatewayBaseUrlEnv = import.meta.env.VITE_SCANNER_GATEWAY_BASE_URL
  const defaultGatewayBaseUrl
    = typeof gatewayBaseUrlEnv === 'string' ? gatewayBaseUrlEnv.trim() : ''

  // -------------------------------------------------------------
  // reactive state：承载一体机工作台的浏览器态、Agent 态和后端上下文锚点。
  // -------------------------------------------------------------

  const health = ref<AgentHealthResponse | null>(null)
  const scanners = ref<ScannerDeviceInfo[]>([])
  const selectedScannerId = ref('')
  const agentPreferredLocalScannerId = ref('')
  const kioskContext = ref<ExamScannerKioskContextVO | null>(null)
  const boundPapers = ref<ExamScannerBoundPaperItemVO[]>([])
  const boundPapersLoading = ref(false)
  const boundPapersError = ref<Error | null>(null)
  const currentJob = ref<ScanJobResponse | null>(null)
  /** 终态清空 currentJob 后，Review 阶段仍用此 ID 拉本地页预览。 */
  const lastPreviewScanJobId = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const activationModalOpen = ref(false)
  const activationErrorMessage = ref('')
  const previewPageNo = ref(0)
  const scanMode = ref<ScannerKioskScanMode>('DIRECT')
  const supplementTargetPageNo = ref<number | undefined>()
  const supplementReason = ref('')
  const activeBatchExternalNo = ref('')
  /** batch/start 落库的当前工作台批次 ID，供绑定查询与侧栏展示锚定。 */
  const activeScanBatchId = ref('')
  /**
   * 补扫子模式：true=替换目标页（旧扫描页 SUPERSEDED），false=纯追加补扫。
   * 仅在 scanMode==='SUPPLEMENT' 时有效；切到其他模式由 changeScanMode 自动重置。
   */
  const supplementReplaceTargetPage = ref(false)
  const scanConfig = ref<ExamScannerScanConfigVO>({
    dpi: 300,
    colorMode: 'COLOR',
    duplexMode: 'SIMPLEX',
    blankPageDetectionEnabled: true,
  })
  /** 已套用考试推荐扫描参数的 examId；仅切换考试时重置 defaultScanConfig。 */
  const scanConfigSourceExamId = ref('')
  const busyState = ref<{
    active: boolean
    activeJobId: string
    activeJob: ScanJobResponse | null
  }>({
    active: false,
    activeJobId: '',
    activeJob: null,
  })
  const activationForm = ref({
    gatewayBaseUrl: defaultGatewayBaseUrl,
    activationCode: '',
    endpointName: '',
  })
  const examBindingRequired = ref(false)
  const workbenchTab = ref<'scan' | 'records'>('scan')

  // examId 初始值来自 URL query；后续由 ExamPicker 接管。
  const examId = ref<string>(queryValue(route.query.examId))
  const queryScannerDeviceId = computed(() => queryValue(route.query.scannerDeviceId))
  const queryScannerStationId = computed(() => queryValue(route.query.scannerStationId))

  // 考试选择下拉的本地状态：分页 / 关键字 / 学年 / 学期 / 班级 过滤。
  const examOptions = ref<ExamScannerKioskExamOptionVO[]>([])
  const examOptionTotal = ref(0)
  const examOptionLoading = ref(false)
  const examOptionFilter = reactive<{
    keyword: string
    academicYear: string
    semester?: '1' | '2'
    classId?: string
    pageNum: number
    pageSize: number
  }>({
    keyword: '',
    academicYear: '',
    semester: undefined,
    classId: undefined,
    pageNum: 1,
    pageSize: 50,
  })

  // 历史批次浏览（HistoryStage）
  // 缺少任一身份字段时直接返回空列表，避免误调后端。
  const batchHistoryList = ref<ExamScannerKioskBatchHistoryItem[]>([])
  const batchHistoryTotal = ref(0)
  const batchHistoryLoading = ref(false)
  const batchHistoryFilter = reactive<{
    pageNum: number
    pageSize: number
    includeDiscarded: boolean
    /** ISO 字符串 'YYYY-MM-DDTHH:mm'（datetime-local 输入直接绑定） */
    scanStartTimeFrom: string
    scanStartTimeTo: string
  }>({
    pageNum: 1,
    pageSize: 10,
    includeDiscarded: true,
    scanStartTimeFrom: '',
    scanStartTimeTo: '',
  })

  // 历史批次 ledger 快照（HistoryStage 行点击「查看 ledger」触发，独立于 SSE 流活跃 ledger）
  const historyLedgerBatch = ref<ExamScannerKioskBatchHistoryItem | null>(null)
  const historyLedgerSnapshot = ref<ExamScannerPageLedgerVO | null>(null)
  const historyLedgerLoading = ref(false)
  const historyLedgerError = ref<string>('')

  // -------------------------------------------------------------
  // 内部状态（不对外暴露）
  // -------------------------------------------------------------

  let healthTimer: number | undefined
  let contextTimer: number | undefined
  let jobTimer: number | undefined
  let busyPollTimer: number | undefined
  let scannersTimer: number | undefined
  let sseRefreshDebounce: number | undefined
  let busyPollFailureCount = 0
  let jobPollFailureCount = 0
  let restoringExamId = false
  let restoringScannerId = false
  let lastStableScannerId = ''
  let examSelectSearchDebounce: number | undefined

  // -------------------------------------------------------------
  // SSE 实时流（封装）
  // -------------------------------------------------------------

  const {
    events: liveEvents,
    isStreaming: sseStreaming,
    start: startSse,
    stop: stopSse,
    refresh: refreshSse,
    ledger: pageLedger,
    ledgerError: pageLedgerError,
    ledgerLoading: pageLedgerLoading,
    refreshLedger: refreshPageLedger,
  } = useScanLiveStream({
    filter: () => ({
      examId: examId.value || undefined,
      scannerDeviceId: getActiveScannerDeviceId() || undefined,
      scannerStationId: getActiveScannerStationId() || undefined,
    }),
    onKioskAuthRefreshRequired: recoverKioskBrowserSessionFromAgent,
    initialLimit: 20,
    maxEvents: 50,
    ledgerFilter: () => {
      const device = getActiveScannerDeviceId()
      const station = getActiveScannerStationId()
      const batchExternalNo
        = activeBatchExternalNo.value
          || currentJob.value?.batchExternalNo
          || ''
      if (!examId.value || !device || !station || !batchExternalNo) {
        return null
      }
      return {
        examId: examId.value,
        scannerDeviceId: device,
        scannerStationId: station,
        batchExternalNo,
      }
    },
  })

  /** Agent 已绑定时，将浏览器 push_token 与 DeviceBinding 对齐。 */
  async function recoverKioskBrowserSession(): Promise<boolean> {
    if (!health.value?.bound) {
      return false
    }
    if (hasMarkScannerKioskAuth()) {
      return true
    }
    return recoverKioskBrowserSessionFromAgent()
  }

  // -------------------------------------------------------------
  // computed：从后端上下文、本地任务和页面输入派生工作台可执行状态。
  // -------------------------------------------------------------

  const selectedExamOption = computed<ExamScannerKioskExamOptionVO | null>(
    () => examOptions.value.find((item) => item.examId === examId.value) ?? null,
  )
  const availableScanners = computed(() => scanners.value.filter((item) => item.available))
  const selectedScanner = computed(() =>
    scanners.value.find((item) => item.localScannerId === selectedScannerId.value),
  )
  const visiblePages = computed(
    () => currentJob.value?.pages.filter((item) => item.status !== 'DELETED') ?? [],
  )
  const exceptionPages = computed(() =>
    visiblePages.value.filter((item) => {
      return item.status === 'FAILED' || Boolean(item.diagnostic)
    }),
  )
  const previewImageUrl = computed(() => {
    if (previewPageNo.value === 0) return ''
    const scanJobId
      = currentJob.value?.scanJobId?.trim() || lastPreviewScanJobId.value.trim()
    if (!scanJobId) return ''
    return getPageImageUrl(scanJobId, previewPageNo.value)
  })
  const scanProgress = computed(() => {
    if (!currentJob.value) return 0
    if (currentJob.value.reported) return 100
    if (currentJob.value.scannedPages === 0) return 0
    const uploadedRatio
      = currentJob.value.uploadedPages / Math.max(currentJob.value.scannedPages, 1)
    return Math.min(Math.round(12 + uploadedRatio * 84), 96)
  })
  const activeBackendScanSession = computed(() => {
    return Boolean(
      kioskContext.value?.mustResumeScanning
      || kioskContext.value?.hasActiveScanSession
      || kioskContext.value?.activeBatch,
    )
  })
  const activeBackendBatchExternalNo = computed(() => {
    return kioskContext.value?.activeBatch?.batchExternalNo?.trim() || ''
  })
  const activeBackendScanSessionReason = computed(() => {
    return kioskContext.value?.activeScanSessionReason
      || kioskContext.value?.blockReason
      || '当前设备在该考试下存在未结束扫描进程，请返回扫描进程继续处理或手动确认结束扫描'
  })
  const currentJobBlocksWorkspace = computed(() => {
    const status = currentJob.value?.status
    return Boolean(activeBackendScanSession.value || (status && status !== 'REPORTED'))
  })
  const canCancelJob = computed(() => {
    const status = currentJob.value?.status
    return status === 'CREATED' || status === 'SCANNING' || status === 'PAUSED'
  })
  const canEndBatch = computed(() => {
    const status = currentJob.value?.status
    return status === 'SCANNING' || status === 'PAUSED'
  })
  const currentJobAllPagesUploadedButUnconfirmed = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const uploadablePages = visiblePages.value.filter((page) => page.status !== 'DELETED')
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId),
    )
  })
  const canRemoveCurrentJob = computed(() => {
    const job = currentJob.value
    if (!job) return false
    if (job.reported) return true
    if (currentJobAllPagesUploadedButUnconfirmed.value) return false
    return !['READYTOUPLOAD', 'UPLOADING', 'RETRYING'].includes(job.status)
  })
  const removeCurrentJobTitle = computed(() => {
    if (currentJob.value?.reported) {
      return '将扫描批次标记为已废弃，并清理本地扫描任务'
    }
    if (currentJobAllPagesUploadedButUnconfirmed.value) {
      return '页面已上传完成但批次未确认，请先重试提交'
    }
    return '仅清理本机未上报的扫描任务；上传中的任务需等待完成或失败后处理'
  })
  const canRetryUpload = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const status = job.status
    if (
      status === 'SCANNING'
      || status === 'PAUSED'
      || status === 'UPLOADING'
      || status === 'CANCELLED'
      || status === 'REPORTED'
    ) {
      return false
    }
    if (exceptionPages.value.length > 0) return true
    return ['FAILED', 'RETRYING', 'READYTOUPLOAD'].includes(status)
  })
  const canRetryCommit = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const status = job.status
    if (
      status === 'SCANNING'
      || status === 'PAUSED'
      || status === 'UPLOADING'
      || status === 'CANCELLED'
      || status === 'REPORTED'
    ) {
      return false
    }
    const uploadablePages = visiblePages.value.filter((page) => page.status !== 'DELETED')
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId),
    )
  })
  const scanBlockedReason = computed(() => {
    if (examBindingRequired.value) return '请先绑定本场扫描考试'
    if (!examId.value) return '当前工位未绑定考试'
    if (needsKioskBrowserSessionSync(health.value?.bound)) {
      return KIOSK_BROWSER_SESSION_SYNC_MESSAGE
    }
    if (!health.value?.bound) return '一体机未激活'
    if (health.value?.tokenResetRequired || health.value?.rebindRequired) return '一体机需要重新激活'
    if (health.value?.upgradeRequired) return '本机扫描组件需要升级'
    if (health.value?.updateStatus === 'DOWNLOADING') return '本机扫描组件更新包下载中'
    if (health.value?.updateStatus === 'INSTALLING') return '本机扫描组件安装中'
    if (health.value?.updateStatus === 'FAILED') {
      return health.value.updateDiagnosticMessage.trim() || '本机扫描组件更新失败'
    }
    if (!health.value?.scannerConnected) return '本地扫描仪未连接'
    if (health.value.lastHeartbeatAt && !health.value.scanAllowed) return '系统暂未允许开始扫描'
    if (!selectedScannerId.value) return '未检测到可用本地扫描仪'
    if (!kioskContext.value) return '考试扫描上下文未加载'
    if (activeBackendScanSession.value) return activeBackendScanSessionReason.value
    if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束'
    if (!kioskContext.value.canStartScan) return kioskContext.value.blockReason
    if (scanMode.value === 'SUPPLEMENT') {
      if (!kioskContext.value.canStartSupplementScan) {
        return kioskContext.value.supplementBlockReason
      }
      if (!supplementTargetPageNo.value || supplementTargetPageNo.value <= 0) {
        return '补扫目标页号不能为空'
      }
      if (!supplementReason.value.trim()) return '补扫原因不能为空'
    }
    if (!kioskContext.value.device) return '考试未绑定可用扫描设备'
    if (!kioskContext.value.capabilities?.loaded) return '扫描仪能力未上报，请确认 Agent 心跳正常'
    if (!scanConfig.value.dpi) return '请选择扫描分辨率'
    return ''
  })
  const canStartScan = computed(() => !scanBlockedReason.value && !loading.value)
  const canSwitchScanMode = computed(() => !currentJobBlocksWorkspace.value)
  const canSwitchExam = computed(() => {
    if (currentJobBlocksWorkspace.value) return false
    return !(kioskContext.value?.kioskLockEnabled && kioskContext.value?.kioskBoundExamId);
  })
  const canSwitchScanner = computed(() => !currentJobBlocksWorkspace.value)
  const canActivateAgent = computed(() => !currentJobBlocksWorkspace.value)
  const canDiscardLedgerPage = computed(() => !currentJobBlocksWorkspace.value)
  const kioskBrowserSessionSyncNeeded = computed(() =>
    needsKioskBrowserSessionSync(health.value?.bound),
  )
  const activationModalForced = computed(
    () =>
      !health.value?.bound
      || Boolean(health.value?.tokenResetRequired)
      || Boolean(health.value?.rebindRequired),
  )
  const needsActivationGate = computed(() => activationModalForced.value)
  const needsExamBindingGate = computed(
    () => !needsActivationGate.value && examBindingRequired.value && Boolean(health.value?.bound),
  )

  const activationGateReason = computed(() => {
    if (!health.value?.bound) return 'UNBOUND'
    if (health.value.rebindRequired) return 'REBIND_REQUIRED'
    if (health.value.tokenResetRequired) return 'TOKEN_RESET_REQUIRED'
    return 'NONE'
  })

  type DeviceReadinessTone = 'success' | 'danger' | 'warning'

  const deviceReadiness = computed((): {
    tone: DeviceReadinessTone
    statusText: string
    headline: string
    detail: string
    troubleshooting?: string
  } => {
    if (needsActivationGate.value) {
      const reason = activationGateReason.value
      if (reason === 'REBIND_REQUIRED') {
        return {
          tone: 'danger',
          statusText: '设备身份已变更',
          headline: '需要重新激活一体机',
          detail: '本机设备身份与平台记录不一致，请重新输入激活码完成绑定。',
        }
      }
      if (reason === 'TOKEN_RESET_REQUIRED') {
        return {
          tone: 'danger',
          statusText: '服务端 token 已重置',
          headline: '需要重新激活一体机',
          detail: '扫描设备 push_token 已变更，请重新输入激活码完成绑定。',
        }
      }
      return {
        tone: 'danger',
        statusText: '一体机未激活',
        headline: '请先激活扫描一体机',
        detail: '输入教务平台下发的激活码后，才能连接扫描仪并开始扫描。',
      }
    }
    if (kioskBrowserSessionSyncNeeded.value) {
      return {
        tone: 'warning',
        statusText: '会话同步中',
        headline: '正在同步本机 Agent 会话',
        detail: KIOSK_BROWSER_SESSION_SYNC_MESSAGE,
      }
    }
    if (needsExamBindingGate.value) {
      return {
        tone: 'warning',
        statusText: '未绑定考试',
        headline: '请先绑定扫描考试',
        detail: '本场考试由教务预配置或首次绑定向导锁定，绑定后工作台只展示任务合同。',
      }
    }
    if (!health.value?.scannerConnected) {
      return {
        tone: 'danger',
        statusText: '扫描仪连接异常',
        headline: '扫描仪未连接',
        detail: '请检查 USB 连接与驱动，并在设备设置中刷新扫描仪列表。',
        troubleshooting: '确认扫描仪电源已打开、USB 线牢固，并退出其他占用扫描仪的软件后重试。',
      }
    }
    if (health.value?.upgradeRequired || health.value?.updateStatus === 'FAILED') {
      return {
        tone: 'warning',
        statusText: '扫描组件需处理',
        headline: '本机扫描组件需要升级或修复',
        detail: health.value.updateDiagnosticMessage?.trim() || scanBlockedReason.value || '请打开设备设置处理更新。',
      }
    }
    if (scanBlockedReason.value) {
      return {
        tone: 'warning',
        statusText: '暂不可开始扫描',
        headline: '扫描前置条件未满足',
        detail: scanBlockedReason.value,
      }
    }
    return {
      tone: 'success',
      statusText: '扫描仪连接正常',
      headline: '可以开始扫描',
      detail: '设备就绪，可以开始本批次扫描。',
    }
  })

  /** Agent 已绑定时即可访问 edu-mark；浏览器 push_token 由 recoverKioskBrowserSession 自动同步。 */
  function isActivatedForMarkApis(): boolean {
    return Boolean(health.value?.bound)
      && !health.value?.tokenResetRequired
      && !health.value?.rebindRequired
  }

  /** Agent 未绑定时清理浏览器残留 push_token，避免误用旧会话调用后端。 */
  function clearStaleKioskSessionWhenUnbound(): void {
    if (health.value?.bound) {
      return
    }
    if (hasMarkScannerKioskAuth() || getKioskBindingProfile()) {
      clearKioskAuthSession()
    }
  }

  /** Agent 已绑定时，将浏览器 push_token 与本地 DeviceBinding 对齐后再访问 edu-mark。 */
  async function ensureKioskBrowserAuthSynced(): Promise<boolean> {
    return recoverKioskBrowserSession()
  }

  const workState = computed(() => {
    const job = currentJob.value
    const status = job?.status
    if (status === 'REPORTED') return { text: '已自动上传并提交批次', tone: 'success' as const }
    if (status === 'FAILED') return { text: '存在失败项', tone: 'danger' as const }
    if (status === 'CANCELLED') return { text: '已取消，待删除清理', tone: 'muted' as const }
    if (job && status === 'PAUSED') {
      return { text: scanModeText(job.scanMode, '已暂停'), tone: 'running' as const }
    }
    if (job) return { text: scanModeText(job.scanMode, '上传中'), tone: 'running' as const }
    if (scanBlockedReason.value) return { text: '入口阻断', tone: 'danger' as const }
    return { text: `可开始${scanModeText(scanMode.value, '')}`, tone: 'success' as const }
  })

  const uploadStage = computed(() => {
    if (!currentJob.value) return '等待扫描'
    if (currentJob.value.reported) return '批次已提交'
    if (currentJob.value.status === 'CANCELLED') return '扫描已取消，请删除任务完成清理'
    if (currentJob.value.status === 'FAILED') return '扫描上传失败，等待重试'
    if (currentJob.value.status === 'PAUSED') return '扫描已暂停'
    if (currentJob.value.scannedPages === 0) return '等待扫描仪送纸'
    if (currentJob.value.uploadedPages < currentJob.value.scannedPages) return '页面自动上传中'
    return '批次自动提交中'
  })

  const latestBatchText = computed(() => {
    const batch = kioskContext.value?.latestBatch
    if (!batch) return '暂无批次'
    return `${batch.batchNo || batch.batchExternalNo || batch.scanBatchId} · ${batch.statusMessage}`
  })

  const latestBatchModeText = computed(() => {
    const batch = kioskContext.value?.latestBatch
    if (!batch) return '-'
    const mode = scanModeText(batch.scanMode, '')
    if (batch.scanMode !== 'SUPPLEMENT') return mode
    const replaceText = batch.replaceTargetPage ? '替换目标页' : '追加补扫'
    const targetText = batch.targetPageNo ? `第 ${batch.targetPageNo} 页` : '未指定目标页'
    return `${mode} · ${replaceText} · ${targetText}`
  })

  const examTermText = computed(() => {
    const exam = kioskContext.value?.exam
    if (!exam) return ''
    const year = (exam.academicYear || '').trim()
    const semester = (exam.semester || '').trim()
    if (!year && !semester) return ''
    const semesterLabel = semester ? getSemesterDescription(semester) : ''
    return [year, semesterLabel].filter(Boolean).join(' · ')
  })

  const declaredClassChips = computed(() => {
    const ctx = kioskContext.value
    if (!ctx) return [] as { key: string, label: string, missing: boolean }[]
    return ctx.classIds.flatMap((classId, idx) => {
      const name = ctx.declaredClassNames[idx]
      if (!name) return []
      return {
        key: classId,
        label: name,
        missing: false,
      }
    })
  })

  const kioskMetrics = computed(() => {
    const ctx = kioskContext.value
    if (!ctx) {
      return {
        scannedPages: '-',
        paperInstances: '-',
        boundPaperInstances: '-',
        attentionCount: '-',
        scanBatchCount: '-',
      }
    }
    return {
      scannedPages: String(ctx.scannedPages),
      paperInstances: String(ctx.paperInstances),
      boundPaperInstances: String(ctx.boundPaperInstances),
      attentionCount: String(ctx.attentionCount),
      scanBatchCount: String(ctx.scanBatchCount),
    }
  })

  const latestBatchPeriodText = computed(() => {
    const batch = kioskContext.value?.latestBatch
    if (!batch) return '-'
    const start = formatTime(batch.scanStartTime)
    if (!batch.scanEndTime) {
      return start === '-' ? '进行中' : `${start} → 进行中`
    }
    const end = formatTime(batch.scanEndTime)
    if (start === '-' && end === '-') return '-'
    return `${start} → ${end}`
  })

  const pendingUploadJobsText = computed(() => {
    if (!health.value) return '未连接'
    return `${health.value.pendingUploadJobs} 个任务`
  })

  // -------------------------------------------------------------
  // helpers：工作台文案、合同校验和轻量格式化函数。
  // -------------------------------------------------------------

  function scanModeText(mode: ScannerKioskScanMode, suffix: string) {
    if (mode === 'SUPPLEMENT') return `补扫${suffix}`
    if (mode === 'ARCHIVE') return `历史存档${suffix}`
    return `首次扫描${suffix}`
  }

  function agentHealthStatusLabel(status: AgentHealthStatus) {
    return strictEnumLabel(AGENT_HEALTH_STATUS_LABEL, status, '本地扫描服务状态')
  }

  function agentUpdateStatusLabel(status: AgentUpdateStatus) {
    return strictEnumLabel(AGENT_UPDATE_STATUS_LABEL, status, '本地扫描组件更新状态')
  }

  function endpointOnlineStatusLabel(
    status: NonNullable<ExamScannerKioskContextVO['device']>['onlineStatus'],
  ) {
    return strictEnumLabel(SCANNER_ENDPOINT_ONLINE_STATUS_LABEL, status, '扫描端点在线状态')
  }

  function scannerColorModeLabel(status: ScanColorMode) {
    return strictEnumLabel(SCANNER_COLOR_MODE_LABEL, status, '扫描色彩模式')
  }

  function scannerDuplexModeLabel(status: ScanDuplexMode) {
    return strictEnumLabel(SCANNER_DUPLEX_MODE_LABEL, status, '单面/双面扫描方式')
  }

  function localScanJobStatusText(status: LocalScanJobStatus) {
    return strictEnumLabel(LOCAL_SCAN_JOB_STATUS_LABEL, status, '本地扫描任务状态')
  }

  function ledgerSourceText(source: ExamScannerLedgerDataSource) {
    if (source === 'DATABASE') return '已落库'
    if (source === 'REDIS_PENDING') return '等待提交'
    if (source === 'NONE') return '空批次'
    throw toUserError(null, '扫描账本来源无法识别，请刷新后重试')
  }

  function registrationStatusText(status: ExamScannerPageRegistrationStatus) {
    if (status === 'REGISTERED') return '已识别'
    if (status === 'PENDING') return '等待识别'
    if (status === 'DISCARDED') return '已废弃'
    if (status === 'SUPERSEDED') return '已替换'
    throw toUserError(null, '扫描页登记状态无法识别，请刷新后重试')
  }

  function attentionTypeText(type: ScanAttentionTypeCode) {
    if (type === 'QUALITY_BLOCK') return '质量阻断'
    if (type === 'PROCESSING_BLOCK') return '处理阻断'
    if (type === 'DUPLICATE_PENDING') return '重复待裁决'
    if (type === 'RECOGNITION_REVIEW') return '识别复核'
    if (type === 'BINDING_CONFLICT') return '身份绑定冲突'
    throw toUserError(null, '扫描异常类型无法识别，请刷新后重试')
  }

  /** 将一体机诊断转为现场操作员可处理的扫描业务提示，避免展示底层接口或字段细节。 */
  function scannerDiagnosticText(diagnostic?: string) {
    return getUserErrorMessage(
      { message: diagnostic },
      '扫描处理异常，请按异常类型重新扫描、补扫或联系阅卷管理员处理',
    )
  }

  function ledgerItemKey(item: { pageNo: number, sha256?: string, localPageId?: string }) {
    const batchNo = pageLedger.value?.batchExternalNo ?? ''
    const sha = item.sha256 ?? ''
    const pageNo = item.pageNo
    if (!Number.isFinite(pageNo)) {
      throw toUserError(null, '页级账本缺少页号，请刷新后重试')
    }
    const local = item.localPageId ?? ''
    return `${batchNo}#${pageNo}#${sha || local || 'nokey'}`
  }

  function formatTime(value?: string | null): string {
    return formatDateTimeWithSeconds(value)
  }

  function handleError(error: unknown, fallback = '扫描一体机操作失败') {
    successMessage.value = ''
    if (error instanceof LocalAgentUnavailableError) {
      markLocalAgentDisconnected()
      errorMessage.value = error.message
      return
    }
    errorMessage.value = getUserErrorMessage(error, fallback)
  }

  /** 本机 Agent 进程未监听时清理现场连接态，保留页面“未连接”诊断，不触发全局网络错误。 */
  function markLocalAgentDisconnected(): void {
    health.value = null
    scanners.value = []
    selectedScannerId.value = ''
    lastStableScannerId = ''
  }

  async function handleScanJobStartFailure(error: unknown, fallback = '启动本地扫描失败') {
    if (activeBatchExternalNo.value) {
      try {
        await closeActiveBatch(true)
      } catch (closeError) {
        const startMessage = getUserErrorMessage(error, fallback)
        const closeMessage = getUserErrorMessage(closeError, '扫描批次关闭失败')
        handleError(null, `${startMessage}；扫描批次关闭失败：${closeMessage}`)
        return
      }
    }
    if (error instanceof ScannerBusyError) {
      enterBusyState(error.activeJobId)
      return
    }
    handleError(error, fallback)
  }

  function getActiveBatchExternalNo() {
    return (
      activeBatchExternalNo.value
      || currentJob.value?.batchExternalNo
      || kioskContext.value?.latestBatch?.batchExternalNo
      || ''
    )
  }

  /** 本批次已绑定学生查询锚点：准备阶段无活跃批次时返回空，避免挂上历史批次数据。 */
  const boundPaperScanBatchId = computed(() => {
    const job = currentJob.value
    const jobBatchId = job?.scanBatchId?.trim()
    if (jobBatchId) return jobBatchId

    const anchoredBatchId = activeScanBatchId.value.trim()
    if (anchoredBatchId) return anchoredBatchId

    const latest = kioskContext.value?.latestBatch
    if (!latest?.scanBatchId) return ''

    const explicitBatchNo = activeBatchExternalNo.value || job?.batchExternalNo || ''
    if (explicitBatchNo) {
      const latestKey = latest.batchExternalNo || latest.batchNo || ''
      if (latestKey === explicitBatchNo) return latest.scanBatchId
      if (job && job.status !== 'CANCELLED') return latest.scanBatchId
      return ''
    }

    if (job && job.status !== 'CANCELLED') {
      return latest.scanBatchId
    }

    if (job && (job.status === 'REPORTED' || job.status === 'FAILED')) {
      return latest.scanBatchId
    }

    return ''
  })

  const boundPaperSummary = computed(() => {
    const batch = kioskContext.value?.latestBatch
    const batchId = boundPaperScanBatchId.value
    if (batch && batchId && batch.scanBatchId === batchId) {
      return {
        studentCount: batch.boundStudentCount ?? boundPapers.value.length,
        totalPages: batch.boundRegisteredPageCount ?? boundPapers.value.reduce(
          (sum, item) => sum + item.registeredPageCount,
          0,
        ),
      }
    }
    const items = boundPapers.value
    let totalPages = 0
    for (const item of items) {
      totalPages += item.registeredPageCount
    }
    return {
      studentCount: items.length,
      totalPages,
    }
  })

  function getActiveScannerDeviceId() {
    return (
      queryScannerDeviceId.value
      || getKioskBindingProfile()?.scannerDeviceId
      || kioskContext.value?.device?.scannerDeviceId
      || ''
    )
  }

  function getActiveScannerStationId() {
    return (
      queryScannerStationId.value
      || getKioskBindingProfile()?.scannerStationId
      || kioskContext.value?.device?.scannerStationId
      || ''
    )
  }

  function resolveGatewayBaseUrl(setup?: {
    gatewayBaseUrl?: string
    defaultGatewayBaseUrl?: string
  }): string {
    const fromBinding = setup?.gatewayBaseUrl?.trim()
    if (fromBinding) return fromBinding.replace(/\/+$/, '')
    const fromSetup = setup?.defaultGatewayBaseUrl?.trim()
    if (fromSetup) return fromSetup.replace(/\/+$/, '')
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      if (
        origin
        && origin !== 'null'
        && /^https?:\/\//.test(origin)
      ) {
        return origin.replace(/\/+$/, '')
      }
    }
    return defaultGatewayBaseUrl.replace(/\/+$/, '')
  }

  async function syncActivationFormFromAgent() {
    try {
      const setup = await getAgentSetupContext()
      activationForm.value.gatewayBaseUrl = resolveGatewayBaseUrl(setup)
      const preferred = setup.preferredLocalScannerId?.trim()
      if (preferred) {
        agentPreferredLocalScannerId.value = preferred
      }
      const savedProfile = getKioskBindingProfile()
      if (setup.deviceName && !activationForm.value.endpointName) {
        activationForm.value.endpointName = setup.deviceName
      } else if (savedProfile?.endpointName && !activationForm.value.endpointName) {
        activationForm.value.endpointName = savedProfile.endpointName
      }
    } catch {
      activationForm.value.gatewayBaseUrl = resolveGatewayBaseUrl()
      const savedProfile = getKioskBindingProfile()
      if (savedProfile?.endpointName && !activationForm.value.endpointName) {
        activationForm.value.endpointName = savedProfile.endpointName
      }
    }
  }

  function openActivationModal() {
    activationErrorMessage.value = ''
    void syncActivationFormFromAgent().finally(() => {
      activationModalOpen.value = true
    })
  }

  async function ensureLiveStreamConnected() {
    if (!health.value?.bound) return
    if (!hasMarkScannerKioskAuth()) {
      const recovered = await recoverKioskBrowserSession()
      if (!recovered) return
    }
    if (sseStreaming.value) return
    await startSse()
  }

  function handleAgentBindingLost() {
    stopSse()
    clearKioskAuthSession()
    openActivationModal()
  }

  function isPollingTerminalJob(job: ScanJobResponse) {
    return ['REPORTED', 'CANCELLED', 'FAILED'].includes(job.status)
  }

  function isRecoverableLocalJob(job: ScanJobResponse) {
    return [
      'CREATED',
      'SCANNING',
      'PAUSED',
      'READYTOUPLOAD',
      'UPLOADING',
      'RETRYING',
      'FAILED',
      'CANCELLED',
    ].includes(job.status)
  }

  /** 从本地终态 REPORTED 任务恢复预览 scanJobId，供 Review 阶段 currentJob 为空时看图。 */
  function hydratePreviewScanJobId(jobs: ScanJobResponse[]) {
    const activeJobId = currentJob.value?.scanJobId?.trim()
    if (activeJobId) {
      lastPreviewScanJobId.value = activeJobId
      return
    }
    const batchNo = pageLedger.value?.batchExternalNo?.trim() || activeBatchExternalNo.value.trim()
    if (!batchNo) return
    const deviceId = getActiveScannerDeviceId()
    const stationId = getActiveScannerStationId()
    const terminalJob = jobs.find((job) => {
      return (
        job.batchExternalNo === batchNo
        && job.status === 'REPORTED'
        && job.reported
        && job.examId === examId.value
        && job.scannerDeviceId === deviceId
        && job.scannerStationId === stationId
      )
    })
    if (terminalJob?.scanJobId) {
      lastPreviewScanJobId.value = terminalJob.scanJobId
    }
  }

  function shouldPollRecoveredJob(job: ScanJobResponse) {
    return ['CREATED', 'SCANNING', 'READYTOUPLOAD', 'UPLOADING', 'RETRYING'].includes(job.status)
  }

  function sameOrderedStringList(left: string[], right: string[]) {
    if (left.length !== right.length) return false
    return left.every((value, index) => value === right[index])
  }

  function resetBusyState() {
    if (busyPollTimer) {
      window.clearInterval(busyPollTimer)
      busyPollTimer = undefined
    }
    busyPollFailureCount = 0
    busyState.value = { active: false, activeJobId: '', activeJob: null }
  }

  function validateActivationForm(): ({
    ok: true
    gatewayBaseUrl: string
    activationCode: string
    endpointName: string
  } | {
    ok: false
    errorMessage: string
  }) {
    const gatewayBaseUrl = resolveGatewayBaseUrl({
      gatewayBaseUrl: activationForm.value.gatewayBaseUrl,
      defaultGatewayBaseUrl: activationForm.value.gatewayBaseUrl,
    })
    const activationCode = activationForm.value.activationCode.trim()
    const endpointName = activationForm.value.endpointName.trim()
    if (!gatewayBaseUrl) {
      return { ok: false, errorMessage: '无法自动识别平台服务地址，请联系管理员检查一体机配置' }
    }
    let url: URL
    try {
      url = new URL(gatewayBaseUrl)
    } catch {
      return { ok: false, errorMessage: '平台服务地址格式不正确' }
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, errorMessage: '平台服务地址必须使用 HTTP 或 HTTPS 协议' }
    }
    if (!activationCode) {
      return { ok: false, errorMessage: '激活码不能为空' }
    }
    if (!/^\d{8}$/.test(activationCode)) {
      return { ok: false, errorMessage: '激活码必须为8位数字' }
    }
    if (!endpointName) {
      return { ok: false, errorMessage: '端点名称不能为空' }
    }
    activationForm.value.gatewayBaseUrl = gatewayBaseUrl
    return { ok: true, gatewayBaseUrl, activationCode, endpointName }
  }

  // -------------------------------------------------------------
  // 数据刷新（Health / Scanners / KioskContext / ExamOptions）
  // -------------------------------------------------------------

  async function refreshAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      await Promise.all([refreshHealth(), refreshScanners()])
      if (isActivatedForMarkApis()) {
        const sessionReady = await ensureKioskBrowserAuthSynced()
        if (sessionReady) {
          await refreshKioskContext()
          await recoverLocalScanJob()
        }
      }
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function refreshHealth() {
    try {
      const previousBound = health.value?.bound
      health.value = await getAgentHealth()
      clearStaleKioskSessionWhenUnbound()
      if (previousBound && !health.value.bound) {
        handleAgentBindingLost()
        return
      }
      if (health.value.tokenResetRequired || health.value.rebindRequired) {
        handleAgentBindingLost()
        return
      }
      const sessionReady = await ensureKioskBrowserAuthSynced()
      if (health.value.bound && !sessionReady) {
        errorMessage.value = KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE
      } else {
        errorMessage.value = ''
      }
      if (health.value.bound && sessionReady) {
        await ensureLiveStreamConnected()
      }
    } catch (error) {
      if (error instanceof LocalAgentUnavailableError) {
        markLocalAgentDisconnected()
        return
      }
      throw error
    }
  }

  async function refreshScanners() {
    let response: ScannerListResponse
    try {
      response = await listLocalScanners()
    } catch (error) {
      if (error instanceof LocalAgentUnavailableError) {
        markLocalAgentDisconnected()
        return
      }
      throw error
    }
    if (!agentPreferredLocalScannerId.value) {
      try {
        const setup = await getAgentSetupContext()
        const preferred = setup.preferredLocalScannerId?.trim()
        if (preferred) {
          agentPreferredLocalScannerId.value = preferred
        }
      } catch {
        // 首选扫描仪读取失败不阻断设备列表
      }
    }
    scanners.value = response.devices
    const available = availableScanners.value
    if (available.length === 0) return
    const current = selectedScannerId.value?.trim()
    if (current && available.some((scanner) => scanner.localScannerId === current)) {
      return
    }
    const preferred = agentPreferredLocalScannerId.value?.trim()
    if (
      preferred
      && canSwitchScanner.value
      && available.some((scanner) => scanner.localScannerId === preferred)
    ) {
      selectedScannerId.value = preferred
      return
    }
    if (!current && canSwitchScanner.value) {
      selectedScannerId.value = available[0].localScannerId
    }
  }

  function clampScanConfigToOptions(
    config: ExamScannerScanConfigVO,
    options: ExamScannerScanConfigOptionsVO,
  ): ExamScannerScanConfigVO {
    const allowedDpis = options.allowedDpis
    const colorModes = options.colorModes
    const duplexModes = options.duplexModes
    const defaultConfig = options.defaultScanConfig
    if (allowedDpis.length === 0) {
      throw new Error('扫描仪未上报可用分辨率')
    }
    if (colorModes.length === 0) {
      throw new Error('扫描参数缺少色彩模式选项')
    }
    if (duplexModes.length === 0) {
      throw new Error('扫描参数缺少单面/双面扫描选项')
    }
    if (!defaultConfig?.dpi || !defaultConfig.colorMode || !defaultConfig.duplexMode) {
      throw new Error('扫描参数缺少服务端默认建议值')
    }
    let dpi = config.dpi
    if (!allowedDpis.includes(dpi)) {
      dpi = defaultConfig.dpi
    }
    let colorMode = config.colorMode
    if (!colorModes.includes(colorMode)) {
      colorMode = defaultConfig.colorMode
    }
    let duplexMode = config.duplexMode
    if (!duplexModes.includes(duplexMode)) {
      duplexMode = defaultConfig.duplexMode
    }
    return {
      dpi,
      colorMode,
      duplexMode,
      blankPageDetectionEnabled: config.blankPageDetectionEnabled,
    }
  }

  /** 切换考试或首次加载时套用服务端按制卷形态/模板推导的推荐扫描参数。 */
  function applyExamRecommendedScanConfig(force = false) {
    const options = kioskContext.value?.scanConfigOptions
    if (!options?.defaultScanConfig || !examId.value) return
    const examChanged = scanConfigSourceExamId.value !== examId.value
    if (!examChanged && !force) return
    try {
      scanConfig.value = clampScanConfigToOptions(options.defaultScanConfig, options)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '扫描参数契约不完整'
      return
    }
    scanConfigSourceExamId.value = examId.value
  }

  async function refreshKioskContext() {
    if (!isActivatedForMarkApis()) {
      kioskContext.value = null
      boundPapers.value = []
      return
    }
    if (!examId.value) {
      kioskContext.value = null
      boundPapers.value = []
      scanConfigSourceExamId.value = ''
      return
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      kioskContext.value = null
      boundPapers.value = []
      if (health.value?.bound) {
        errorMessage.value = '扫描设备身份缺失，请重新激活一体机'
      }
      return
    }
    kioskContext.value = await getScannerKioskContext({
      examId: examId.value,
      scannerDeviceId,
      scannerStationId,
      scanMode: scanMode.value,
    })
    if (kioskContext.value.activeBatch) {
      activeBatchExternalNo.value = kioskContext.value.activeBatch.batchExternalNo
      activeScanBatchId.value = kioskContext.value.activeBatch.scanBatchId
    }
    const activeBatchConfig = kioskContext.value.activeBatch?.scanConfig
    const scanConfigOptions = kioskContext.value.scanConfigOptions
    if (activeBatchConfig && scanConfigOptions) {
      try {
        scanConfig.value = clampScanConfigToOptions(activeBatchConfig, scanConfigOptions)
        scanConfigSourceExamId.value = examId.value
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '扫描参数契约不完整'
      }
    } else if (scanConfigOptions) {
      applyExamRecommendedScanConfig()
    }
    examBindingRequired.value = Boolean(kioskContext.value?.examBindingRequired)
    await refreshBoundPapers()
  }

  async function loadKioskBootstrap() {
    if (!isActivatedForMarkApis()) {
      examBindingRequired.value = false
      return
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      return
    }
    const bootstrap = await getScannerKioskBootstrap({
      scannerDeviceId,
      scannerStationId,
    })
    examBindingRequired.value = Boolean(bootstrap.examBindingRequired)
    if (bootstrap.kioskBoundExamId) {
      examId.value = bootstrap.kioskBoundExamId
    }
  }

  async function bindKioskExam(targetExamId: string) {
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      throw toUserError(null, '扫描设备身份缺失，无法绑定考试')
    }
    loading.value = true
    activationErrorMessage.value = ''
    errorMessage.value = ''
    try {
      const bootstrap = await bindScannerKioskExam({
        examId: targetExamId,
        scannerDeviceId,
        scannerStationId,
      })
      examBindingRequired.value = Boolean(bootstrap.examBindingRequired)
      if (bootstrap.kioskBoundExamId) {
        examId.value = bootstrap.kioskBoundExamId
      }
      await refreshKioskContext()
      await loadExamOptions()
      successMessage.value = '扫描考试已绑定到本工位'
    } catch (error) {
      handleError(error, '绑定扫描考试失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function refreshBoundPapers(forcedScanBatchId?: string) {
    const device = getActiveScannerDeviceId()
    const station = getActiveScannerStationId()
    const scanBatchId = forcedScanBatchId?.trim() || boundPaperScanBatchId.value
    if (!examId.value || !device || !station || !scanBatchId) {
      boundPapers.value = []
      boundPapersError.value = null
      return
    }
    boundPapersLoading.value = true
    boundPapersError.value = null
    try {
      boundPapers.value = await listScannerKioskBoundPapers({
        examId: examId.value,
        scannerDeviceId: device,
        scannerStationId: station,
        scanBatchId,
      })
    } catch (error) {
      boundPapersError.value = toUserError(error, '已绑定学生列表加载失败')
      boundPapers.value = []
    } finally {
      boundPapersLoading.value = false
    }
  }

  async function refreshScannersByUser() {
    if (!canSwitchScanner.value) {
      errorMessage.value = '当前扫描任务未结束，不能刷新本地扫描仪'
      return
    }
    await refreshScanners()
  }

  async function loadExamOptions() {
    if (!isActivatedForMarkApis()) {
      examOptions.value = []
      examOptionTotal.value = 0
      return
    }
    examOptionLoading.value = true
    try {
      const request: ExamScannerKioskExamOptionRequest = {
        pageNum: examOptionFilter.pageNum,
        pageSize: examOptionFilter.pageSize,
      }
      const keyword = examOptionFilter.keyword.trim()
      if (keyword) request.keyword = keyword
      const academicYear = examOptionFilter.academicYear.trim()
      if (academicYear) request.academicYear = academicYear
      if (examOptionFilter.semester) request.semester = examOptionFilter.semester
      if (examOptionFilter.classId) request.classId = examOptionFilter.classId
      const result = await pageScannerKioskExamOptions(request)
      examOptions.value = readPageList(result, '考试列表加载失败，请稍后重试')
      examOptionFilter.pageNum = result.pageNum
      examOptionFilter.pageSize = result.pageSize
      examOptionTotal.value = readPageTotal(result)
    } catch (error) {
      showUserError(error, '考试列表加载失败')
      examOptions.value = []
      examOptionTotal.value = 0
    } finally {
      examOptionLoading.value = false
    }
  }

  function onExamSelectSearch(value: string) {
    if (!canSwitchExam.value) {
      errorMessage.value = '当前扫描任务未结束，不能搜索考试'
      return
    }
    examOptionFilter.keyword = (value || '').trim()
    examOptionFilter.pageNum = 1
    if (examSelectSearchDebounce) window.clearTimeout(examSelectSearchDebounce)
    examSelectSearchDebounce = window.setTimeout(() => {
      loadExamOptions().catch((error) => {
        handleError(error)
      })
    }, 300)
  }

  function refreshExamOptionsByUser() {
    if (!canSwitchExam.value) {
      errorMessage.value = '当前扫描任务未结束，不能刷新考试列表'
      return
    }
    loadExamOptions().catch((error) => {
      handleError(error)
    })
  }

  // -------------------------------------------------------------
  // 历史批次浏览（HistoryStage）
  // -------------------------------------------------------------

  /**
   * 加载当前 (examId, scannerDeviceId, scannerStationId) 名下的历史批次。
   *
   * 缺少身份字段时直接返回空列表 + 0 total，不调用后端；这是避免在 setup 阶段或未激活
   * 一体机时误触发后端权限校验失败。
   */
  async function loadBatchHistory(): Promise<void> {
    if (!isActivatedForMarkApis()) {
      batchHistoryList.value = []
      batchHistoryTotal.value = 0
      return
    }
    const device = getActiveScannerDeviceId()
    const station = getActiveScannerStationId()
    if (!examId.value || !device || !station) {
      batchHistoryList.value = []
      batchHistoryTotal.value = 0
      return
    }
    batchHistoryLoading.value = true
    try {
      const request: ExamScannerKioskBatchHistoryRequest = {
        pageNum: batchHistoryFilter.pageNum,
        pageSize: batchHistoryFilter.pageSize,
        examId: examId.value,
        scannerDeviceId: device,
        scannerStationId: station,
        includeDiscarded: batchHistoryFilter.includeDiscarded,
      }
      const fromIso = normalizeDatetimeLocal(batchHistoryFilter.scanStartTimeFrom)
      if (fromIso) request.scanStartTimeFrom = fromIso
      const toIso = normalizeDatetimeLocal(batchHistoryFilter.scanStartTimeTo)
      if (toIso) request.scanStartTimeTo = toIso
      const result = await pageScannerKioskBatchHistory(request)
      batchHistoryList.value = readPageList(result, '扫描批次历史加载失败，请稍后重试')
      batchHistoryFilter.pageNum = result.pageNum
      batchHistoryFilter.pageSize = result.pageSize
      batchHistoryTotal.value = readPageTotal(result, '扫描批次历史加载失败，请稍后重试')
    } catch (error) {
      handleError(error)
      batchHistoryList.value = []
      batchHistoryTotal.value = 0
    } finally {
      batchHistoryLoading.value = false
    }
  }

  function changeBatchHistoryPage(page: number) {
    batchHistoryFilter.pageNum = Math.max(1, Math.floor(page))
    loadBatchHistory().catch((error) => {
      handleError(error)
    })
  }

  function changeBatchHistoryIncludeDiscarded(value: boolean) {
    batchHistoryFilter.includeDiscarded = Boolean(value)
    batchHistoryFilter.pageNum = 1
    loadBatchHistory().catch((error) => {
      handleError(error)
    })
  }

  /**
   * 应用时间范围过滤。
   *
   * 直接读取 batchHistoryFilter.scanStartTimeFrom / scanStartTimeTo（双向绑定 datetime-local 输入），
   * 重置 pageNum=1，调用 loadBatchHistory。
   */
  function applyBatchHistoryTimeRange() {
    batchHistoryFilter.pageNum = 1
    loadBatchHistory().catch((error) => {
      handleError(error)
    })
  }

  /**
   * 清空时间范围过滤。
   */
  function clearBatchHistoryTimeRange() {
    batchHistoryFilter.scanStartTimeFrom = ''
    batchHistoryFilter.scanStartTimeTo = ''
    batchHistoryFilter.pageNum = 1
    loadBatchHistory().catch((error) => {
      handleError(error)
    })
  }

  /**
   * 查看历史批次的页级账本快照。
   *
   * 不会污染 SSE 流的活跃 ledger（`pageLedger` 仍服务于当前批次），独立请求一次性快照
   * 写入 `historyLedgerSnapshot`，由 KioskHistoryLedgerDrawer 消费。
   *
   * 抽屉互斥：调用方需要负责关闭其它抽屉（设备设置抽屉），避免同时浮动两层 Drawer
   * 影响视觉。本函数自身不引用 ui state，由 stage 组件在调用前 close。
   */
  async function viewBatchHistoryLedger(item: ExamScannerKioskBatchHistoryItem): Promise<void> {
    historyLedgerBatch.value = item
    historyLedgerSnapshot.value = null
    historyLedgerError.value = ''
    historyLedgerLoading.value = true
    try {
      if (!item.scannerStationId) {
        historyLedgerError.value = '历史批次缺少扫描站点信息，无法查询账本'
        return
      }

      historyLedgerSnapshot.value = await fetchScannerPageLedger({
        examId: examId.value,
        scannerDeviceId: item.scannerDeviceId,
        scannerStationId: item.scannerStationId,
        batchExternalNo: item.batchExternalNo,
      })
    } catch (error) {
      historyLedgerError.value = getUserErrorMessage(error, '历史批次账本查询失败')
    } finally {
      historyLedgerLoading.value = false
    }
  }

  /** 关闭历史批次 ledger 抽屉，清理 snapshot 释放内存 */
  function closeBatchHistoryLedger() {
    historyLedgerBatch.value = null
    historyLedgerSnapshot.value = null
    historyLedgerError.value = ''
    historyLedgerLoading.value = false
  }

  /**
   * 启动扫描仪枚举轮询（默认 5 秒间隔）。
   *
   * 间隔取舍：
   *   - 2 秒：拔插响应快，但增加 Agent 本地 listLocalScanners 调用频次（USB/WIA 枚举较重）
   *   - 5 秒：平衡响应速度与系统压力，符合一体机现场操作员等待容忍度
   *   - 10 秒：节能但拔插后用户感知较慢
   *
   * 由 KioskSettingsDrawer 在打开时调用，关闭时调用 stopScannersPolling 释放。
   * 重复调用安全：先清旧 timer 再启动新的。
   */
  function startScannersPolling(intervalMs = 5000) {
    if (scannersTimer) window.clearInterval(scannersTimer)
    refreshScanners().catch((error) => {
      handleError(error)
    })
    scannersTimer = window.setInterval(() => {
      refreshScanners().catch((error) => {
        handleError(error)
      })
    }, Math.max(2000, intervalMs))
  }

  function stopScannersPolling() {
    if (scannersTimer) {
      window.clearInterval(scannersTimer)
      scannersTimer = undefined
    }
  }

  // -------------------------------------------------------------
  // 本地任务恢复（刷新 / 重连后接管 Agent 持久化任务）
  // -------------------------------------------------------------

  async function recoverLocalScanJob() {
    const ctx = kioskContext.value
    const deviceId = getActiveScannerDeviceId()
    const stationId = getActiveScannerStationId()
    if (!examId.value || !ctx || !deviceId || !stationId) {
      return
    }
    let response: ScanJobListResponse
    try {
      response = await listScanJobs({
        examId: examId.value,
        scannerDeviceId: deviceId,
        scannerStationId: stationId,
        includeTerminal: true,
      })
    } catch (error) {
      if (error instanceof LocalAgentUnavailableError) {
        markLocalAgentDisconnected()
        return
      }
      throw error
    }
    hydratePreviewScanJobId(response.jobs)
    const currentJobId = currentJob.value?.scanJobId || ''
    const hasActiveCurrentJob = Boolean(
      currentJob.value && currentJob.value.status !== 'REPORTED',
    )
    const recoverableJobs = response.jobs.filter(isRecoverableLocalJob)
    const currentPersistedJob = currentJobId
      ? recoverableJobs.find((job) => job.scanJobId === currentJobId)
      : undefined
    const backendBatchExternalNo = activeBackendBatchExternalNo.value
    const recoverableJob
      = (currentPersistedJob
        && (hasActiveCurrentJob || isRecoverableLocalJob(currentPersistedJob))
        ? currentPersistedJob
        : undefined)
      || (!hasActiveCurrentJob
          ? recoverableJobs.find((job) => {
              return Boolean(
                backendBatchExternalNo
                && job.batchExternalNo === backendBatchExternalNo
                && job.examId === examId.value
                && job.scannerDeviceId === deviceId
                && job.scannerStationId === stationId,
              )
            }) || recoverableJobs.find((job) => {
                return (
                  job.examId === examId.value
                  && job.scannerDeviceId === deviceId
                  && job.scannerStationId === stationId
                  && sameOrderedStringList(job.declaredClassIds, ctx.classIds)
                  && isRecoverableLocalJob(job)
                )
              })
          : undefined)
    if (hasActiveCurrentJob && recoverableJob) {
      currentJob.value = recoverableJob
      activeBatchExternalNo.value = recoverableJob.batchExternalNo
      if (recoverableJob.scanBatchId?.trim()) {
        activeScanBatchId.value = recoverableJob.scanBatchId.trim()
      }
      if (shouldPollRecoveredJob(recoverableJob)) {
        startJobPolling(recoverableJob.scanJobId)
      }
      return
    }
    if (hasActiveCurrentJob) {
      return
    }
    if (!recoverableJob) {
      if (activeBackendScanSession.value) {
        errorMessage.value = '服务端存在未结束扫描批次，但本机未找到对应扫描任务，请联系管理员处理或在扫描进程中确认结束扫描'
      }
      return
    }
    currentJob.value = recoverableJob
    activeBatchExternalNo.value = recoverableJob.batchExternalNo
    if (recoverableJob.scanBatchId?.trim()) {
      activeScanBatchId.value = recoverableJob.scanBatchId.trim()
    }
    if (shouldPollRecoveredJob(recoverableJob)) {
      startJobPolling(recoverableJob.scanJobId)
    }
    successMessage.value = '已恢复本地未完成扫描任务'
  }

  // -------------------------------------------------------------
  // 模式切换 / 补扫准备
  // -------------------------------------------------------------

  async function changeScanMode(mode: ScannerKioskScanMode) {
    if (scanMode.value === mode) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能切换扫描模式'
      return
    }
    scanMode.value = mode
    if (mode !== 'SUPPLEMENT') {
      supplementTargetPageNo.value = undefined
      supplementReason.value = ''
      supplementReplaceTargetPage.value = false
    }
    errorMessage.value = ''
    await refreshKioskContext()
  }

  // -------------------------------------------------------------
  // 扫描任务 lifecycle
  // -------------------------------------------------------------

  function resolveLifecycleScanSource(
    lifecycle: ExamScannerBatchLifecycleVO,
    context: ExamScannerKioskContextVO,
  ): ({
    ok: true
    scanMode: ScannerKioskScanMode
    targetPageNo?: number
    supplementReason?: string
    replaceTargetPage: boolean
  } | {
    ok: false
    errorMessage: string
  }) {
    if (!lifecycle.scanMode) {
      return {
        ok: false,
        errorMessage: '扫描批次缺少扫描模式，已阻断本地扫描启动',
      }
    }
    if (
      lifecycle.declaredClassIds
      && !sameOrderedStringList(lifecycle.declaredClassIds, context.classIds)
    ) {
      return {
        ok: false,
        errorMessage: '扫描批次班级范围与当前考试不一致，请刷新后重新启动扫描',
      }
    }
    if (lifecycle.scanMode !== 'SUPPLEMENT') {
      return { ok: true, scanMode: lifecycle.scanMode, replaceTargetPage: false }
    }
    if (!lifecycle.targetPageNo || lifecycle.targetPageNo <= 0) {
      return {
        ok: false,
        errorMessage: '补扫任务缺少目标页号，已阻断本地扫描启动',
      }
    }
    const reason = lifecycle.supplementReason?.trim()
    if (!reason) {
      return {
        ok: false,
        errorMessage: '补扫任务缺少补扫原因，已阻断本地扫描启动',
      }
    }
    return {
      ok: true,
      scanMode: lifecycle.scanMode,
      targetPageNo: lifecycle.targetPageNo,
      supplementReason: reason,
      replaceTargetPage: lifecycle.replaceTargetPage,
    }
  }

  async function submitScanJob() {
    if (!kioskContext.value) return
    if (activeBackendScanSession.value) {
      errorMessage.value = activeBackendScanSessionReason.value
      return
    }
    if (!canStartScan.value) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能新建扫描'
      return
    }
    const isSupplement = scanMode.value === 'SUPPLEMENT'
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    resetBusyState()
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    try {
      if (!scannerDeviceId) {
        errorMessage.value = '考试扫描设备缺失，无法创建扫描批次'
        return
      }
      if (!scannerStationId) {
        errorMessage.value = '考试扫描站点缺失，无法创建扫描批次'
        return
      }
      const batchLifecycle = await startScannerKioskBatch({
        examId: examId.value,
        scannerDeviceId,
        scannerStationId,
        declaredClassIds: kioskContext.value.classIds,
        scanMode: scanMode.value,
        targetPageNo: isSupplement ? supplementTargetPageNo.value : undefined,
        supplementReason: isSupplement ? supplementReason.value.trim() || undefined : undefined,
        replaceTargetPage: isSupplement ? supplementReplaceTargetPage.value : false,
        scanConfig: { ...scanConfig.value },
      })
      if (!batchLifecycle.batchExternalNo) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少批次编号，无法启动本地扫描',
        )
        return
      }
      if (!batchLifecycle.scanBatchId?.trim()) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少批次 ID，无法启动本地扫描',
        )
        return
      }
      activeBatchExternalNo.value = batchLifecycle.batchExternalNo
      activeScanBatchId.value = batchLifecycle.scanBatchId.trim()
      if (!batchLifecycle.reportId) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少扫描报告 ID，无法启动本地扫描',
        )
        return
      }
      if (!batchLifecycle.resolvedScanConfig) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少冻结扫描参数，无法启动本地扫描',
        )
        return
      }
      const lifecycleScanSource = resolveLifecycleScanSource(batchLifecycle, kioskContext.value)
      if (!lifecycleScanSource.ok) {
        await handleScanJobStartFailure(null, lifecycleScanSource.errorMessage)
        return
      }
      currentJob.value = await startScanJob({
        context: kioskContext.value,
        localScannerId: selectedScannerId.value,
        batchExternalNo: batchLifecycle.batchExternalNo,
        reportId: batchLifecycle.reportId,
        expectedPages: isSupplement ? 1 : undefined,
        scanMode: lifecycleScanSource.scanMode,
        targetPageNo: lifecycleScanSource.targetPageNo,
        supplementReason: lifecycleScanSource.supplementReason,
        replaceTargetPage: lifecycleScanSource.replaceTargetPage,
        resolvedScanConfig: batchLifecycle.resolvedScanConfig,
      })
      startJobPolling(currentJob.value.scanJobId)
    } catch (error) {
      await handleScanJobStartFailure(error)
    } finally {
      loading.value = false
    }
  }

  async function cancelCurrentJob() {
    if (!currentJob.value) return
    if (!canCancelJob.value) {
      errorMessage.value = '当前任务已进入上传链路，不能取消'
      return
    }
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await cancelScanJob(currentJob.value.scanJobId)
      await closeActiveBatch(true)
      await refreshKioskContext()
      await refreshPageLedger()
      successMessage.value = '扫描任务已取消，请删除任务完成清理'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function retryCurrentUpload() {
    if (!currentJob.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await retryUpload(currentJob.value.scanJobId)
      startJobPolling(currentJob.value.scanJobId)
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function pauseCurrentJob() {
    if (!currentJob.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await pauseScanJob(currentJob.value.scanJobId)
      successMessage.value = '当前任务已暂停'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function resumeCurrentJob() {
    if (!currentJob.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await resumeScanJob(currentJob.value.scanJobId)
      startJobPolling(currentJob.value.scanJobId)
      successMessage.value = '当前任务已恢复'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function endCurrentBatch() {
    if (!currentJob.value) return
    if (!canEndBatch.value) {
      errorMessage.value = '当前任务不在采集阶段，不能结束批次'
      return
    }
    const confirmed = await confirmAsync({
      title: '结束批次',
      content: '确认结束本批次吗？已扫描页面会进入上传与提交流程。',
    })
    if (!confirmed) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await endBatch(currentJob.value.scanJobId)
      if (isPollingTerminalJob(currentJob.value)) {
        await handleTerminalBatchClosure(currentJob.value)
        successMessage.value = KIOSK_BATCH_SUBMITTED_HINT
        return
      }
      startJobPolling(currentJob.value.scanJobId)
      successMessage.value = '本批次已结束，正在提交'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function retryCurrentCommit() {
    if (!currentJob.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await retryCommit(currentJob.value.scanJobId)
      startJobPolling(currentJob.value.scanJobId)
      successMessage.value = '已重新进入提交队列'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function removeCurrentScanJob() {
    if (!currentJob.value) return
    const job = currentJob.value
    if (currentJobAllPagesUploadedButUnconfirmed.value) {
      errorMessage.value = '页面已上传完成但提交未确认，请先重试提交'
      return
    }
    if (!canRemoveCurrentJob.value) {
      errorMessage.value = '当前任务已进入上传链路，请等待上报完成或失败后再处理'
      return
    }
    if (job.reported) {
      const reason = await promptModal({
        title: '废弃扫描任务',
        placeholder: '请输入废弃原因（必填，1-255 字）',
        required: true,
        okText: '下一步',
        okType: 'danger',
        emptyErrorMessage: '废弃原因不能为空',
      })
      if (reason === null) return
      if (reason.length > 255) {
        errorMessage.value = '废弃原因长度不能超过 255'
        return
      }
      const confirmed = await confirmAsync({
        title: '确认废弃',
        content: `确认废弃扫描任务 ${job.scanJobId}？该操作会将本批次标记为已废弃，且不可逆。`,
        type: 'error',
        okText: '废弃',
      })
      if (!confirmed) return
      loading.value = true
      try {
        if (!job.scanBatchId) {
          errorMessage.value = '已上报任务缺少批次信息，无法执行废弃'
          return
        }
        await discardScannerKioskBatch({
          scanBatchId: job.scanBatchId,
          discardReason: reason,
        })
        await discardScanJob(job.scanJobId, reason)
        activeBatchExternalNo.value = ''
        activeScanBatchId.value = ''
        successMessage.value = '已废弃扫描批次并清理本地扫描任务'
        currentJob.value = null
        lastPreviewScanJobId.value = ''
        await refreshKioskContext()
        await refreshPageLedger()
      } catch (error) {
        handleError(error)
      } finally {
        loading.value = false
      }
      return
    }
    const confirmed = await confirmAsync({
      title: '确认删除未上报任务',
      content: `确认删除尚未上报的扫描任务 ${job.scanJobId}？该操作会清理本地扫描任务，并关闭当前扫描工作台记录、丢弃未提交中间页。`,
      type: 'warning',
      okText: '删除',
    })
    if (!confirmed) return
    loading.value = true
    try {
      await closeActiveBatch(true)
      await deleteScanJob(job.scanJobId, true)
      successMessage.value = '已删除本地扫描任务并关闭当前扫描工作台记录'
      currentJob.value = null
      await refreshKioskContext()
      await refreshPageLedger()
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function discardLedgerPage(item: { localPageId?: string, pageNo: number }) {
    if (!Number.isFinite(item.pageNo)) {
      throw toUserError(null, '页级账本缺少页号，请刷新后重试')
    }
    if (!canDiscardLedgerPage.value) {
      errorMessage.value = '当前扫描任务未结束，不能废弃已落库扫描页'
      return
    }
    if (pageLedger.value?.dataSource !== 'DATABASE' || !item.localPageId) {
      errorMessage.value = '仅已落库扫描页支持单页废弃'
      return
    }
    const reason = await promptModal({
      title: `废弃第 ${item.pageNo} 页`,
      placeholder: '请输入单页废弃原因（必填，1-255 字）',
      required: true,
      okText: '下一步',
      okType: 'danger',
      emptyErrorMessage: '废弃原因不能为空',
    })
    if (reason === null) return
    if (reason.length > 255) {
      errorMessage.value = '废弃原因长度不能超过 255'
      return
    }
    const confirmed = await confirmAsync({
      title: '确认废弃本页',
      content: `确认废弃第 ${item.pageNo} 页？该页将不再参与切片识别 / 归档。`,
      type: 'error',
      okText: '废弃本页',
    })
    if (!confirmed) return
    loading.value = true
    errorMessage.value = ''
    try {
      await discardScannedPage({
        scannedPageId: item.localPageId,
        discardReason: reason,
      })
      successMessage.value = '已废弃单张扫描页'
      await refreshKioskContext()
      await refreshPageLedger()
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------
  // Agent 激活 / 解绑 / 诊断
  // -------------------------------------------------------------

  async function activateAgent() {
    if (!canActivateAgent.value) {
      activationErrorMessage.value = '当前扫描任务未结束，不能重新激活一体机'
      return
    }
    loading.value = true
    activationErrorMessage.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    try {
      await syncActivationFormFromAgent()
      const request = validateActivationForm()
      if (!request.ok) {
        activationErrorMessage.value = request.errorMessage
        return
      }
      const activation = await activateLocalAgent(request)
      saveKioskAuthSession({
        ...activation,
        endpointName: request.endpointName,
      })
      activationForm.value.activationCode = ''
      activationModalOpen.value = false
      await router.replace({
        query: {
          ...route.query,
          scannerDeviceId: activation.scannerDeviceId,
          scannerStationId: activation.scannerStationId,
        },
      })
      await refreshAll()
      await loadKioskBootstrap()
      await loadExamOptions()
      await ensureLiveStreamConnected()
      successMessage.value = '一体机已激活'
    } catch (error) {
      activationErrorMessage.value = getUserErrorMessage(error, '一体机激活失败')
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function installAgentUpdatePackage() {
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能安装更新包'
      return
    }
    if (!health.value?.updateInstallable) {
      errorMessage.value = '当前没有可安装的更新包'
      return
    }
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
      await installAgentUpdate()
      await refreshAll()
      successMessage.value = '已开始安装本机扫描组件更新'
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  function onManualRefreshLedger() {
    refreshPageLedger().catch((error) => {
      handleError(error)
    })
  }

  // -------------------------------------------------------------
  // 任务轮询 / 批次收口 / busy 状态
  // -------------------------------------------------------------

  function startJobPolling(scanJobId: string) {
    if (jobTimer) window.clearInterval(jobTimer)
    jobPollFailureCount = 0
    jobTimer = window.setInterval(async () => {
      try {
        const prevPageCount = currentJob.value?.pages.length ?? 0
        currentJob.value = await getScanJob(scanJobId)
        jobPollFailureCount = 0
        const polledBatchId = currentJob.value.scanBatchId?.trim()
        if (polledBatchId) {
          activeScanBatchId.value = polledBatchId
        }
        if (currentJob.value.pages.length > prevPageCount) {
          const lastPage = visiblePages.value.at(-1)
          if (lastPage) previewPageNo.value = lastPage.pageNo
        }
        if (isPollingTerminalJob(currentJob.value)) {
          if (jobTimer) window.clearInterval(jobTimer)
          jobTimer = undefined
          await handleTerminalBatchClosure(currentJob.value)
        }
      } catch (error) {
        jobPollFailureCount += 1
        if (jobPollFailureCount >= 3) {
          if (jobTimer) window.clearInterval(jobTimer)
          jobTimer = undefined
          errorMessage.value = '扫描任务状态连续刷新失败，请检查本机扫描组件连接后手动刷新'
        }
        handleError(error)
      }
    }, 1500)
  }

  async function closeActiveBatch(discardPendingPages: boolean) {
    const batchExternalNo = getActiveBatchExternalNo()
    if (!batchExternalNo) {
      throw toUserError(null, '当前扫描任务缺少批次外部号，无法关闭批次')
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!examId.value) {
      throw toUserError(null, '当前扫描批次缺少考试信息，无法关闭批次')
    }
    if (!scannerDeviceId) {
      throw toUserError(null, '当前扫描批次缺少扫描设备，无法关闭批次')
    }
    if (!scannerStationId) {
      throw toUserError(null, '当前扫描批次缺少扫描站点，无法关闭批次')
    }
    const lifecycle = await closeScannerKioskBatch({
      examId: examId.value,
      scannerDeviceId,
      scannerStationId,
      batchExternalNo,
      discardPendingPages,
    })
    if (!discardPendingPages) {
      if (
        typeof lifecycle.pendingPageCount !== 'number'
        || !Number.isFinite(lifecycle.pendingPageCount)
      ) {
        throw toUserError(null, '扫描批次关闭结果异常，请刷新后重试')
      }
      if (lifecycle.pendingPageCount > 0) {
        const diagnostic = lifecycle.pendingPagesDiagnostic?.trim()
        throw toUserError(
          null,
          diagnostic || `批次仍有 ${lifecycle.pendingPageCount} 页未提交，无法关闭扫描批次`,
        )
      }
    }
    activeBatchExternalNo.value = ''
    activeScanBatchId.value = ''
  }

  async function handleTerminalBatchClosure(job: ScanJobResponse) {
    activeBatchExternalNo.value = job.batchExternalNo || activeBatchExternalNo.value
    if (job.status === 'REPORTED' && job.reported) {
      await closeActiveBatch(false)
      await refreshKioskContext()
      await refreshPageLedger()
      successMessage.value = KIOSK_BATCH_SUBMITTED_HINT
      return
    }
    if (job.status === 'CANCELLED') {
      await closeActiveBatch(true)
      await refreshKioskContext()
      await refreshPageLedger()
      return
    }
    if (job.status === 'FAILED') {
      const uploadablePages = job.pages.filter((page) => page.status !== 'DELETED')
      const allPagesUploaded
        = uploadablePages.length > 0
          && job.uploadedPages > 0
          && uploadablePages.every(
            (page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId),
          )
      errorMessage.value = allPagesUploaded
        ? '扫描提交未完成，已保留中间页，请点击重试提交'
        : '扫描上传未完成，已保留中间页，请点击重试上传或删除任务'
      await refreshKioskContext()
      await refreshPageLedger()
    }
  }

  function enterBusyState(activeJobId: string) {
    busyPollFailureCount = 0
    busyState.value = { active: true, activeJobId, activeJob: null }
    void pollActiveJob(activeJobId)
    if (busyPollTimer) window.clearInterval(busyPollTimer)
    busyPollTimer = window.setInterval(() => {
      void pollActiveJob(activeJobId)
    }, 2000)
  }

  async function pollActiveJob(activeJobId: string) {
    try {
      const job = await getScanJob(activeJobId)
      busyPollFailureCount = 0
      busyState.value.activeJob = job
      if (isPollingTerminalJob(job)) {
        resetBusyState()
        if (job.status === 'FAILED') {
          successMessage.value = ''
          errorMessage.value = '上一扫描任务已失败，请先处理失败项'
        } else {
          errorMessage.value = ''
          successMessage.value = '上一扫描任务已结束'
        }
      }
    } catch (error) {
      busyPollFailureCount += 1
      handleError(
        error,
        busyPollFailureCount >= 3
          ? '无法确认上一扫描任务状态，请检查本机扫描组件后重试'
          : '本机扫描组件状态查询失败，正在重试',
      )
      if (busyPollFailureCount >= 3 && busyPollTimer) {
        window.clearInterval(busyPollTimer)
        busyPollTimer = undefined
      }
    }
  }

  // -------------------------------------------------------------
  // 监听：考试切换 / 扫描仪切换 / 批次切换 / SSE 增量
  // -------------------------------------------------------------

  watch(examId, (newVal, oldVal) => {
    if (newVal === oldVal) return
    if (restoringExamId) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能切换考试'
      restoringExamId = true
      examId.value = oldVal || ''
      void nextTick(() => {
        restoringExamId = false
      })
      return
    }
    kioskContext.value = null
    activeBatchExternalNo.value = ''
    activeScanBatchId.value = ''
    currentJob.value = null
    previewPageNo.value = 0
    batchHistoryFilter.pageNum = 1
    batchHistoryList.value = []
    batchHistoryTotal.value = 0
    if (jobTimer) {
      window.clearInterval(jobTimer)
      jobTimer = undefined
    }
    refreshKioskContext().then(recoverLocalScanJob).catch((error) => {
      handleError(error)
    })
    if (newVal && health.value?.bound && hasMarkScannerKioskAuth()) {
      refreshSse().catch((error) => {
        handleError(error)
      })
    } else {
      stopSse()
    }
  })

  watch(selectedScannerId, (newVal, oldVal) => {
    if (newVal === oldVal) return
    if (restoringScannerId) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能切换本地扫描仪'
      restoringScannerId = true
      selectedScannerId.value = oldVal || lastStableScannerId
      void nextTick(() => {
        restoringScannerId = false
      })
      return
    }
    lastStableScannerId = newVal
    const preferredId = newVal?.trim()
    if (preferredId) {
      agentPreferredLocalScannerId.value = preferredId
      setPreferredLocalScanner(preferredId).catch(() => {
        // 持久化失败不阻断当前会话选仪
      })
    }
  })

  watch(
    () => getActiveBatchExternalNo(),
    (newBatchNo, oldBatchNo) => {
      if (newBatchNo === oldBatchNo) return
      if (!isActivatedForMarkApis()) return
      refreshPageLedger().catch((error) => {
        handleError(error)
      })
    },
  )

  watch(boundPaperScanBatchId, (newId, oldId) => {
    if (newId === oldId) return
    if (newId) {
      refreshBoundPapers().catch((error) => {
        handleError(error)
      })
    } else {
      boundPapers.value = []
      boundPapersError.value = null
    }
  })

  watch(
    liveEvents,
    (newEvents, oldEvents) => {
      if (newEvents.length > (oldEvents?.length ?? 0)) {
        if (sseRefreshDebounce) window.clearTimeout(sseRefreshDebounce)
        sseRefreshDebounce = window.setTimeout(() => {
          // SSE 推送增量页 → 节流刷新工作台上下文 + 页级账本
          refreshKioskContext().catch((error) => {
            handleError(error)
          })
          refreshPageLedger().catch((error) => {
            handleError(error)
          })
          refreshBoundPapers().catch((error) => {
            handleError(error)
          })
        }, 800)
      }
    },
    { deep: false },
  )

  watch(
    () => currentJob.value?.scanJobId,
    (scanJobId) => {
      if (scanJobId) {
        lastPreviewScanJobId.value = scanJobId
      }
    },
    { immediate: true },
  )

  // -------------------------------------------------------------
  // lifecycle
  // -------------------------------------------------------------

  onMounted(async () => {
    await syncActivationFormFromAgent()
    await refreshAll()
    if (!needsActivationGate.value) {
      await loadKioskBootstrap().catch((error) => {
        handleError(error)
      })
      await loadExamOptions().catch((error) => {
        handleError(error)
      })
      await ensureLiveStreamConnected()
    }
    healthTimer = window.setInterval(() => {
      refreshHealth().catch((error) => {
        handleError(error)
      })
    }, 5000)
    contextTimer = window.setInterval(() => {
      if (!isActivatedForMarkApis()) {
        return
      }
      refreshKioskContext().then(recoverLocalScanJob).catch((error) => {
        handleError(error)
      })
    }, 15000)
  })

  onBeforeUnmount(() => {
    if (healthTimer) window.clearInterval(healthTimer)
    if (contextTimer) window.clearInterval(contextTimer)
    if (jobTimer) window.clearInterval(jobTimer)
    if (busyPollTimer) window.clearInterval(busyPollTimer)
    stopScannersPolling()
    if (sseRefreshDebounce) window.clearTimeout(sseRefreshDebounce)
    if (examSelectSearchDebounce) window.clearTimeout(examSelectSearchDebounce)
    stopSse()
  })

  // -------------------------------------------------------------
  // export
  // -------------------------------------------------------------

  return {
    // ---- reactive state ----
    health,
    scanners,
    selectedScannerId,
    kioskContext,
    boundPapers,
    boundPapersLoading,
    boundPapersError,
    boundPaperScanBatchId,
    boundPaperSummary,
    currentJob,
    loading,
    errorMessage,
    successMessage,
    activationModalOpen,
    activationModalForced,
    activationErrorMessage,
    previewPageNo,
    scanMode,
    supplementTargetPageNo,
    supplementReason,
    supplementReplaceTargetPage,
    scanConfig,
    activationForm,
    examId,
    examBindingRequired,
    workbenchTab,
    deviceReadiness,
    activationGateReason,
    needsActivationGate,
    needsExamBindingGate,
    examOptions,
    examOptionTotal,
    examOptionLoading,
    examOptionFilter,

    // ---- 历史批次浏览（HistoryStage） ----
    batchHistoryList,
    batchHistoryTotal,
    batchHistoryLoading,
    batchHistoryFilter,
    historyLedgerBatch,
    historyLedgerSnapshot,
    historyLedgerLoading,
    historyLedgerError,

    // ---- SSE 实时流 ----
    liveEvents,
    sseStreaming,
    pageLedger,
    pageLedgerError,
    pageLedgerLoading,

    // ---- computed ----
    selectedExamOption,
    selectedScanner,
    visiblePages,
    exceptionPages,
    previewImageUrl,
    scanProgress,
    activeBackendScanSession,
    activeBackendBatchExternalNo,
    activeBackendScanSessionReason,
    currentJobBlocksWorkspace,
    canCancelJob,
    canEndBatch,
    canRetryUpload,
    canRetryCommit,
    canRemoveCurrentJob,
    currentJobAllPagesUploadedButUnconfirmed,
    removeCurrentJobTitle,
    scanBlockedReason,
    canStartScan,
    canSwitchScanMode,
    canSwitchExam,
    canSwitchScanner,
    canActivateAgent,
    canDiscardLedgerPage,
    kioskBrowserSessionSyncNeeded,
    workState,
    uploadStage,
    latestBatchText,
    latestBatchModeText,
    examTermText,
    declaredClassChips,
    kioskMetrics,
    latestBatchPeriodText,
    pendingUploadJobsText,

    // ---- 文案 helper ----
    scanModeText,
    agentHealthStatusLabel,
    agentUpdateStatusLabel,
    endpointOnlineStatusLabel,
    scannerColorModeLabel,
    scannerDuplexModeLabel,
    localScanJobStatusText,
    ledgerSourceText,
    registrationStatusText,
    attentionTypeText,
    scannerDiagnosticText,
    ledgerItemKey,
    formatTime,

    // ---- 数据刷新 ----
    refreshAll,
    refreshScannersByUser,
    refreshPageLedger,
    refreshBoundPapers,
    onManualRefreshLedger,
    loadExamOptions,
    bindKioskExam,
    onExamSelectSearch,
    refreshExamOptionsByUser,

    // ---- 历史批次浏览 ----
    loadBatchHistory,
    changeBatchHistoryPage,
    changeBatchHistoryIncludeDiscarded,
    applyBatchHistoryTimeRange,
    clearBatchHistoryTimeRange,
    viewBatchHistoryLedger,
    closeBatchHistoryLedger,

    // ---- 扫描仪枚举轮询（设置抽屉打开时启动） ----
    startScannersPolling,
    stopScannersPolling,

    // ---- 模式切换 ----
    changeScanMode,
    applyExamRecommendedScanConfig,

    // ---- 扫描任务操作 ----
    submitScanJob,
    cancelCurrentJob,
    retryCurrentUpload,
    pauseCurrentJob,
    resumeCurrentJob,
    endCurrentBatch,
    retryCurrentCommit,
    removeCurrentScanJob,
    discardLedgerPage,

    // ---- Agent 操作 ----
    activateAgent,
    installAgentUpdatePackage,
    openActivationModal,
  }
}

export type KioskWorkflow = ReturnType<typeof useKioskWorkflow>

// -------------------------------------------------------------
// 模块级 helper
// -------------------------------------------------------------

function queryValue(value: LocationQueryValue | LocationQueryValue[]) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : ''
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 把 HTML datetime-local 输入值（'YYYY-MM-DDTHH:mm'）规范化为 ISO LOCAL_DATE_TIME
 * 字符串（'YYYY-MM-DDTHH:mm:ss'）。空字符串原样返回；已含秒时不重复补。
 *
 * 用于历史批次时间范围过滤：后端 ExamScannerBatchQueryRequest 字段
 * scanStartTimeFrom / scanStartTimeTo 类型为 LocalDateTime，后端绑定要求 ISO 本地时间格式。
 */
function normalizeDatetimeLocal(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  return /T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed
}
