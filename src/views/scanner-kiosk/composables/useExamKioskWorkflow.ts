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
import { useRoute, useRouter } from 'vue-router'
import type {
  AgentHealthStatusCode,
  ScanJobListResponse,
  ScanJobResponse,
  ScannerDeviceInfo,
  ScannerListResponse,
} from '@/apis/mark/scanner-agent-local'
import {
  AgentHealthStatusDescription,
  AgentUpdateStatusCode,
  AgentUpdateStatusDescription,
  cancelScanJob,
  deleteScanJob,
  DirectScanProviderChainCode,
  discardScanJob,
  endBatch,
  getAgentSetupContext,
  getPageImageUrl,
  getScanJob,
  installAgentUpdate,
  KioskSyntheticScanPageStatusCode,
  listLocalScanners,
  listScanJobs,
  LOCAL_AGENT_UNAVAILABLE_ERROR,
  LocalAgentUnavailableError,
  LocalScanJobStatusCode,
  LocalScanJobStatusDescription,
  LocalScanPageStatusCode,
  pauseScanJob,
  resumeScanJob,
  retryCommit,
  retryUpload,
  ScannerBlankPagePolicyCode,
  ScannerBusinessSceneCode,
  ScannerBusyError,
  ScannerOutputContainerFormat,
  ScannerPageImageFormat,
  setPreferredLocalScanner,
  startScanJob,
} from '@/apis/mark/scanner-agent-local'
import type {
  ExamScannerBatchResponse,
  ExamScannerBoundPaperItemVO,
  ExamScannerKioskBatchHistoryRequest,
  ExamScannerKioskBindExamCandidatePageRequest,
  ExamScannerKioskBindExamCandidateVO,
  ExamScannerKioskContextVO,
  ExamScannerPageLedgerVO,
  ExamScannerScanConfigOptionsVO,
  ExamScannerScanConfigVO,
} from '@/apis/mark/scanner-kiosk'
import {
  bindScannerKioskExam,
  discardScannedPage,
  discardScannerKioskBatch,
  ExamScannerLedgerDataSourceCode,
  ExamScannerLedgerDataSourceDescription,
  ExamScannerPageRegistrationStatusCode,
  ExamScannerPageRegistrationStatusDescription,
  getScannerKioskBootstrap,
  getScannerKioskContext,
  listScannerKioskBoundPapers,
  PageRegisterStateDescription,
  pageScannerKioskBatchHistory,
  pageScannerKioskBindExamCandidates,
  retryKioskScanBatchPageRegister,
  ScannerKioskResumeActionCode,
  ScannerKioskResumeActionDescription,
  ScannerKioskScanModeCode,
  ScannerKioskScanModeDescription,
} from '@/apis/mark/scanner-kiosk'
import type { ScanWorkOrderLifecycleVO } from '@/apis/mark/scanner-work-order'
import {
  commitExamScanWorkOrder,
  discardExamScanWorkOrder,
  retryExamScanWorkOrderPageRegister,
  startExamScanWorkOrder,
} from '@/apis/mark/scanner-work-order'
import type { SemesterCode } from '@/types/enums'
import { getSemesterDescription, SemesterOptions } from '@/types/enums'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ScannerColorModeCode,
  ScannerColorModeDescription,
  ScannerDuplexModeCode,
  ScannerDuplexModeDescription,
  ScannerEndpointOnlineStatusDescription,
} from '@/apis/mark/exam-mark-scanner'
import { ScanAttentionTypeCode, ScanAttentionTypeDescription } from '@/apis/mark/exam-scan'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { DirectScanProviderChainDescription } from '@/types/enums/direct-scan-provider-chain-enum'
import { ExamScannerPageUploadStatusCode } from '@/types/enums/exam-scanner-page-upload-status-enum'
import {
  KioskActivationGateReasonCode,
  KioskActivationGateReasonDescription,
} from '@/types/enums/kiosk-activation-gate-reason-enum'
import { LocalScanPageSideCode } from '@/types/enums/local-scan-page-side-enum'
import { ScanBatchStatusCode } from '@/types/enums/scan-batch-status-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
  toUserError,
} from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import {
  clearKioskAuthSession,
  getKioskBindingProfile,
  hasMarkScannerKioskAuth,
  KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE,
  KIOSK_BROWSER_SESSION_SYNC_MESSAGE,
  needsKioskBrowserSessionSync,
  recoverKioskBrowserSessionFromAgent,
} from '@/utils/kiosk-auth'
import { kioskMaterialKindLabel } from '@/utils/scanner-kiosk-ui'
import { strictEnumLabel } from '@/utils/strict-enum'
import { fetchPagedHistoryLedgerSnapshot } from '@/views/scanner-kiosk/composables/ledgerMerge'
import { useKioskDeviceActivation } from '@/views/scanner-kiosk/composables/useKioskDeviceActivation'
import { SCANNER_EXAM_BIND_ROUTE } from '@/views/scanner-kiosk/composables/useKioskExamRouteGuard'
import {
  isAgentWorkspaceBlocked,
  resolveKioskActivationGuardMessage,
} from '@/views/scanner-kiosk/utils/kioskActivationGuard'

type KioskWorkStateTone = 'success' | 'running' | 'danger' | 'muted' | 'warning'

interface KioskWorkState {
  text: string
  tone: KioskWorkStateTone
}

// ================================================================
// 静态字典：扫描策略色彩 / 单面双面扫描文案，由 UI / SideRail 直接读取。
// ================================================================

type ScanColorMode = ExamScannerScanConfigVO['colorMode']
type ScanDuplexMode = ExamScannerScanConfigVO['duplexMode']
const ACTIVE_SCAN_BATCH_STATUS = ScanBatchStatusCode.IN_PROGRESS
interface DisplayScanPage {
  captureSeq?: number
  pageNo: number
  sheetNo: number
  pageSide: LocalScanPageSideCode
  pageSideLabel: string
  status: string
  diagnostic?: string
  sourceFileId?: string
  uploadedFileId?: string
}

const KIOSK_BATCH_SUBMITTED_HINT
  = '批次已上传，可在阅卷中心「扫描录入」查看异常；试卷与答题卡均支持在线复核'

/** scanMode 到统一文档采集场景的默认映射 */
function resolveBusinessSceneFromScanMode(): ScannerBusinessSceneCode {
  return ScannerBusinessSceneCode.EXAM_DIRECT_SCAN
}

export { getSemesterDescription, SemesterOptions }

// ================================================================
// 主 composable
// ================================================================

export function useExamKioskWorkflow() {
  const route = useRoute()
  const router = useRouter()
  const deviceActivation = useKioskDeviceActivation()
  const {
    health,
    localAgentReachable,
    activationForm,
    activationErrorMessage,
    manualActivationGateOpen,
    needsActivationGate,
    activationGateReason,
    activationModalForced,
    kioskBrowserSessionSyncNeeded,
    hasActiveDeviceActivation,
    isActivatedForMarkApis,
  } = deviceActivation

  // -------------------------------------------------------------
  // reactive state：承载一体机工作台的浏览器态、Agent 态和后端上下文锚点。
  // -------------------------------------------------------------
  const scanners = ref<ScannerDeviceInfo[]>([])
  const scannerCatalogDiagnostic = ref('')
  const scannerInventoryRefreshing = ref(false)
  const selectedScannerId = ref('')
  const agentPreferredLocalScannerId = ref('')
  const kioskContext = ref<ExamScannerKioskContextVO | null>(null)
  const boundPapers = ref<ExamScannerBoundPaperItemVO[]>([])
  const boundPapersLoading = ref(false)
  const boundPapersError = ref<Error | null>(null)
  const currentJob = ref<ScanJobResponse | null>(null)
  /** 终态清空 currentJob 后，Review 阶段仍用此 ID 拉本地页预览。 */
  const lastPreviewScanJobId = ref('')
  /** 终态收口后保留本机 REPORTED 任务快照，供复核预览与 fileId→本地页映射。 */
  const lastPreviewScanJob = ref<ScanJobResponse | null>(null)
  /** 终态收口后保留批次外部号，供页级账本 SSE 补差锚定。 */
  const lastReportedBatchExternalNo = ref('')
  const loading = ref(false)
  /** 设备/上下文全量刷新进行中（与扫描操作 loading 分离，避免刷新按钮长期误转）。 */
  const refreshAllInFlight = ref(false)
  /** Step2 挂载恢复本地任务 / 对齐后端批次时的短暂状态，供侧栏与主区空态同步。 */
  const scanWorkspaceBootstrapping = ref(false)
  /** 首屏 refreshAll 完成前禁止阶段机 autoSync，避免 context 未就绪误跳 Step2。 */
  const kioskBootstrapPending = ref(true)
  const errorMessage = ref('')
  const successMessage = ref('')
  const previewPageNo = ref(0)
  const scanMode = ref<ScannerKioskScanModeCode>(ScannerKioskScanModeCode.DIRECT)
  /** 统一文档采集业务场景；默认试卷直扫 */
  const businessScene = ref<ScannerBusinessSceneCode>(ScannerBusinessSceneCode.EXAM_DIRECT_SCAN)
  /** 试卷直扫识别链路；由 kiosk 上下文 OCR 配置或后续 UI 选择写入 */
  const providerChain = ref<DirectScanProviderChainCode | undefined>()
  const supplementTargetPageNo = ref<number | undefined>()
  const supplementReason = ref('')
  const activeBatchExternalNo = ref('')
  /** batch/start 落库的当前工作台批次 ID，供绑定查询与侧栏展示锚定。 */
  const activeScanBatchId = ref('')
  /** 自动页登记阻断态：commit 成功后批次致命阻断。 */
  const pageRegisterBlocked = ref(false)
  /** commit 成功但页登记待重试（D3）。 */
  const pageRegisterPending = ref(false)
  const pageRegisterDiagnostic = ref('')
  const pageRegisterRetryLoading = ref(false)
  /** 当前 IN_PROGRESS 工单 reportId，浏览器 commit 兜底时使用。 */
  const activeReportId = ref('')
  /** start 时冻结的扫描参数，浏览器 commit 兜底时使用。 */
  const activeResolvedScanConfig = ref<ExamScannerScanConfigVO | null>(null)
  /**
   * 补扫子模式：true=替换目标页（旧扫描页 SUPERSEDED），false=纯追加补扫。
   * 仅在 scanMode==='SUPPLEMENT' 时有效；切到其他模式由 changeScanMode 自动重置。
   */
  const supplementReplaceTargetPage = ref(false)
  /** 补扫选定的已绑定试卷实例 ID，batch/start 时传给后端冻结。 */
  const supplementPaperInstanceId = ref('')
  const scanConfig = ref<ExamScannerScanConfigVO>({
    dpi: 300,
    colorMode: ScannerColorModeCode.COLOR,
    duplexMode: ScannerDuplexModeCode.SIMPLEX,
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
  const examBindingRequired = ref(false)
  /** bootstrap 完成前不展示绑定向导，避免空列表闪屏。 */
  const examBindingBootstrapPending = ref(true)
  const examSwitchGateOpen = ref(false)
  const workbenchTab = ref<'scan' | 'records'>('scan')

  /** 工位服务端已绑定考试，仅用于 bind 页预填，不自动进入工作台。 */
  const stationBoundExamId = ref<string>('')
  // examId 仅由用户在 bind 页确认绑定后写入，不用 URL query 或服务端 bootstrap 绕过选考。
  const examId = ref<string>('')
  const queryScannerDeviceId = computed(() => queryValue(route.query.scannerDeviceId))
  const queryScannerStationId = computed(() => queryValue(route.query.scannerStationId))

  const KIOSK_BIND_EXAM_CANDIDATE_PAGE_SIZE = 10

  const bindExamCandidates = ref<ExamScannerKioskBindExamCandidateVO[]>([])
  const bindExamCandidateTotal = ref(0)
  const bindExamCandidateLoading = ref(false)
  /** 绑定向导列表加载阻断原因；与「真无考试」区分，避免误显示空态。 */
  const bindExamCandidateLoadIssue = ref('')
  const bindExamCandidateFilter = reactive<{
    keyword: string
    academicYear: string
    semester?: SemesterCode
    classId?: string
    pageNum: number
    pageSize: number
  }>({
    keyword: '',
    academicYear: '',
    semester: undefined,
    classId: undefined,
    pageNum: 1,
    pageSize: KIOSK_BIND_EXAM_CANDIDATE_PAGE_SIZE,
  })

  // 历史批次浏览（HistoryStage）
  // 缺少任一身份字段时直接返回空列表，避免误调后端。
  const batchHistoryList = ref<ExamScannerBatchResponse[]>([])
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
  const historyLedgerBatch = ref<ExamScannerBatchResponse | null>(null)
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
  let registerStatePollTimer: number | undefined
  let registerStatePollStartedAt = 0
  const REGISTER_STATE_POLL_INTERVAL_MS = 2000
  const REGISTER_STATE_POLL_TIMEOUT_MS = 15000
  let scannersTimer: number | undefined
  let sseRefreshDebounce: number | undefined
  let busyPollFailureCount = 0
  let jobPollFailureCount = 0
  /** 用户主动取消扫描时抑制「扫描已取消 / 未采集页面」等重复提示。 */
  let suppressScanCancelNotice = false
  let restoringExamId = false
  let restoringScannerId = false
  let lastStableScannerId = ''
  let examSelectSearchDebounce: number | undefined
  let refreshAllPromise: Promise<void> | null = null
  let bindExamCandidateLoadPromise: Promise<void> | null = null
  let scannerInventoryEnsurePromise: Promise<boolean> | null = null

  /** refreshAll 总超时：避免 Agent/网关挂起导致刷新按钮永久旋转。 */
  const REFRESH_ALL_TIMEOUT_MS = 45_000
  /** 绑定向导考试列表总超时：避免 Agent/网关挂起导致永久 loading。 */
  const BIND_EXAM_CANDIDATE_LOAD_TIMEOUT_MS = 45_000

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
    resetLedgerCache,
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

  const selectedBindExamCandidate = computed<ExamScannerKioskBindExamCandidateVO | null>(
    () => bindExamCandidates.value.find((item) => item.examId === examId.value) ?? null,
  )
  const availableScanners = computed(() => scanners.value.filter((item) => item.available))
  const selectedScanner = computed(() =>
    scanners.value.find((item) => item.localScannerId === selectedScannerId.value),
  )
  /** 健康检查、Agent 列表与服务端 capabilities 快照任一命中即视为扫描仪可用。 */
  const isLocalScannerConnected = computed(() => {
    if (health.value?.scannerConnected) return true
    const capabilities = kioskContext.value?.capabilities
    if (capabilities?.loaded && capabilities.scannerConnected) return true
    if (capabilities?.loaded && capabilities.localScannerId?.trim()) return true
    if (
      selectedScannerId.value
      && availableScanners.value.some((item) => item.localScannerId === selectedScannerId.value)
    ) {
      return true
    }
    return availableScanners.value.length > 0
  })
  /** Agent 已绑定但尚未完成首次 TWAIN/WIA 枚举，避免误报「未连接」。 */
  function needsScannerInventoryProbe(): boolean {
    if (!localAgentReachable.value || !health.value?.bound) return false
    if (kioskContext.value?.capabilities?.loaded) return false
    if (isLocalScannerConnected.value) return false
    const diagnostic = health.value.diagnosticMessage?.trim() || ''
    return diagnostic.includes('尚未检测扫描仪')
  }

  const isScannerProbePending = computed(() => scannerInventoryRefreshing.value)
  const isDeviceRefreshing = computed(
    () => refreshAllInFlight.value || scannerInventoryRefreshing.value,
  )
  const previewScanJob = computed(() => currentJob.value ?? lastPreviewScanJob.value)
  /** 复核阶段只使用终态快照，避免扫描中的 currentJob 覆盖已结束批次的本地影像。 */
  const reviewScanJob = computed(() => lastPreviewScanJob.value)
  const visiblePages = computed(
    () => previewScanJob.value?.pages.filter((item) => item.status !== LocalScanPageStatusCode.DELETED) ?? [],
  )
  const countableLedgerItems = computed(() =>
    (pageLedger.value?.items ?? []).filter((item) => isCountableLedgerPage(item.registrationStatus)),
  )
  /** 仅统计与当前扫描任务批次外部号一致的账本页，避免历史批次污染本次「已扫描」计数。 */
  const currentBatchLedgerItems = computed(() => {
    const ledger = pageLedger.value
    const batchNo
      = currentJob.value?.batchExternalNo?.trim()
        || activeBatchExternalNo.value.trim()
        || ''
    if (!ledger || !batchNo || ledger.batchExternalNo !== batchNo) {
      return []
    }
    return countableLedgerItems.value
  })
  const isWaitingForPaperFeed = computed(() => {
    const job = currentJob.value
    if (!job || job.status !== LocalScanJobStatusCode.SCANNING) return false
    if (job.scannedPages === 0) return true
    const message = job.message?.trim() || ''
    return message.includes('等待继续放纸') || message.includes('等待放纸')
  })
  /** 按扫描模式推导物理纸张正反面，用于账本页和本地页统一展示双面预览语义。 */
  function resolvePageSheetSide(pageNo: number, duplexMode: ScanDuplexMode) {
    const isBack = duplexMode === ScannerDuplexModeCode.DUPLEX && pageNo % 2 === 0
    const pageSide: LocalScanPageSideCode = isBack ? LocalScanPageSideCode.BACK : LocalScanPageSideCode.FRONT
    return {
      sheetNo: duplexMode === ScannerDuplexModeCode.DUPLEX ? Math.floor((pageNo - 1) / 2) + 1 : pageNo,
      pageSide,
      pageSideLabel: isBack ? '反面' : '正面',
    }
  }

  function scanPageDisplayTitle(page: Pick<DisplayScanPage, 'pageNo' | 'sheetNo' | 'pageSideLabel'>) {
    const duplexMode = previewScanJob.value?.duplexMode ?? scanConfig.value.duplexMode
    if (duplexMode === ScannerDuplexModeCode.DUPLEX) {
      return `第 ${page.sheetNo} 张 ${page.pageSideLabel}`
    }
    return `第 ${page.pageNo} 页`
  }

  /** 扫描中页列表：合并 Agent 本地页与 ledger 已上传页（按 pageNo 去重，本地状态优先）。 */
  const displayPages = computed<DisplayScanPage[]>(() => {
    const duplexMode = previewScanJob.value?.duplexMode ?? scanConfig.value.duplexMode
    const byPageNo = new Map<number, DisplayScanPage>()
    for (const item of currentBatchLedgerItems.value) {
      const sheetSide = resolvePageSheetSide(item.pageNo, duplexMode)
      byPageNo.set(item.pageNo, {
        pageNo: item.pageNo,
        sheetNo: sheetSide.sheetNo,
        pageSide: sheetSide.pageSide,
        pageSideLabel: sheetSide.pageSideLabel,
        status: item.uploadStatus === ExamScannerPageUploadStatusCode.UPLOADED
          ? LocalScanPageStatusCode.UPLOADED
          : KioskSyntheticScanPageStatusCode.SCANNED,
        diagnostic: item.attentionMessage,
        sourceFileId: item.sourceFileId,
        uploadedFileId: item.sourceFileId,
      })
    }
    for (const page of visiblePages.value) {
      const existing = byPageNo.get(page.pageNo)
      byPageNo.set(page.pageNo, {
        captureSeq: page.captureSeq,
        pageNo: page.pageNo,
        sheetNo: page.sheetNo,
        pageSide: page.pageSide,
        pageSideLabel: page.pageSideLabel,
        status: page.status,
        diagnostic: page.diagnostic ?? existing?.diagnostic,
        sourceFileId: page.uploadedFileId ?? existing?.sourceFileId,
        uploadedFileId: page.uploadedFileId ?? existing?.uploadedFileId,
      })
    }
    return [...byPageNo.values()].sort((a, b) => a.pageNo - b.pageNo)
  })

  /** 按页号解析预览标题，保证本地页、账本页和复核页使用同一套双面纸张语义。 */
  function scanPageDisplayTitleByNo(pageNo: number) {
    const existing = displayPages.value.find((page) => page.pageNo === pageNo)
    if (existing) return scanPageDisplayTitle(existing)
    const duplexMode = previewScanJob.value?.duplexMode ?? scanConfig.value.duplexMode
    const sheetSide = resolvePageSheetSide(pageNo, duplexMode)
    return scanPageDisplayTitle({
      pageNo,
      sheetNo: sheetSide.sheetNo,
      pageSideLabel: sheetSide.pageSideLabel,
    })
  }

  /** 按指定双面模式解析历史批次页标题，避免历史账本被当前扫描配置污染。 */
  function scanPageDisplayTitleByNoForDuplex(pageNo: number, duplexMode: ScanDuplexMode) {
    const sheetSide = resolvePageSheetSide(pageNo, duplexMode)
    if (duplexMode === ScannerDuplexModeCode.DUPLEX) {
      return `第 ${sheetSide.sheetNo} 张 ${sheetSide.pageSideLabel}`
    }
    return `第 ${pageNo} 页`
  }

  const displayScannedCount = computed(() => {
    if (!currentJob.value) return 0
    return Math.max(currentJob.value.scannedPages, currentBatchLedgerItems.value.length)
  })
  const displayUploadedCount = computed(() => {
    if (!currentJob.value) return 0
    const jobUploaded = currentJob.value.uploadedPages
    const ledgerUploaded = currentBatchLedgerItems.value.filter(
      (item) => item.uploadStatus === ExamScannerPageUploadStatusCode.UPLOADED,
    ).length
    return Math.max(jobUploaded, ledgerUploaded)
  })
  const exceptionPages = computed(() =>
    visiblePages.value.filter((item) => {
      return item.status === LocalScanPageStatusCode.FAILED || Boolean(item.diagnostic)
    }),
  )
  const previewImageUrl = ref('')
  const previewLoadError = ref('')

  function resolveActiveScanJobIdForPreview(): string {
    return currentJob.value?.scanJobId?.trim() || lastPreviewScanJobId.value.trim()
  }

  function resolvePreviewAgentPageNo(ledgerPageNo: number): number {
    if (ledgerPageNo <= 0) return ledgerPageNo
    const job = previewScanJob.value
    if (!job) return ledgerPageNo
    if (job.pages.some((page) => page.pageNo === ledgerPageNo && page.status !== LocalScanPageStatusCode.DELETED)) {
      return ledgerPageNo
    }
    const ledgerItem = pageLedger.value?.items.find((item) => item.pageNo === ledgerPageNo)
    const sourceFileId = ledgerItem?.sourceFileId?.trim()
    if (sourceFileId) {
      const matchedPage = job.pages.find(
        (page) => page.status !== LocalScanPageStatusCode.DELETED && page.uploadedFileId?.trim() === sourceFileId,
      )
      if (matchedPage) return matchedPage.pageNo
    }
    const displayPage = displayPages.value.find((page) => page.pageNo === ledgerPageNo)
    if (displayPage?.uploadedFileId) {
      const matchedPage = job.pages.find(
        (page) =>
          page.status !== LocalScanPageStatusCode.DELETED
          && page.uploadedFileId?.trim() === displayPage.uploadedFileId?.trim(),
      )
      if (matchedPage) return matchedPage.pageNo
    }
    return ledgerPageNo
  }

  /** 预览仅走本机 Agent 本地落盘影像，不访问 storage。 */
  function refreshPreviewImageUrl() {
    const pageNo = resolvePreviewAgentPageNo(previewPageNo.value)
    previewLoadError.value = ''
    if (pageNo <= 0) {
      previewImageUrl.value = ''
      return
    }

    const scanJobId = resolveActiveScanJobIdForPreview()
    if (!scanJobId) {
      previewImageUrl.value = ''
      previewLoadError.value = '缺少本机扫描任务，无法预览'
      return
    }

    previewImageUrl.value = getPageImageUrl(scanJobId, pageNo)
  }

  function onPreviewImageLoadError() {
    previewImageUrl.value = ''
    previewLoadError.value = '本地影像加载失败，请确认 Agent 已启动且该页已扫描'
  }

  watch(
    () => [
      previewPageNo.value,
      currentJob.value?.scanJobId,
      currentJob.value?.pages?.length,
      lastPreviewScanJobId.value,
      lastPreviewScanJob.value?.scanJobId,
      pageLedger.value?.batchExternalNo,
    ],
    () => {
      void refreshPreviewImageUrl()
    },
    { immediate: true },
  )

  watch(
    () => displayPages.value.length,
    (next, prev) => {
      if (next > (prev ?? 0)) {
        const lastPage = displayPages.value.at(-1)
        if (lastPage) previewPageNo.value = lastPage.pageNo
      }
    },
  )
  const scanProgress = computed(() => {
    if (!currentJob.value) return 0
    if (currentJob.value.reported) return 100
    if (currentJob.value.scannedPages === 0) return 0
    const uploadedRatio
      = currentJob.value.uploadedPages / Math.max(currentJob.value.scannedPages, 1)
    return Math.min(Math.round(12 + uploadedRatio * 84), 96)
  })
  const activeBackendBatch = computed(() => {
    const batch = kioskContext.value?.activeBatch
    return batch?.status === ACTIVE_SCAN_BATCH_STATUS ? batch : null
  })
  const activeBackendScanSession = computed(() => Boolean(activeBackendBatch.value))
  const hasOrphanBackendScanSession = computed(
    () => !currentJob.value && activeBackendScanSession.value,
  )
  const activeBackendBatchExternalNo = computed(() => {
    return activeBackendBatch.value?.batchExternalNo?.trim() || ''
  })
  const activeBackendScanSessionReason = computed(() => {
    if (!activeBackendBatch.value) return ''
    return kioskContext.value?.activeScanSessionReason
      || '当前设备在该考试下存在未结束扫描进程，请返回扫描进程继续处理或手动确认结束扫描'
  })
  const currentJobBlocksWorkspace = computed(() => {
    const status = currentJob.value?.status
    return Boolean(activeBackendScanSession.value || (status && status !== LocalScanJobStatusCode.REPORTED))
  })
  /** 扫描阶段失败且未产生任何可上传页：允许取消并清理，不应走重试上传。 */
  const isPreUploadScanFailure = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    if (job.status !== LocalScanJobStatusCode.FAILED) return false
    const uploadablePages = job.pages.filter((page) => page.status !== LocalScanPageStatusCode.DELETED).length
    return uploadablePages === 0 && job.scannedPages === 0 && job.uploadedPages === 0
  })
  const canCancelJob = computed(() => {
    if (!currentJob.value && activeBackendScanSession.value) return true
    const status = currentJob.value?.status
    return status === LocalScanJobStatusCode.CREATED
      || status === LocalScanJobStatusCode.SCANNING
      || status === LocalScanJobStatusCode.PAUSED
      || isPreUploadScanFailure.value
  })
  const canEndBatch = computed(() => {
    const status = currentJob.value?.status
    return status === LocalScanJobStatusCode.SCANNING || status === LocalScanJobStatusCode.PAUSED
  })
  const currentJobAllPagesUploadedButUnconfirmed = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const uploadablePages = visiblePages.value.filter((page) => page.status !== LocalScanPageStatusCode.DELETED)
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === LocalScanPageStatusCode.UPLOADED && Boolean(page.uploadedFileId),
    )
  })
  const canRemoveCurrentJob = computed(() => {
    const job = currentJob.value
    if (!job) return activeBackendScanSession.value
    if (job.reported) return true
    if (currentJobAllPagesUploadedButUnconfirmed.value) return false
    return ![
      LocalScanJobStatusCode.READYTOUPLOAD,
      LocalScanJobStatusCode.UPLOADING,
      LocalScanJobStatusCode.RETRYING,
    ].includes(job.status)
  })
  const removeCurrentJobTitle = computed(() => {
    if (!currentJob.value && activeBackendScanSession.value) {
      return '本机未找到扫描任务，结束后端未完成扫描进程并返回准备扫描'
    }
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
    if (isPreUploadScanFailure.value) return false
    const status = job.status
    if (
      status === LocalScanJobStatusCode.SCANNING
      || status === LocalScanJobStatusCode.PAUSED
      || status === LocalScanJobStatusCode.UPLOADING
      || status === LocalScanJobStatusCode.CANCELLED
      || status === LocalScanJobStatusCode.REPORTED
    ) {
      return false
    }
    const uploadablePages = job.pages.filter((page) => page.status !== LocalScanPageStatusCode.DELETED).length
    if (uploadablePages === 0 && job.scannedPages === 0) return false
    if (exceptionPages.value.length > 0) return true
    return [
      LocalScanJobStatusCode.FAILED,
      LocalScanJobStatusCode.RETRYING,
      LocalScanJobStatusCode.READYTOUPLOAD,
    ].includes(status)
  })
  const canRetryCommit = computed(() => {
    const job = currentJob.value
    if (!job || job.reported) return false
    const status = job.status
    if (
      status === LocalScanJobStatusCode.SCANNING
      || status === LocalScanJobStatusCode.PAUSED
      || status === LocalScanJobStatusCode.UPLOADING
      || status === LocalScanJobStatusCode.CANCELLED
      || status === LocalScanJobStatusCode.REPORTED
    ) {
      return false
    }
    const uploadablePages = visiblePages.value.filter((page) => page.status !== LocalScanPageStatusCode.DELETED)
    if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
    return uploadablePages.every(
      (page) => page.status === LocalScanPageStatusCode.UPLOADED && Boolean(page.uploadedFileId),
    )
  })
  const scanInfrastructureBlockedReason = computed(() => {
    if (kioskBootstrapPending.value && examId.value) {
      return '工作台初始化中，请稍候'
    }
    if (examBindingRequired.value) return '请先绑定本场扫描考试'
    if (!examId.value) return '当前工位未绑定考试'
    if (!localAgentReachable.value && (health.value?.bound || hasMarkScannerKioskAuth())) {
      return LOCAL_AGENT_UNAVAILABLE_ERROR
    }
    if (needsKioskBrowserSessionSync(health.value?.bound)) {
      return KIOSK_BROWSER_SESSION_SYNC_MESSAGE
    }
    if (!health.value?.bound) return '一体机未激活'
    if (health.value?.tokenResetRequired || health.value?.rebindRequired) return '一体机需要重新激活'
    if (health.value?.upgradeRequired) return '本机扫描组件需要升级'
    if (health.value?.updateStatus === AgentUpdateStatusCode.DOWNLOADING) return '本机扫描组件更新包下载中'
    if (health.value?.updateStatus === AgentUpdateStatusCode.INSTALLING) return '本机扫描组件安装中'
    if (health.value?.updateStatus === AgentUpdateStatusCode.FAILED) {
      return health.value.updateDiagnosticMessage.trim() || '本机扫描组件更新失败'
    }
    if (isScannerProbePending.value || needsScannerInventoryProbe()) return '扫描仪检测中，请稍候'
    if (!isLocalScannerConnected.value) return '本地扫描仪未连接'
    if (health.value.lastHeartbeatAt && !health.value.scanAllowed) return '系统暂未允许开始扫描'
    const capabilityScannerId = kioskContext.value?.capabilities?.localScannerId?.trim()
    if (!selectedScannerId.value && !capabilityScannerId) return '未检测到可用本地扫描仪'
    return ''
  })

  const directScanBlockedReason = computed(() => {
    const infra = scanInfrastructureBlockedReason.value
    if (infra) return infra
    if (activeBackendScanSession.value) return activeBackendScanSessionReason.value
    if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束'
    const context = kioskContext.value
    if (!context) return '工作台上下文未就绪'
    if (context.resumeAction === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER) {
      return context.pageRegisterDiagnostic
        || context.directBlockReason
        || context.blockReason
        || '上一批次页登记待重试，请先完成登记重试'
    }
    if (context.resumeAction === ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION) {
      return context.pageRegisterDiagnostic
        || context.directBlockReason
        || context.blockReason
        || '上一批次页登记不可恢复，请联系管理员处理'
    }
    if (context.canStartDirectScan !== true) {
      return context.directBlockReason
        || context.blockReason
        || '当前不允许首次扫描'
    }
    if (!context.device) return '考试未绑定可用扫描设备'
    if (!context.capabilities?.loaded) return '扫描仪能力未上报，请确认 Agent 心跳正常'
    if (!scanConfig.value.dpi) return '扫描参数未就绪，请刷新工作台'
    return ''
  })

  const supplementScanBlockedReason = computed(() => {
    const infra = scanInfrastructureBlockedReason.value
    if (infra) return infra
    if (activeBackendScanSession.value) return activeBackendScanSessionReason.value
    if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束'
    const context = kioskContext.value
    if (!context) return '工作台上下文未就绪'
    if (context.canStartSupplementScan !== true) {
      return context.supplementBlockReason || '当前不允许补扫'
    }
    if (!context.device) return '考试未绑定可用扫描设备'
    if (!context.capabilities?.loaded) return '扫描仪能力未上报，请确认 Agent 心跳正常'
    if (!scanConfig.value.dpi) return '扫描参数未就绪，请刷新工作台'
    return ''
  })

  const supplementLaunchFieldBlockedReason = computed(() => {
    if (!supplementTargetPageNo.value || supplementTargetPageNo.value <= 0) {
      return '补扫目标页号不能为空'
    }
    const pagesPerSheet = kioskContext.value?.taskContract?.pagesPerSheet
    if (pagesPerSheet != null && pagesPerSheet > 0 && supplementTargetPageNo.value > pagesPerSheet) {
      return `补扫目标页号必须在 1 到 ${pagesPerSheet} 之间`
    }
    if (!supplementReason.value.trim()) return '补扫原因不能为空'
    if (!supplementPaperInstanceId.value.trim()) return '补扫必须选择已绑定试卷'
    return ''
  })

  /** 选中补扫试卷后，优先取首缺页作为目标页号。 */
  function resolveSuggestedSupplementTargetPageNo(paperInstanceId: string): number {
    const paper = supplementBoundPapers.value.find((item) => item.paperInstanceId === paperInstanceId)
    const missingPages = paper?.missingTemplatePageNos?.filter((pageNo) => pageNo > 0) ?? []
    if (missingPages.length > 0) {
      return missingPages[0]
    }
    return 1
  }

  function selectSupplementPaper(paperInstanceId: string) {
    supplementPaperInstanceId.value = paperInstanceId
    supplementTargetPageNo.value = resolveSuggestedSupplementTargetPageNo(paperInstanceId)
  }
  const materialKindLabel = computed(() =>
    kioskMaterialKindLabel(kioskContext.value?.taskContract?.materialLayoutMode))
  const supplementBoundPapers = computed<ExamScannerBoundPaperItemVO[]>(
    () => kioskContext.value?.supplementBoundPapers ?? [],
  )
  const canStartDirectScan = computed(() => !directScanBlockedReason.value && !loading.value)
  const canStartSupplementScan = computed(
    () => !supplementScanBlockedReason.value && !loading.value,
  )
  const canStartScan = canStartDirectScan
  /** 就绪页状态条与 workState/uploadStage 读首次扫描门禁；对外仍暴露 scanBlockedReason 别名。 */
  const scanBlockedReason = directScanBlockedReason
  const canSwitchScanMode = computed(() => !currentJobBlocksWorkspace.value)
  /** 切换考试阻断原因；空字符串表示允许切换。上传中任务仍阻断；可取消任务在绑定时自动清理。 */
  const switchExamBlockedReason = computed(() => {
    if (kioskContext.value?.kioskLockEnabled && kioskContext.value?.kioskBoundExamId) {
      return '工位已锁定本场考试，请在 Web 端扫描设备管理中关闭「Kiosk 防误触锁」后再切换'
    }
    const job = currentJob.value
    if (!job) return ''
    const status = job.status
    if (status === LocalScanJobStatusCode.CANCELLED) {
      return '当前有已取消的扫描任务，请先删除任务后再切换考试'
    }
    if (isPreUploadScanFailure.value || canCancelJob.value) {
      return ''
    }
    if (status !== LocalScanJobStatusCode.REPORTED) {
      return '当前扫描任务未结束，不能切换考试'
    }
    return ''
  })
  const canSwitchExam = computed(() => !switchExamBlockedReason.value)
  const canSwitchScanner = computed(() => !currentJobBlocksWorkspace.value)
  const canActivateAgent = computed(
    () => !currentJobBlocksWorkspace.value && !isAgentWorkspaceBlocked(health.value),
  )
  const canDiscardLedgerPage = computed(() => !currentJobBlocksWorkspace.value)
  /** 未绑定考试时需进入独立 bind 路由（由 useKioskExamRouteGuard 处理跳转）。 */
  const needsExamBindingGate = computed(
    () => !examBindingBootstrapPending.value
      && !needsActivationGate.value
      && !kioskBrowserSessionSyncNeeded.value
      && hasActiveDeviceActivation()
      && !examId.value,
  )

  type DeviceReadinessTone = 'success' | 'danger' | 'warning'

  const deviceReadiness = computed((): {
    tone: DeviceReadinessTone
    statusText: string
    headline: string
    detail: string
    troubleshooting?: string
  } => {
    if (!localAgentReachable.value) {
      if (health.value?.bound || hasMarkScannerKioskAuth()) {
        return {
          tone: 'warning',
          statusText: '本机 Agent 未连接',
          headline: '本地扫描服务暂时不可用',
          detail: `${LOCAL_AGENT_UNAVAILABLE_ERROR}；服务恢复后会自动重连，无需重新激活。`,
        }
      }
      return {
        tone: 'warning',
        statusText: '本机 Agent 未连接',
        headline: '请先启动本机扫描服务',
        detail: LOCAL_AGENT_UNAVAILABLE_ERROR,
      }
    }
    if (needsActivationGate.value) {
      const reason = activationGateReason.value
      if (reason === KioskActivationGateReasonCode.REBIND_REQUIRED) {
        return {
          tone: 'danger',
          statusText: kioskActivationGateReasonLabel(reason),
          headline: '需要重新激活一体机',
          detail: '本机设备身份与平台记录不一致，请重新输入激活码（一次激活，三类采集共用）。',
        }
      }
      if (reason === KioskActivationGateReasonCode.TOKEN_RESET_REQUIRED) {
        return {
          tone: 'danger',
          statusText: kioskActivationGateReasonLabel(reason),
          headline: '需要重新激活一体机',
          detail: 'push_token 已变更，请重新输入激活码（一次激活，三类采集共用）。',
        }
      }
      return {
        tone: 'danger',
        statusText: reason === KioskActivationGateReasonCode.UNBOUND
          ? kioskActivationGateReasonLabel(reason)
          : '一体机未激活',
        headline: '请先激活本机扫描工位',
        detail: '设备激活与业务类型无关：完成一次激活后，考试扫描、考后归档、档案袋采集共用同一 push_token。',
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
        detail: '系统将引导至考试绑定页，选择本场考试并确认后进入工作台。',
      }
    }
    if (isScannerProbePending.value) {
      return {
        tone: 'warning',
        statusText: '扫描仪检测中',
        headline: '正在检测本机扫描仪',
        detail: '设备列表刷新中，请稍候…',
      }
    }
    if (needsScannerInventoryProbe()) {
      return {
        tone: 'warning',
        statusText: '扫描仪检测中',
        headline: '正在检测本机扫描仪',
        detail: '首次枚举本机扫描仪，请稍候…',
      }
    }
    if (!isLocalScannerConnected.value) {
      const catalogHint = scannerCatalogDiagnostic.value.trim()
      return {
        tone: 'danger',
        statusText: '扫描仪连接异常',
        headline: '扫描仪未连接',
        detail: catalogHint || '请检查 USB 连接与驱动，并在设备设置中刷新扫描仪列表。',
        troubleshooting: catalogHint
          ? `${catalogHint}；确认扫描仪电源已打开、驱动已安装，并退出其他占用扫描仪的软件后重试。`
          : '确认扫描仪电源已打开、USB 线牢固，并退出其他占用扫描仪的软件后重试。',
      }
    }
    if (health.value?.upgradeRequired || health.value?.updateStatus === AgentUpdateStatusCode.FAILED) {
      return {
        tone: 'warning',
        statusText: '扫描组件需处理',
        headline: '本机扫描组件需要升级或修复',
        detail: health.value.updateDiagnosticMessage?.trim() || scanBlockedReason.value || '请打开设备设置处理更新。',
      }
    }
    if (scanBlockedReason.value) {
      const noScanner = scanBlockedReason.value.includes('未检测到可用本地扫描仪')
      const catalogHint = scannerCatalogDiagnostic.value.trim()
      return {
        tone: 'warning',
        statusText: '暂不可开始扫描',
        headline: scanBlockedReason.value,
        detail: noScanner && catalogHint ? catalogHint : scanBlockedReason.value,
        troubleshooting: noScanner && catalogHint
          ? `${catalogHint}；可在设备设置中刷新扫描仪列表并选择可用设备。`
          : undefined,
      }
    }
    return {
      tone: 'success',
      statusText: '扫描仪连接正常',
      headline: '可以开始扫描',
      detail: '设备就绪，可以开始本批次扫描。',
    }
  })

  async function ensureKioskBrowserAuthSynced(): Promise<boolean> {
    return recoverKioskBrowserSession()
  }

  const workState = computed<KioskWorkState>(() => {
    const job = currentJob.value
    const status = job?.status
    if (status === LocalScanJobStatusCode.REPORTED) return { text: '已自动上传并提交批次', tone: 'success' }
    if (status === LocalScanJobStatusCode.FAILED) return { text: '存在失败项', tone: 'danger' }
    if (status === LocalScanJobStatusCode.CANCELLED) return { text: '已取消，待删除清理', tone: 'muted' }
    if (job && status === LocalScanJobStatusCode.PAUSED) {
      return { text: scanModeText(job.scanMode, '已暂停'), tone: 'running' }
    }
    if (job && status === LocalScanJobStatusCode.SCANNING && isWaitingForPaperFeed.value) {
      return { text: '等待放纸', tone: 'running' }
    }
    if (job) return { text: scanModeText(job.scanMode, '上传中'), tone: 'running' }
    if (scanWorkspaceBootstrapping.value) {
      return { text: '恢复批次中', tone: 'running' }
    }
    if (activeBackendScanSession.value) {
      if (!localAgentReachable.value) {
        return { text: '等待本机 Agent', tone: 'warning' }
      }
      return { text: '恢复批次中', tone: 'running' }
    }
    if (scanBlockedReason.value) return { text: '入口阻断', tone: 'danger' }
    return { text: `可开始${scanModeText(scanMode.value, '')}`, tone: 'success' }
  })

  const uploadStage = computed(() => {
    if (!currentJob.value) {
      if (scanWorkspaceBootstrapping.value) {
        return '正在恢复本机扫描任务与批次状态…'
      }
      if (activeBackendScanSession.value) {
        if (!localAgentReachable.value) {
          return '服务端批次已创建，本机 Agent 离线；恢复连接后将自动续扫，或使用底部「结束未完成进程」清理'
        }
        return activeBackendScanSessionReason.value || '正在恢复本地扫描任务…'
      }
      if (scanBlockedReason.value) return scanBlockedReason.value
      return '等待开始扫描'
    }
    if (currentJob.value.reported) return '批次已提交'
    if (currentJob.value.status === LocalScanJobStatusCode.CANCELLED) return '扫描已取消，请删除任务完成清理'
    if (currentJob.value.status === LocalScanJobStatusCode.FAILED) return currentJob.value.message || '扫描上传失败，等待重试'
    if (currentJob.value.status === LocalScanJobStatusCode.PAUSED) return '扫描已暂停'
    if (currentJob.value.status === LocalScanJobStatusCode.SCANNING) {
      if (isWaitingForPaperFeed.value) {
        return '进纸器无纸，请放入试卷后等待自动扫描'
      }
      if (currentJob.value.scannedPages === 0) return '正在扫描，等待首张影像…'
      return `正在扫描（${currentJob.value.scannedPages} 页）`
    }
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
    if (batch.scanMode !== ScannerKioskScanModeCode.SUPPLEMENT) return mode
    const replaceText = batch.replaceTargetPage ? '替换目标页' : '追加补扫'
    const targetText = batch.targetPageNo
      ? scanPageDisplayTitleByNoForDuplex(batch.targetPageNo, batch.scanConfig.duplexMode)
      : '未指定目标页'
    return `${mode} · ${replaceText} · ${targetText}`
  })

  const examTermText = computed(() => {
    const exam = kioskContext.value?.exam
    if (!exam) return ''
    const year = (exam.academicYear || '').trim()
    const semester = exam.semester
    if (!year && !semester) return ''
    const semesterLabel = semester ? getSemesterDescription(semester) : ''
    return [year, semesterLabel].filter(Boolean).join(' · ')
  })

  const declaredClassChips = computed(() => {
    const ctx = kioskContext.value
    if (!ctx) {
      const emptyChips: Array<{ key: string, label: string, missing: boolean }> = []
      return emptyChips
    }
    return ctx.classIds.map((classId, idx) => {
      const name = ctx.declaredClassNames[idx]
      const trimmed = name?.trim()
      return {
        key: classId,
        label: trimmed || `班级 ${classId}`,
        missing: !trimmed,
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

  function scanModeText(mode: ScannerKioskScanModeCode, suffix: string) {
    return `${strictEnumLabel(ScannerKioskScanModeDescription, mode, 'scanMode')}${suffix}`
  }

  function kioskActivationGateReasonLabel(reason: KioskActivationGateReasonCode): string {
    return strictEnumLabel(KioskActivationGateReasonDescription, reason, 'kioskActivationGateReason')
  }

  function agentHealthStatusLabel(status: AgentHealthStatusCode) {
    return strictEnumLabel(AgentHealthStatusDescription, status, '本地扫描服务状态')
  }

  function agentUpdateStatusLabel(status: AgentUpdateStatusCode) {
    return strictEnumLabel(AgentUpdateStatusDescription, status, '本地扫描组件更新状态')
  }

  function endpointOnlineStatusLabel(
    status: NonNullable<ExamScannerKioskContextVO['device']>['onlineStatus'],
  ) {
    return strictEnumLabel(ScannerEndpointOnlineStatusDescription, status, '扫描端点在线状态')
  }

  function scannerColorModeLabel(status: ScanColorMode) {
    return strictEnumLabel(ScannerColorModeDescription, status, '扫描色彩模式')
  }

  function scannerDuplexModeLabel(status: ScanDuplexMode) {
    return strictEnumLabel(ScannerDuplexModeDescription, status, '单面/双面扫描方式')
  }

  function localScanJobStatusText(status: LocalScanJobStatusCode) {
    return strictEnumLabel(LocalScanJobStatusDescription, status, '本地扫描任务状态')
  }

  function ledgerSourceText(source: ExamScannerLedgerDataSourceCode) {
    return strictEnumLabel(ExamScannerLedgerDataSourceDescription, source, '扫描账本来源')
  }

  function registrationStatusText(status: ExamScannerPageRegistrationStatusCode) {
    return strictEnumLabel(ExamScannerPageRegistrationStatusDescription, status, '扫描页登记状态')
  }

  function attentionTypeText(type: ScanAttentionTypeCode) {
    return strictEnumLabel(ScanAttentionTypeDescription, type, '扫描异常类型')
  }

  /** 将一体机诊断转为现场操作员可处理的扫描业务提示，避免展示底层接口或字段细节。 */
  function scannerDiagnosticText(diagnostic?: string) {
    const raw = diagnostic?.trim() ?? ''
    if (raw.includes('storage 上传 token 已过期') || raw.includes('storage 上传凭证续期失败')) {
      return '扫描页上传凭证已过期，系统正在自动续期并由后台自动重试上传，无需重新激活工位'
    }
    if (raw.includes('上传无进度超时') || raw.includes('上传整体超时')) {
      return '上传因长时间无进度已暂停，请点击「重试上传」后系统会重新发起上传'
    }
    return getUserErrorMessage(
      { message: diagnostic },
      '扫描处理异常，请按异常类型重新扫描、补扫或联系阅卷管理员处理',
    )
  }

  /** 从页级账本读取页登记阻断提示，供 commit 成功后向现场操作员显式告警。 */
  function resolvePageRegisterBlockMessage(): string | null {
    const ledger = pageLedger.value
    if (!ledger) {
      return null
    }
    const attention = ledger.attentionItems.find(item => item.attentionType === ScanAttentionTypeCode.PROCESSING_BLOCK)
    if (attention?.diagnostic) {
      return scannerDiagnosticText(attention.diagnostic)
    }
    const blockedPage = ledger.items.find(item => item.attentionType === ScanAttentionTypeCode.PROCESSING_BLOCK)
    if (blockedPage?.attentionMessage) {
      return scannerDiagnosticText(blockedPage.attentionMessage)
    }
    return null
  }

  function ledgerItemKey(item: { pageNo: number, sha256?: string, localPageId?: string }) {
    const batchNo = pageLedger.value?.batchExternalNo ?? ''
    const sha = item.sha256 ?? ''
    const pageNo = item.pageNo
    if (!Number.isFinite(pageNo)) {
      throw toUserError(null, '页级账本缺少页号')
    }
    const local = item.localPageId ?? ''
    return `${batchNo}#${pageNo}#${sha || local || 'nokey'}`
  }

  function formatTime(value?: string | null): string {
    return formatDateTimeWithSeconds(value)
  }

  function isEmptyFeederNoise(message: string) {
    return /无纸|等待放纸|进纸器无纸|paper empty|no paper|feeder empty/i.test(message)
  }

  function isScanCancelNoise(message: string) {
    return /扫描已取消|任务已取消|扫描未采集到页面|扫描未生成|未生成任何页面|TWAIN 扫描未/i.test(message)
  }

  function isMissingLocalScanJobMessage(message: string) {
    return /扫描任务不存在|scan job .* not found|job .* not found/i.test(message)
  }

  function handleError(error: unknown, fallback = '扫描一体机操作失败', force = false) {
    successMessage.value = ''
    if (error instanceof LocalAgentUnavailableError) {
      markLocalAgentDisconnected()
      errorMessage.value = error.message
      return
    }
    const message = getUserErrorMessage(error, fallback)
    if (!force && suppressScanCancelNotice && isScanCancelNoise(message)) {
      return
    }
    if (!force && isWaitingForPaperFeed.value && isEmptyFeederNoise(message)) {
      return
    }
    errorMessage.value = message
  }

  /** 本机 Agent 进程未监听时保留 bound 快照，避免误弹激活向导。 */
  function markLocalAgentDisconnected(): void {
    deviceActivation.markLocalAgentDisconnected()
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

  function clearReviewBatchAnchor() {
    lastReportedBatchExternalNo.value = ''
    lastPreviewScanJobId.value = ''
    lastPreviewScanJob.value = null
    pageRegisterBlocked.value = false
    pageRegisterPending.value = false
    pageRegisterDiagnostic.value = ''
  }

  /** 同步页登记状态，供 Review 阶段显式重试入口读取。 */
  function applyPageRegisterState(
    blocked?: boolean,
    pending?: boolean,
    diagnostic?: string | null,
  ) {
    pageRegisterBlocked.value = blocked === true
    pageRegisterPending.value = pending === true && blocked !== true
    const active = pageRegisterBlocked.value || pageRegisterPending.value
    pageRegisterDiagnostic.value = active ? (diagnostic?.trim() ?? '') : ''
  }

  /** 无 IN_PROGRESS 草稿时，将页登记重试锚点绑定到 latestBatch / pendingBatchId。 */
  function bindPageRegisterRetryBatchAnchor(context: ExamScannerKioskContextVO | null) {
    if (!context) {
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      return
    }
    if (context.resumeAction === ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION) {
      activeScanBatchId.value = context.pageRegisterPendingBatchId?.trim()
        || context.latestBatch?.scanBatchId?.trim()
        || ''
      activeBatchExternalNo.value = context.latestBatch?.batchExternalNo?.trim() || ''
      applyPageRegisterState(true, false, context.pageRegisterDiagnostic)
      return
    }
    const needsRetry = context.resumeAction === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER
      || context.pageRegisterPending === true
    if (!needsRetry) {
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      return
    }
    activeScanBatchId.value = context.pageRegisterPendingBatchId?.trim()
      || context.latestBatch?.scanBatchId?.trim()
      || ''
    activeBatchExternalNo.value = context.latestBatch?.batchExternalNo?.trim() || ''
    applyPageRegisterState(false, true, context.pageRegisterDiagnostic)
  }

  const canRetryPageRegister = computed(
    () => {
      if (!examId.value) return false
      const ctx = kioskContext.value
      const needsRetry = ctx?.resumeAction === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER
        || pageRegisterBlocked.value
        || pageRegisterPending.value
      if (!needsRetry) return false
      return Boolean(activeBatchExternalNo.value.trim() || activeScanBatchId.value)
    },
  )

  async function retryPageRegister() {
    if (!examId.value) {
      return
    }
    const workOrderBatchExternalNo = activeBatchExternalNo.value.trim()
    if (!workOrderBatchExternalNo && !activeScanBatchId.value) {
      return
    }
    pageRegisterRetryLoading.value = true
    errorMessage.value = ''
    try {
      if (workOrderBatchExternalNo) {
        const lifecycle = await retryExamScanWorkOrderPageRegister({
          examId: examId.value,
          batchExternalNo: workOrderBatchExternalNo,
        })
        applyPageRegisterState(
          lifecycle.pageRegisterBlocked,
          lifecycle.pageRegisterPending,
          lifecycle.pageRegisterDiagnostic,
        )
        if (lifecycle.pageRegisterBlocked) {
          errorMessage.value = `页登记仍被阻断：${pageRegisterDiagnostic.value || '请检查模板与页序配置'}`
          return
        }
        if (lifecycle.pageRegisterPending) {
          errorMessage.value = `页登记待重试：${pageRegisterDiagnostic.value || '请查看登记诊断'}`
          return
        }
        if (lifecycle.committedExamBatchId) {
          activeScanBatchId.value = String(lifecycle.committedExamBatchId)
        }
        applyPageRegisterState(false, false)
        successMessage.value = '页登记重试成功'
        await refreshPageLedger()
        await refreshKioskContext()
        return
      }
      const response = await retryKioskScanBatchPageRegister({
        examId: examId.value,
        scanBatchId: activeScanBatchId.value,
      })
      if (response.pageRegisterBlocked) {
        applyPageRegisterState(true, false, response.pageRegisterDiagnostic)
        errorMessage.value = `页登记仍被阻断：${pageRegisterDiagnostic.value || '请检查模板与页序配置'}`
        return
      }
      if (response.pageRegisterPending) {
        applyPageRegisterState(false, true, response.pageRegisterDiagnostic)
        errorMessage.value = `页登记待重试：${pageRegisterDiagnostic.value || '请查看登记诊断'}`
        return
      }
      applyPageRegisterState(false, false)
      successMessage.value = '页登记重试成功'
      await refreshPageLedger()
      await refreshKioskContext()
    } catch (error) {
      handleError(error, '页登记重试失败')
    } finally {
      pageRegisterRetryLoading.value = false
    }
  }

  /** 终态上报任务只保留复核预览快照，不能再占用当前扫描锚点。 */
  function snapshotReportedLocalJob(job: ScanJobResponse) {
    lastPreviewScanJobId.value = job.scanJobId
    lastPreviewScanJob.value = job
    if (job.batchExternalNo?.trim()) {
      lastReportedBatchExternalNo.value = job.batchExternalNo.trim()
    }
  }

  /** 恢复本地非终态任务时同步后端批次锚点，避免已存在 activeBatch 却被界面判定为尚未创建本机批次。 */
  function anchorRecoveredLocalJob(job: ScanJobResponse) {
    if (job.status === LocalScanJobStatusCode.REPORTED && job.reported) {
      snapshotReportedLocalJob(job)
      currentJob.value = null
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      return
    }
    currentJob.value = job
    activeBatchExternalNo.value = job.batchExternalNo
    const jobBatchId = job.scanBatchId?.trim()
    if (jobBatchId) {
      activeScanBatchId.value = jobBatchId
      return
    }
    const activeBatch = activeBackendBatch.value
    if (
      activeBatch?.scanBatchId
      && activeBatch.batchExternalNo?.trim() === job.batchExternalNo?.trim()
    ) {
      activeScanBatchId.value = activeBatch.scanBatchId
    }
  }

  /** 本地扫描任务已被删除或 agent 无法再找到时，同步关闭后端草稿批次并回到可重新开始扫描的工作台状态。 */
  async function reconcileMissingCurrentJob(message: string) {
    stopJobPolling()
    const missingScanJobId = currentJob.value?.scanJobId ?? lastPreviewScanJobId.value
    const shouldCloseBackendBatch = Boolean(getClosableBatchExternalNo() || activeBackendBatch.value?.scanBatchId)
    currentJob.value = null
    if (shouldCloseBackendBatch) {
      await closeActiveBatch(true)
    } else {
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
    }
    if (!missingScanJobId || lastPreviewScanJobId.value === missingScanJobId) {
      clearReviewBatchAnchor()
    }
    await refreshKioskContext()
    await refreshPageLedger()
    await recoverLocalScanJob()
    errorMessage.value = `${message}，请重新开始扫描`
  }

  function getActiveBatchExternalNo() {
    return (
      activeBatchExternalNo.value
      || currentJob.value?.batchExternalNo
      || activeBackendBatchExternalNo.value
      || lastReportedBatchExternalNo.value
      || ''
    )
  }

  /** 关闭/废弃批次时只认活跃会话锚点，避免误用已提交历史批次号触发工单状态冲突。 */
  function getClosableBatchExternalNo() {
    return (
      activeBatchExternalNo.value
      || currentJob.value?.batchExternalNo
      || activeBackendBatchExternalNo.value
      || ''
    )
  }

  function isWorkOrderDiscardConflictMessage(message: string) {
    return /不是可 discard|discard 冲突|commit 进行中/i.test(message)
  }

  /** 工单 discard 不可达时，按 activeBatch 主键直接废弃 IN_PROGRESS 草稿批次。 */
  async function discardActiveBackendBatchFallback(reason: string) {
    const activeBatch = activeBackendBatch.value
    if (!activeBatch?.scanBatchId) {
      throw toUserError(null, reason)
    }
    await discardScannerKioskBatch({
      scanBatchId: activeBatch.scanBatchId,
      discardReason: '取消并清理未提交扫描批次',
    })
  }

  /** 本批次已绑定学生查询锚点：准备阶段无活跃批次时返回空，避免挂上历史批次数据。 */
  const boundPaperScanBatchId = computed(() => {
    const job = currentJob.value ?? lastPreviewScanJob.value
    const jobBatchId = job?.scanBatchId?.trim()
    if (jobBatchId) return jobBatchId

    const anchoredBatchId = activeScanBatchId.value.trim()
    if (anchoredBatchId) return anchoredBatchId

    const latest = kioskContext.value?.latestBatch
    if (!latest?.scanBatchId) return ''

    const explicitBatchNo
      = activeBatchExternalNo.value
        || job?.batchExternalNo
        || lastReportedBatchExternalNo.value
        || ''
    if (explicitBatchNo) {
      const latestKey = latest.batchExternalNo || latest.batchNo || ''
      if (latestKey === explicitBatchNo) return latest.scanBatchId
      if (job && job.status !== LocalScanJobStatusCode.CANCELLED) return latest.scanBatchId
      return ''
    }

    if (job && job.status !== LocalScanJobStatusCode.CANCELLED) {
      return latest.scanBatchId
    }

    if (job && (job.status === LocalScanJobStatusCode.REPORTED || job.status === LocalScanJobStatusCode.FAILED)) {
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

  function syncPreferredScannerFromSetup() {
    const preferred = deviceActivation.setup.value?.preferredLocalScannerId?.trim()
    if (preferred) {
      agentPreferredLocalScannerId.value = preferred
    }
  }

  function openActivationModal() {
    deviceActivation.openManualActivation()
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
    return [
      LocalScanJobStatusCode.REPORTED,
      LocalScanJobStatusCode.CANCELLED,
      LocalScanJobStatusCode.FAILED,
    ].includes(job.status)
  }

  function isRecoverableLocalJob(job: ScanJobResponse) {
    return [
      LocalScanJobStatusCode.CREATED,
      LocalScanJobStatusCode.SCANNING,
      LocalScanJobStatusCode.PAUSED,
      LocalScanJobStatusCode.READYTOUPLOAD,
      LocalScanJobStatusCode.UPLOADING,
      LocalScanJobStatusCode.RETRYING,
      LocalScanJobStatusCode.FAILED,
    ].includes(job.status)
  }

  /** 从本地终态 REPORTED 任务恢复预览 scanJobId，供 Review 阶段 currentJob 为空时看图。 */
  function hydratePreviewScanJobId(jobs: ScanJobResponse[]) {
    const activeJobId = currentJob.value?.scanJobId?.trim()
    if (activeJobId) {
      lastPreviewScanJobId.value = activeJobId
      lastPreviewScanJob.value = currentJob.value
      return
    }
    const batchNo
      = pageLedger.value?.batchExternalNo?.trim()
        || lastReportedBatchExternalNo.value.trim()
        || activeBatchExternalNo.value.trim()
    if (!batchNo) return
    const deviceId = getActiveScannerDeviceId()
    const stationId = getActiveScannerStationId()
    const terminalJob = jobs.find((job) => {
      return (
        job.batchExternalNo === batchNo
        && job.status === LocalScanJobStatusCode.REPORTED
        && job.reported
        && job.examId === examId.value
        && job.scannerDeviceId === deviceId
        && job.scannerStationId === stationId
      )
    })
    if (terminalJob?.scanJobId) {
      snapshotReportedLocalJob(terminalJob)
    }
  }

  function shouldPollRecoveredJob(job: ScanJobResponse) {
    return [
      LocalScanJobStatusCode.CREATED,
      LocalScanJobStatusCode.SCANNING,
      LocalScanJobStatusCode.READYTOUPLOAD,
      LocalScanJobStatusCode.UPLOADING,
      LocalScanJobStatusCode.RETRYING,
      LocalScanJobStatusCode.FAILED,
    ].includes(job.status)
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

  // -------------------------------------------------------------
  // 数据刷新（Health / Scanners / KioskContext / ExamOptions）
  // -------------------------------------------------------------

  async function executeRefreshAll() {
    await refreshHealth()
    await refreshScanners()
    await syncAgentHealthAfterScannerProbe()
    if (isActivatedForMarkApis()) {
      const sessionReady = await ensureKioskBrowserAuthSynced()
      if (sessionReady) {
        await ensureKioskExamBindingBootstrap()
        if (examId.value) {
          await refreshKioskContext()
          await recoverLocalScanJob()
        }
      }
    }
  }

  async function refreshAll() {
    if (refreshAllPromise) {
      return refreshAllPromise
    }
    errorMessage.value = ''
    refreshAllInFlight.value = true
    refreshAllPromise = (async () => {
      try {
        await Promise.race([
          executeRefreshAll(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(new Error('设备状态刷新超时，请检查本机 Agent 与网关连接'))
            }, REFRESH_ALL_TIMEOUT_MS)
          }),
        ])
      } catch (error) {
        handleError(error)
      } finally {
        refreshAllInFlight.value = false
        refreshAllPromise = null
      }
    })()
    return refreshAllPromise
  }

  async function refreshHealth() {
    try {
      const previousBound = health.value?.bound
      const authReadyBefore = isActivatedForMarkApis()
      const wasUnreachable = !localAgentReachable.value
      await deviceActivation.refreshDeviceActivationState()
      syncPreferredScannerFromSetup()
      if (!localAgentReachable.value) {
        return
      }
      if (wasUnreachable) {
        await refreshScanners()
        await syncAgentHealthAfterScannerProbe()
      }
      else if (needsScannerInventoryProbe() && !scannerInventoryRefreshing.value) {
        await refreshScanners()
        await syncAgentHealthAfterScannerProbe()
      }
      if (previousBound && !health.value?.bound) {
        handleAgentBindingLost()
        return
      }
      if (health.value?.tokenResetRequired || health.value?.rebindRequired) {
        handleAgentBindingLost()
        return
      }
      const sessionReady = await ensureKioskBrowserAuthSynced()
      if (health.value?.bound && !sessionReady) {
        errorMessage.value = KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE
      }
      else {
        errorMessage.value = ''
      }
      if (health.value?.bound && sessionReady) {
        await ensureLiveStreamConnected()
        const authReadyAfter = isActivatedForMarkApis()
        if (authReadyAfter && !authReadyBefore) {
          await ensureKioskExamBindingBootstrap()
          if (needsExamBindingGate.value) {
            await loadBindExamCandidates().catch((error) => {
              handleError(error)
            })
          }
        }
      }
    }
    catch (error) {
      if (error instanceof LocalAgentUnavailableError) {
        markLocalAgentDisconnected()
        return
      }
      throw error
    }
  }

  async function syncAgentHealthAfterScannerProbe() {
    if (!localAgentReachable.value) {
      return
    }
    await deviceActivation.refreshDeviceActivationState()
  }

  function selectDefaultLocalScanner() {
    const available = availableScanners.value
    const current = selectedScannerId.value?.trim()
    const capabilityScannerId = kioskContext.value?.capabilities?.localScannerId?.trim()
    if (available.length === 0) {
      if (!current && capabilityScannerId) {
        selectedScannerId.value = capabilityScannerId
        lastStableScannerId = capabilityScannerId
      }
      return
    }
    if (current && available.some((scanner) => scanner.localScannerId === current)) {
      lastStableScannerId = current
      return
    }
    const preferred = agentPreferredLocalScannerId.value?.trim()
    const fallbackId = (preferred && available.some((scanner) => scanner.localScannerId === preferred)
      ? preferred
      : available[0].localScannerId)
    if (!current || !canSwitchScanner.value) {
      selectedScannerId.value = fallbackId
      lastStableScannerId = fallbackId
      return
    }
    selectedScannerId.value = fallbackId
    lastStableScannerId = fallbackId
  }

  /** 上下文能力快照与 Agent 列表对齐本地扫描仪选择，避免阻塞态下 selectedScannerId 为空。 */
  function syncScannerSelectionFromContext() {
    selectDefaultLocalScanner()
  }

  async function refreshScanners() {
    scannerInventoryRefreshing.value = true
    try {
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
      scannerCatalogDiagnostic.value = response.catalogDiagnostic?.trim() || ''
      selectDefaultLocalScanner()
    } finally {
      scannerInventoryRefreshing.value = false
    }
  }

  /** 准备扫描页进入时补齐设备枚举，并回读 health 对齐 scannerConnected。 */
  async function ensureScannerInventoryReady(): Promise<boolean> {
    if (isLocalScannerConnected.value) {
      selectDefaultLocalScanner()
      return Boolean(selectedScannerId.value || isLocalScannerConnected.value)
    }
    if (!localAgentReachable.value || !health.value?.bound) {
      return false
    }
    if (scannerInventoryEnsurePromise) {
      return scannerInventoryEnsurePromise
    }
    scannerInventoryEnsurePromise = (async () => {
      try {
        await refreshScanners()
        await syncAgentHealthAfterScannerProbe()
        selectDefaultLocalScanner()
        return isLocalScannerConnected.value
      } finally {
        scannerInventoryEnsurePromise = null
      }
    })()
    return scannerInventoryEnsurePromise
  }

  function clampScanConfigToOptions(
    config: ExamScannerScanConfigVO,
    options: ExamScannerScanConfigOptionsVO,
  ): ExamScannerScanConfigVO | null {
    const allowedDpis = options.allowedDpis
    const colorModes = options.colorModes
    const duplexModes = options.duplexModes
    const defaultConfig = options.defaultScanConfig
    if (allowedDpis.length === 0) {
      showFormValidationMessage('扫描仪未上报可用分辨率')
      return null
    }
    if (colorModes.length === 0) {
      showFormValidationMessage('扫描参数缺少色彩模式选项')
      return null
    }
    if (duplexModes.length === 0) {
      showFormValidationMessage('扫描参数缺少单面/双面扫描选项')
      return null
    }
    if (!defaultConfig?.dpi || !defaultConfig.colorMode || !defaultConfig.duplexMode) {
      showFormValidationMessage('扫描参数缺少服务端默认建议值')
      return null
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
      const clamped = clampScanConfigToOptions(options.defaultScanConfig, options)
      if (!clamped) {
        errorMessage.value = '扫描参数契约不完整'
        return
      }
      scanConfig.value = clamped
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '扫描参数契约不完整'
      return
    }
    scanConfigSourceExamId.value = examId.value
  }

  /** 从 kiosk 上下文同步租户 OCR 直扫链路，供一体机参数区展示与开单冻结。 */
  function applyTenantProviderChainFromScanConfigOptions(
    options?: ExamScannerScanConfigOptionsVO | null,
  ) {
    providerChain.value = options?.directScanProviderChain
  }

  function clearRegisterStatePoll() {
    if (registerStatePollTimer !== undefined) {
      window.clearInterval(registerStatePollTimer)
      registerStatePollTimer = undefined
    }
    registerStatePollStartedAt = 0
  }

  /** A3：非空非法 pageRegisterState / resumeAction 显式失败，禁止灰色兜底。 */
  function validateKioskRegisterContract(context: ExamScannerKioskContextVO) {
    const registerState = context.latestBatch?.pageRegisterState
    if (registerState != null) {
      strictEnumLabel(PageRegisterStateDescription, registerState, 'pageRegisterState')
    }
    const action = context.resumeAction
    if (action != null) {
      strictEnumLabel(ScannerKioskResumeActionDescription, action, 'resumeAction')
    }
  }

  /** latestBatch.pageRegisterState 为 null 时轮询上下文，最多 15s。 */
  function syncRegisterStatePoll() {
    const batch = kioskContext.value?.latestBatch
    const needsPoll = batch != null && batch.pageRegisterState == null
    if (!needsPoll) {
      clearRegisterStatePoll()
      return
    }
    if (registerStatePollTimer !== undefined) {
      return
    }
    registerStatePollStartedAt = Date.now()
    registerStatePollTimer = window.setInterval(() => {
      void (async () => {
        if (Date.now() - registerStatePollStartedAt > REGISTER_STATE_POLL_TIMEOUT_MS) {
          clearRegisterStatePoll()
          showUserError(new Error('登记状态计算超时'), '登记状态计算超时，请刷新设备状态')
          return
        }
        if (!examId.value) {
          clearRegisterStatePoll()
          return
        }
        const scannerDeviceId = getActiveScannerDeviceId()
        const scannerStationId = getActiveScannerStationId()
        if (!scannerDeviceId || !scannerStationId) {
          return
        }
        try {
          const context = await getScannerKioskContext({
            examId: examId.value,
            scannerDeviceId,
            scannerStationId,
            scanMode: scanMode.value,
          })
          validateKioskRegisterContract(context)
          kioskContext.value = context
          if (!activeBackendBatch.value) {
            bindPageRegisterRetryBatchAnchor(context)
          }
          if (context.latestBatch?.pageRegisterState != null) {
            clearRegisterStatePoll()
          }
        } catch (error) {
          clearRegisterStatePoll()
          showUserError(error, '登记状态刷新失败')
        }
      })()
    }, REGISTER_STATE_POLL_INTERVAL_MS)
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
    try {
      validateKioskRegisterContract(kioskContext.value)
    } catch (error) {
      showUserError(error, '扫描上下文契约异常')
    }
    const activeBatch = activeBackendBatch.value
    if (activeBatch) {
      activeBatchExternalNo.value = activeBatch.batchExternalNo
      activeScanBatchId.value = activeBatch.scanBatchId
      if (activeBatch.scanMode === ScannerKioskScanModeCode.SUPPLEMENT) {
        supplementTargetPageNo.value = activeBatch.targetPageNo
        supplementReason.value = activeBatch.supplementReason ?? ''
        supplementReplaceTargetPage.value = Boolean(activeBatch.replaceTargetPage)
        if (activeBatch.paperInstanceId) {
          supplementPaperInstanceId.value = activeBatch.paperInstanceId
        }
      }
    } else {
      bindPageRegisterRetryBatchAnchor(kioskContext.value)
    }
    const activeBatchConfig = activeBackendBatch.value?.scanConfig
    const scanConfigOptions = kioskContext.value.scanConfigOptions
    if (activeBatchConfig && scanConfigOptions) {
      try {
        const clamped = clampScanConfigToOptions(activeBatchConfig, scanConfigOptions)
        if (!clamped) {
          errorMessage.value = '扫描参数契约不完整'
        } else {
          scanConfig.value = clamped
          scanConfigSourceExamId.value = examId.value
        }
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '扫描参数契约不完整'
      }
    } else if (scanConfigOptions) {
      applyExamRecommendedScanConfig()
    }
    applyTenantProviderChainFromScanConfigOptions(scanConfigOptions)
    examBindingRequired.value = Boolean(kioskContext.value?.examBindingRequired)
    syncScannerSelectionFromContext()
    await refreshBoundPapers()
    syncRegisterStatePoll()
  }

  const providerChainOptions = computed(() => {
    const tenantChain = kioskContext.value?.scanConfigOptions?.directScanProviderChain
    const all = [
      {
        value: DirectScanProviderChainCode.BAIDU_QWEN,
        label: '云端 AI',
        description: '百度 OCR + 千问版面切题，适合云端部署',
      },
      {
        value: DirectScanProviderChainCode.PADDLE_LOCAL,
        label: '本地 Paddle',
        description: 'PaddleOCR 整页识别与切题，适合一体机离线',
      },
    ]
    if (tenantChain) {
      return all.filter((option) => option.value === tenantChain)
    }
    return all
  })

  const tenantProviderChainLabel = computed(
    () => kioskContext.value?.scanConfigOptions?.directScanProviderChainLabel?.trim() || '',
  )

  function selectProviderChain(chain: DirectScanProviderChainCode) {
    providerChain.value = chain
  }

  function providerChainText(chain: DirectScanProviderChainCode | undefined): string {
    const apiLabel = kioskContext.value?.scanConfigOptions?.directScanProviderChainLabel?.trim()
    if (apiLabel) return apiLabel
    if (chain) {
      return strictEnumLabel(DirectScanProviderChainDescription, chain, '直扫识别链路')
    }
    return '租户 OCR 未启用'
  }

  function resolveStartScanProviderChain(): DirectScanProviderChainCode | undefined {
    if (businessScene.value !== ScannerBusinessSceneCode.EXAM_DIRECT_SCAN) {
      return undefined
    }
    return providerChain.value
  }

  async function loadKioskBootstrap() {
    if (!isActivatedForMarkApis()) {
      examBindingRequired.value = false
      return false
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      return false
    }
    const bootstrap = await getScannerKioskBootstrap({
      scannerDeviceId,
      scannerStationId,
    })
    examBindingRequired.value = Boolean(bootstrap.examBindingRequired)
    stationBoundExamId.value = bootstrap.kioskBoundExamId
      ? String(bootstrap.kioskBoundExamId)
      : ''
    if (!bootstrap.kioskBoundExamId) {
      examId.value = ''
    }
    return true
  }

  /** bind 页预填：优先当前会话已确认考试，其次工位服务端绑定。 */
  function resolveBindExamPrefillExamId(): string {
    if (examId.value.trim()) {
      return examId.value.trim()
    }
    if (stationBoundExamId.value.trim()) {
      return stationBoundExamId.value.trim()
    }
    const contextBoundExamId = kioskContext.value?.kioskBoundExamId?.trim()
    return contextBoundExamId || ''
  }

  /** 工位 auth 与设备身份就绪后拉取 bootstrap，并结束绑定向导 bootstrap 门控。 */
  async function ensureKioskExamBindingBootstrap(): Promise<void> {
    if (needsActivationGate.value) {
      examBindingBootstrapPending.value = false
      return
    }
    if (!isActivatedForMarkApis()) {
      return
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      return
    }
    try {
      await loadKioskBootstrap()
    } catch (error) {
      handleError(error)
      if (!examId.value) {
        examBindingRequired.value = true
      }
    } finally {
      examBindingBootstrapPending.value = false
    }
  }

  async function releaseLocalSessionBeforeExamBind(targetExamId: string) {
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      return
    }
    const job = currentJob.value
    if (!job) {
      if (
        activeBackendScanSession.value
        && examId.value
        && examId.value !== targetExamId
        && activeBackendBatchExternalNo.value
      ) {
        await discardExamScanWorkOrder({
          batchExternalNo: activeBackendBatchExternalNo.value,
          examId: examId.value,
          scannerDeviceId,
          scannerStationId,
          discardPendingPages: true,
        })
      }
      return
    }
    if (job.examId === targetExamId) {
      return
    }
    if (job.status === LocalScanJobStatusCode.CANCELLED) {
      await deleteScanJob(job.scanJobId)
      currentJob.value = null
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      clearReviewBatchAnchor()
      return
    }
    if (!canCancelJob.value) {
      throw toUserError(null, switchExamBlockedReason.value || '当前扫描任务未结束，不能切换考试')
    }
    stopJobPolling()
    suppressScanCancelNotice = true
    try {
      const oldExamId = job.examId
      await cancelScanJob(job.scanJobId)
      await discardExamScanWorkOrder({
        batchExternalNo: job.batchExternalNo,
        examId: oldExamId,
        scannerDeviceId,
        scannerStationId,
        discardPendingPages: true,
      })
      if (isPreUploadScanFailure.value) {
        await deleteScanJob(job.scanJobId)
        currentJob.value = null
      } else {
        currentJob.value = await getScanJob(job.scanJobId)
      }
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      clearReviewBatchAnchor()
    } finally {
      suppressScanCancelNotice = false
    }
  }

  async function bindKioskExam(targetExamId: string) {
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      throw toUserError(null, '扫描设备身份缺失，无法绑定考试')
    }
    const boundExamId = kioskContext.value?.kioskBoundExamId
    const lockBlockReason = switchExamBlockedReason.value
    if (
      lockBlockReason
      && boundExamId
      && boundExamId !== targetExamId
    ) {
      errorMessage.value = lockBlockReason
      showUserError(null, lockBlockReason)
      throw toUserError(null, lockBlockReason)
    }
    loading.value = true
    activationErrorMessage.value = ''
    errorMessage.value = ''
    try {
      await releaseLocalSessionBeforeExamBind(targetExamId)
      const bootstrap = await bindScannerKioskExam({
        examId: targetExamId,
        scannerDeviceId,
        scannerStationId,
      })
      examBindingRequired.value = Boolean(bootstrap.examBindingRequired)
      if (bootstrap.kioskBoundExamId) {
        examId.value = bootstrap.kioskBoundExamId
        stationBoundExamId.value = bootstrap.kioskBoundExamId
      }
      await refreshKioskContext()
      await loadBindExamCandidates()
      successMessage.value = '扫描考试已绑定到本工位'
      closeExamSwitchGate()
    } catch (error) {
      handleError(error, '绑定扫描考试失败', true)
      showUserError(error, '绑定扫描考试失败')
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

  async function executeLoadBindExamCandidates() {
    bindExamCandidateLoadIssue.value = ''
    if (!isActivatedForMarkApis()) {
      bindExamCandidates.value = []
      bindExamCandidateTotal.value = 0
      if (hasActiveDeviceActivation()) {
        bindExamCandidateLoadIssue.value = '扫描工位凭证未就绪，请完成激活或重新同步本机会话'
      }
      return
    }
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    if (!scannerDeviceId || !scannerStationId) {
      bindExamCandidates.value = []
      bindExamCandidateTotal.value = 0
      bindExamCandidateLoadIssue.value = '扫描设备身份缺失，无法加载可绑定考试'
      errorMessage.value = bindExamCandidateLoadIssue.value
      return
    }
    const sessionReady = await ensureKioskBrowserAuthSynced()
    if (!sessionReady) {
      bindExamCandidates.value = []
      bindExamCandidateTotal.value = 0
      bindExamCandidateLoadIssue.value = KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE
      errorMessage.value = bindExamCandidateLoadIssue.value
      return
    }
    const request: ExamScannerKioskBindExamCandidatePageRequest = {
      scannerDeviceId,
      scannerStationId,
      pageNum: bindExamCandidateFilter.pageNum,
      pageSize: bindExamCandidateFilter.pageSize,
    }
    const keyword = bindExamCandidateFilter.keyword.trim()
    if (keyword) request.keyword = keyword
    const academicYear = bindExamCandidateFilter.academicYear.trim()
    if (academicYear) request.academicYear = academicYear
    if (bindExamCandidateFilter.semester) request.semester = bindExamCandidateFilter.semester
    if (bindExamCandidateFilter.classId) request.classId = bindExamCandidateFilter.classId
    const result = await pageScannerKioskBindExamCandidates(request)
    bindExamCandidates.value = result.list
    bindExamCandidateFilter.pageNum = result.pageNum
    bindExamCandidateFilter.pageSize = result.pageSize
    bindExamCandidateTotal.value = result.total
  }

  async function loadBindExamCandidates() {
    if (bindExamCandidateLoadPromise) {
      return bindExamCandidateLoadPromise
    }
    bindExamCandidateLoading.value = true
    bindExamCandidateLoadPromise = (async () => {
      try {
        await Promise.race([
          executeLoadBindExamCandidates(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(new Error('可扫描考试列表加载超时，请检查本机 Agent 与网关连接后刷新'))
            }, BIND_EXAM_CANDIDATE_LOAD_TIMEOUT_MS)
          }),
        ])
      } catch (error) {
        bindExamCandidateLoadIssue.value = getUserErrorMessage(error, '可绑定考试列表加载失败')
        showUserError(error, '可绑定考试列表加载失败')
        bindExamCandidates.value = []
        bindExamCandidateTotal.value = 0
      } finally {
        bindExamCandidateLoading.value = false
        bindExamCandidateLoadPromise = null
      }
    })()
    return bindExamCandidateLoadPromise
  }

  function openExamSwitchGate() {
    const reason = switchExamBlockedReason.value
    if (reason) {
      errorMessage.value = reason
      return
    }
    resetBindExamCandidateFilter()
    examSwitchGateOpen.value = true
    void loadBindExamCandidates()
  }

  function closeExamSwitchGate() {
    examSwitchGateOpen.value = false
  }

  function resetBindExamCandidateFilter() {
    bindExamCandidateFilter.keyword = ''
    bindExamCandidateFilter.academicYear = ''
    bindExamCandidateFilter.semester = undefined
    bindExamCandidateFilter.classId = undefined
    bindExamCandidateFilter.pageNum = 1
    bindExamCandidateFilter.pageSize = KIOSK_BIND_EXAM_CANDIDATE_PAGE_SIZE
  }

  function changeBindExamCandidatePage(pageNum: number) {
    if (pageNum < 1) return
    const pageSize = bindExamCandidateFilter.pageSize || KIOSK_BIND_EXAM_CANDIDATE_PAGE_SIZE
    const maxPage = Math.max(1, Math.ceil(bindExamCandidateTotal.value / pageSize))
    bindExamCandidateFilter.pageNum = Math.min(pageNum, maxPage)
    loadBindExamCandidates().catch((error) => {
      handleError(error)
    })
  }

  function onBindExamCandidateSearch(value: string) {
    bindExamCandidateFilter.keyword = (value || '').trim()
    bindExamCandidateFilter.pageNum = 1
    if (examSelectSearchDebounce) window.clearTimeout(examSelectSearchDebounce)
    examSelectSearchDebounce = window.setTimeout(() => {
      loadBindExamCandidates().catch((error) => {
        handleError(error)
      })
    }, 300)
  }

  function refreshBindExamCandidatesByUser() {
    loadBindExamCandidates().catch((error) => {
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
      batchHistoryList.value = result.list
      batchHistoryFilter.pageNum = result.pageNum
      batchHistoryFilter.pageSize = result.pageSize
      batchHistoryTotal.value = result.total
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
  async function viewBatchHistoryLedger(item: ExamScannerBatchResponse): Promise<void> {
    historyLedgerBatch.value = item
    historyLedgerSnapshot.value = null
    historyLedgerError.value = ''
    historyLedgerLoading.value = true
    try {
      if (!item.scannerStationId) {
        historyLedgerError.value = '历史批次缺少扫描站点信息，无法查询账本'
        return
      }

      historyLedgerSnapshot.value = await fetchPagedHistoryLedgerSnapshot({
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
      currentJob.value && currentJob.value.status !== LocalScanJobStatusCode.REPORTED,
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
      anchorRecoveredLocalJob(recoverableJob)
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
        const pendingCount = activeBackendBatch.value?.pendingUploadCount ?? 0
        if (pendingCount > 0) {
          errorMessage.value = `服务端仍有 ${pendingCount} 页待提交，请恢复本地扫描任务；如需放弃请使用「结束未完成进程」`
          return
        }
        try {
          await closeActiveBatch(false)
          await refreshKioskContext()
          await refreshPageLedger()
          successMessage.value = '已清理服务端空扫描批次，可重新开始扫描'
        } catch (error) {
          handleError(error, '清理服务端空扫描批次失败')
        }
      }
      return
    }
    anchorRecoveredLocalJob(recoverableJob)
    if (shouldPollRecoveredJob(recoverableJob)) {
      startJobPolling(recoverableJob.scanJobId)
    }
    successMessage.value = '已恢复本地未完成扫描任务'
  }

  // -------------------------------------------------------------
  // 模式切换 / 补扫准备
  // -------------------------------------------------------------

  async function changeScanMode(mode: ScannerKioskScanModeCode) {
    if (scanMode.value === mode) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能切换扫描模式'
      return
    }
    scanMode.value = mode
    businessScene.value = resolveBusinessSceneFromScanMode()
    if (mode !== ScannerKioskScanModeCode.SUPPLEMENT) {
      supplementTargetPageNo.value = undefined
      supplementReason.value = ''
      supplementReplaceTargetPage.value = false
      supplementPaperInstanceId.value = ''
    }
    errorMessage.value = ''
    await refreshKioskContext()
  }

  // -------------------------------------------------------------
  // 扫描任务 lifecycle
  // -------------------------------------------------------------

  function resolveLifecycleScanSource(
    lifecycle: ScanWorkOrderLifecycleVO,
    context: ExamScannerKioskContextVO,
  ): ({
    ok: true
    scanMode: ScannerKioskScanModeCode
    targetPageNo?: number
    supplementReason?: string
    paperInstanceId?: string
    replaceTargetPage: boolean
  } | {
    ok: false
    errorMessage: string
  }) {
    if (!lifecycle.examScanMode) {
      return {
        ok: false,
        errorMessage: '扫描工单缺少扫描模式，已阻断本地扫描启动',
      }
    }
    if (
      lifecycle.declaredClassIds
      && !sameOrderedStringList(lifecycle.declaredClassIds, context.classIds)
    ) {
      return {
        ok: false,
        errorMessage: '扫描工单班级范围与当前考试不一致，请重新启动扫描',
      }
    }
    if (lifecycle.examScanMode !== ScannerKioskScanModeCode.SUPPLEMENT) {
      return { ok: true, scanMode: lifecycle.examScanMode, replaceTargetPage: false }
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
    const paperInstanceId = lifecycle.paperInstanceId != null
      ? String(lifecycle.paperInstanceId).trim()
      : ''
    if (!paperInstanceId) {
      return {
        ok: false,
        errorMessage: '补扫任务缺少目标试卷，已阻断本地扫描启动',
      }
    }
    if (lifecycle.replaceTargetPage == null) {
      return {
        ok: false,
        errorMessage: '补扫任务缺少替换策略，已阻断本地扫描启动',
      }
    }
    return {
      ok: true,
      scanMode: lifecycle.examScanMode,
      targetPageNo: lifecycle.targetPageNo,
      supplementReason: reason,
      paperInstanceId,
      replaceTargetPage: lifecycle.replaceTargetPage,
    }
  }

  async function ensureScanningWorkspaceReady(): Promise<boolean> {
    if (currentJob.value) {
      return true
    }
    if (!isActivatedForMarkApis()) {
      return false
    }
    scanWorkspaceBootstrapping.value = true
    try {
      await recoverLocalScanJob()
      if (currentJob.value) {
        return true
      }
      if (activeBackendScanSession.value) {
        await refreshKioskContext()
        await recoverLocalScanJob()
      }
      return Boolean(currentJob.value)
    } finally {
      scanWorkspaceBootstrapping.value = false
    }
  }

  async function prepareSupplementLaunch(): Promise<boolean> {
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能开启补扫'
      return false
    }
    scanMode.value = ScannerKioskScanModeCode.SUPPLEMENT
    businessScene.value = resolveBusinessSceneFromScanMode()
    supplementTargetPageNo.value = 1
    supplementReason.value = ''
    supplementReplaceTargetPage.value = false
    supplementPaperInstanceId.value = ''
    errorMessage.value = ''
    loading.value = true
    try {
      await refreshKioskContext()
      if (kioskContext.value?.canStartSupplementScan !== true) {
        errorMessage.value = kioskContext.value?.supplementBlockReason || '当前不允许补扫'
        return false
      }
      const firstPaper = supplementBoundPapers.value[0]
      if (firstPaper?.paperInstanceId) {
        selectSupplementPaper(firstPaper.paperInstanceId)
      }
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function cancelSupplementLaunch(): Promise<void> {
    if (scanMode.value === ScannerKioskScanModeCode.DIRECT) {
      supplementTargetPageNo.value = undefined
      supplementReason.value = ''
      supplementReplaceTargetPage.value = false
      supplementPaperInstanceId.value = ''
      return
    }
    scanMode.value = ScannerKioskScanModeCode.DIRECT
    businessScene.value = resolveBusinessSceneFromScanMode()
    supplementTargetPageNo.value = undefined
    supplementReason.value = ''
    supplementReplaceTargetPage.value = false
    supplementPaperInstanceId.value = ''
    await refreshKioskContext()
  }

  async function startDirectScan(): Promise<boolean> {
    if (!canStartDirectScan.value) {
      errorMessage.value = directScanBlockedReason.value || '当前不允许首次扫描'
      return false
    }
    if (scanMode.value !== ScannerKioskScanModeCode.DIRECT) {
      scanMode.value = ScannerKioskScanModeCode.DIRECT
      businessScene.value = resolveBusinessSceneFromScanMode()
      supplementTargetPageNo.value = undefined
      supplementReason.value = ''
      supplementReplaceTargetPage.value = false
      supplementPaperInstanceId.value = ''
      await refreshKioskContext()
    }
    applyExamRecommendedScanConfig()
    return submitScanJob()
  }

  async function startSupplementScan(): Promise<boolean> {
    const fieldBlock = supplementLaunchFieldBlockedReason.value
    if (fieldBlock) {
      errorMessage.value = fieldBlock
      return false
    }
    if (!canStartSupplementScan.value) {
      errorMessage.value = supplementScanBlockedReason.value || '当前不允许补扫'
      return false
    }
    if (scanMode.value !== ScannerKioskScanModeCode.SUPPLEMENT) {
      scanMode.value = ScannerKioskScanModeCode.SUPPLEMENT
      businessScene.value = resolveBusinessSceneFromScanMode()
      await refreshKioskContext()
    }
    return submitScanJob()
  }

  async function submitScanJob(): Promise<boolean> {
    if (!kioskContext.value) return false
    await refreshKioskContext()
    if (!kioskContext.value) return false
    if (activeBackendScanSession.value) {
      errorMessage.value = activeBackendScanSessionReason.value
      return false
    }
    const isSupplement = scanMode.value === ScannerKioskScanModeCode.SUPPLEMENT
    const modeBlockedReason = isSupplement
      ? supplementScanBlockedReason.value || supplementLaunchFieldBlockedReason.value
      : directScanBlockedReason.value
    if (modeBlockedReason) {
      errorMessage.value = modeBlockedReason
      return false
    }
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = '当前扫描任务未结束，不能新建扫描'
      return false
    }
    const agentContextSnapshot = kioskContext.value
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    resetBusyState()
    clearReviewBatchAnchor()
    const scannerDeviceId = getActiveScannerDeviceId()
    const scannerStationId = getActiveScannerStationId()
    try {
      if (!scannerDeviceId) {
        errorMessage.value = '考试扫描设备缺失，无法创建扫描批次'
        return false
      }
      if (!scannerStationId) {
        errorMessage.value = '考试扫描站点缺失，无法创建扫描批次'
        return false
      }
      const batchLifecycle = await startExamScanWorkOrder({
        examId: examId.value,
        scannerDeviceId,
        scannerStationId,
        declaredClassIds: kioskContext.value.classIds,
        examScanMode: scanMode.value,
        targetPageNo: isSupplement ? supplementTargetPageNo.value : undefined,
        supplementReason: isSupplement ? supplementReason.value.trim() || undefined : undefined,
        replaceTargetPage: isSupplement ? supplementReplaceTargetPage.value : false,
        paperInstanceId: isSupplement ? supplementPaperInstanceId.value.trim() || undefined : undefined,
        scanConfig: { ...scanConfig.value },
        providerChain: resolveStartScanProviderChain(),
      })
      if (!batchLifecycle.batchExternalNo) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少批次编号，无法启动本地扫描',
        )
        return false
      }
      const rawScanBatchId = batchLifecycle.scanBatchId
      if (rawScanBatchId == null || String(rawScanBatchId).trim() === '') {
        await handleScanJobStartFailure(
          null,
          '扫描工单创建结果缺少批次 ID，无法启动本地扫描',
        )
        return false
      }
      activeBatchExternalNo.value = batchLifecycle.batchExternalNo
      activeScanBatchId.value = String(rawScanBatchId).trim()
      if (!batchLifecycle.reportId) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少扫描报告 ID，无法启动本地扫描',
        )
        return false
      }
      activeReportId.value = batchLifecycle.reportId
      activeResolvedScanConfig.value = batchLifecycle.resolvedScanConfig ?? null
      if (!batchLifecycle.resolvedScanConfig) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少冻结扫描参数，无法启动本地扫描',
        )
        return false
      }
      const lifecycleScanSource = resolveLifecycleScanSource(batchLifecycle, kioskContext.value)
      if (!lifecycleScanSource.ok) {
        await handleScanJobStartFailure(null, lifecycleScanSource.errorMessage)
        return false
      }
      currentJob.value = await startScanJob({
        context: agentContextSnapshot,
        taskKind: ScanTaskKindCode.EXAM_MARKING,
        localScannerId: selectedScannerId.value,
        batchExternalNo: batchLifecycle.batchExternalNo,
        reportId: batchLifecycle.reportId,
        businessScene: businessScene.value,
        businessRefId: examId.value,
        providerChain: resolveStartScanProviderChain(),
        outputContainerFormat: ScannerOutputContainerFormat.PDF,
        pageImageFormat: ScannerPageImageFormat.PNG,
        blankPagePolicy: ScannerBlankPagePolicyCode.BACK_BLANK,
        expectedPages: isSupplement ? 1 : undefined,
        scanMode: lifecycleScanSource.scanMode,
        targetPageNo: lifecycleScanSource.targetPageNo,
        supplementReason: lifecycleScanSource.supplementReason,
        replaceTargetPage: lifecycleScanSource.replaceTargetPage,
        resolvedScanConfig: batchLifecycle.resolvedScanConfig,
      })
      await refreshPageLedger()
      await refreshKioskContext()
      startJobPolling(currentJob.value.scanJobId)
      return true
    } catch (error) {
      await handleScanJobStartFailure(error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function cancelCurrentJob() {
    if (!currentJob.value) {
      if (activeBackendScanSession.value) {
        await discardOrphanActiveBatch()
      }
      return
    }
    if (!canCancelJob.value) {
      errorMessage.value = '当前任务已进入上传链路，不能取消'
      return
    }
    const job = currentJob.value
    const cleanupFailedScan = isPreUploadScanFailure.value
    stopJobPolling()
    loading.value = true
    successMessage.value = ''
    errorMessage.value = ''
    suppressScanCancelNotice = true
    try {
      await cancelScanJob(job.scanJobId)
      await closeActiveBatch(true)
      if (cleanupFailedScan) {
        await deleteScanJob(job.scanJobId)
        currentJob.value = null
        activeBatchExternalNo.value = ''
        activeScanBatchId.value = ''
        clearReviewBatchAnchor()
      } else {
        currentJob.value = await getScanJob(job.scanJobId)
      }
      await refreshKioskContext()
      await refreshPageLedger()
    } catch (error) {
      const message = getUserErrorMessage(error, '取消扫描任务失败')
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      handleError(error, '取消扫描任务失败', true)
    } finally {
      suppressScanCancelNotice = false
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
      const message = getUserErrorMessage(error)
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function pauseCurrentJob() {
    if (!currentJob.value) return
    if (currentJob.value.status !== LocalScanJobStatusCode.SCANNING) {
      errorMessage.value = '当前任务不在采集阶段，不能暂停'
      return
    }
    loading.value = true
    errorMessage.value = ''
    try {
      currentJob.value = await pauseScanJob(currentJob.value.scanJobId)
      successMessage.value = '当前任务已暂停'
    } catch (error) {
      const message = getUserErrorMessage(error, '暂停扫描任务失败')
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      handleError(error, '暂停扫描任务失败', true)
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
      const message = getUserErrorMessage(error)
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
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
      const message = getUserErrorMessage(error)
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function commitCurrentJobViaBrowser(job: ScanJobResponse) {
    const config = activeResolvedScanConfig.value
    if (!config) {
      throw toUserError(null, '缺少冻结扫描参数，无法通过浏览器提交批次')
    }
    if (!activeReportId.value.trim()) {
      throw toUserError(null, '缺少扫描报告 ID，无法通过浏览器提交批次')
    }
    const uploadedPages = job.pages
      .filter((page) => page.status !== LocalScanPageStatusCode.DELETED && page.uploadedFileId)
      .slice()
      .sort((left, right) => left.pageNo - right.pageNo)
    if (uploadedPages.length === 0) {
      throw toUserError(null, '没有已上传页面，无法提交批次')
    }
    const sourceFileIds = uploadedPages.map((page) => page.uploadedFileId as string)
    const scanStartTime = uploadedPages[0]?.capturedAt
    const scanEndTime = uploadedPages.at(-1)?.uploadedAt ?? uploadedPages.at(-1)?.capturedAt
    if (!scanStartTime || !scanEndTime) {
      throw toUserError(null, '扫描页缺少时间信息，无法通过浏览器提交批次')
    }
    const lifecycle = await commitExamScanWorkOrder({
      batchExternalNo: job.batchExternalNo,
      examId: job.examId,
      reportId: activeReportId.value,
      declaredClassIds: job.declaredClassIds,
      examScanMode: job.scanMode,
      targetPageNo: job.targetPageNo,
      supplementReason: job.supplementReason,
      replaceTargetPage: job.replaceTargetPage,
      pageCount: uploadedPages.length,
      sourceFileIds,
      dpi: config.dpi,
      colorMode: config.colorMode,
      duplexMode: config.duplexMode,
      scanStartTime,
      scanEndTime,
      scanSessionId: job.batchExternalNo,
      businessRefId: examId.value,
      providerChain: providerChain.value,
    })
    if (lifecycle.committedExamBatchId) {
      activeScanBatchId.value = String(lifecycle.committedExamBatchId)
    }
    if ((lifecycle.pageRegisterBlocked || lifecycle.pageRegisterPending) && lifecycle.batchExternalNo) {
      activeBatchExternalNo.value = lifecycle.batchExternalNo
    } else {
      activeBatchExternalNo.value = ''
    }
    activeReportId.value = ''
    activeResolvedScanConfig.value = null
    currentJob.value = null
    await refreshKioskContext()
    await refreshPageLedger()
    applyPageRegisterState(
      lifecycle.pageRegisterBlocked,
      lifecycle.pageRegisterPending,
      lifecycle.pageRegisterDiagnostic,
    )
    if (lifecycle.pageRegisterBlocked) {
      errorMessage.value = `批次已提交，但自动页登记被阻断：${lifecycle.pageRegisterDiagnostic ?? '请在复核页重试页登记'}`
    } else if (lifecycle.pageRegisterPending) {
      successMessage.value = '批次已提交，页登记处理中，可在复核页重试页登记'
    } else {
      successMessage.value = KIOSK_BATCH_SUBMITTED_HINT
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
      if (error instanceof LocalAgentUnavailableError && currentJob.value) {
        await commitCurrentJobViaBrowser(currentJob.value)
        return
      }
      const message = getUserErrorMessage(error)
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      if (currentJob.value && currentJobAllPagesUploadedButUnconfirmed.value) {
        try {
          await commitCurrentJobViaBrowser(currentJob.value)
          return
        } catch (browserCommitError) {
          handleError(browserCommitError, '浏览器提交批次失败')
          return
        }
      }
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function removeCurrentScanJob() {
    if (!currentJob.value) {
      if (activeBackendScanSession.value) {
        await discardOrphanActiveBatch()
      }
      return
    }
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
      const reason = await promptInputAsync({
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
        clearReviewBatchAnchor()
        successMessage.value = '已废弃扫描批次并清理本地扫描任务'
        currentJob.value = null
        await refreshKioskContext()
        await refreshPageLedger()
      } catch (error) {
        const message = getUserErrorMessage(error)
        if (isMissingLocalScanJobMessage(message)) {
          await reconcileMissingCurrentJob(message)
          return
        }
        handleError(error)
      } finally {
        loading.value = false
      }
      return
    }
    const confirmed = await confirmAsync({
      title: '确认删除未上报任务',
      content: `确认删除尚未上报的扫描任务 ${job.scanJobId}？该操作只清理本地扫描任务，并关闭当前扫描工作台记录。`,
      type: 'warning',
      okText: '删除',
    })
    if (!confirmed) return
    loading.value = true
    try {
      if (getActiveBatchExternalNo()) {
        await closeActiveBatch(true)
      }
      await deleteScanJob(job.scanJobId)
      successMessage.value = '已删除本地扫描任务'
      currentJob.value = null
      await refreshKioskContext()
      await refreshPageLedger()
    } catch (error) {
      const message = getUserErrorMessage(error)
      if (isMissingLocalScanJobMessage(message)) {
        await reconcileMissingCurrentJob(message)
        return
      }
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  async function discardLedgerPage(item: { localPageId?: string, pageNo: number }) {
    if (!Number.isFinite(item.pageNo)) {
      throw toUserError(null, '页级账本缺少页号')
    }
    if (!canDiscardLedgerPage.value) {
      errorMessage.value = '当前扫描任务未结束，不能废弃已落库扫描页'
      return
    }
    if (pageLedger.value?.dataSource !== ExamScannerLedgerDataSourceCode.DATABASE || !item.localPageId) {
      errorMessage.value = '仅已落库扫描页支持单页废弃'
      return
    }
    const pageTitle = scanPageDisplayTitleByNo(item.pageNo)
    const reason = await promptInputAsync({
      title: `废弃${pageTitle}`,
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
      content: `确认废弃${pageTitle}？该页将不再参与切片识别 / 归档。`,
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
    errorMessage.value = ''
    successMessage.value = ''
    const ok = await deviceActivation.activateDevice({
      guard: () => resolveKioskActivationGuardMessage({
        health: health.value,
        currentJobBlocksWorkspace: currentJobBlocksWorkspace.value,
      }),
      onSuccess: async (activation) => {
        await router.replace({
          query: {
            ...route.query,
            scannerDeviceId: activation.scannerDeviceId,
            scannerStationId: activation.scannerStationId,
          },
        })
        await refreshAll()
        await ensureLiveStreamConnected()
        successMessage.value = '一体机已激活'
      },
    })
    if (!ok && deviceActivation.activationErrorMessage.value) {
      handleError(null, deviceActivation.activationErrorMessage.value)
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

  function stopJobPolling() {
    if (jobTimer) {
      window.clearInterval(jobTimer)
      jobTimer = undefined
    }
    jobPollFailureCount = 0
  }

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
          const terminalJob = currentJob.value
          stopJobPolling()
          try {
            await handleTerminalBatchClosure(terminalJob)
          } catch (error) {
            if (!suppressScanCancelNotice) {
              handleError(error, '扫描批次收口失败')
            }
          }
        }
      } catch (error) {
        const message = getUserErrorMessage(error, '扫描任务状态刷新失败')
        if (isMissingLocalScanJobMessage(message)) {
          await reconcileMissingCurrentJob(message)
          return
        }
        jobPollFailureCount += 1
        if (jobPollFailureCount >= 3) {
          if (jobTimer) window.clearInterval(jobTimer)
          jobTimer = undefined
          errorMessage.value = '扫描任务状态连续刷新失败，请检查本机扫描组件连接后手动刷新'
        }
        handleError(error, '扫描任务状态刷新失败')
      }
    }, 1500)
  }

  async function closeActiveBatch(discardPendingPages: boolean) {
    const batchExternalNo = getClosableBatchExternalNo()
    if (!batchExternalNo) {
      const activeBatch = activeBackendBatch.value
      if (activeBatch?.scanBatchId && discardPendingPages) {
        await discardActiveBackendBatchFallback('当前扫描任务缺少批次外部号，无法关闭批次')
        activeBatchExternalNo.value = ''
        activeScanBatchId.value = ''
        return
      }
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
    let lifecycle: ScanWorkOrderLifecycleVO
    try {
      lifecycle = await discardExamScanWorkOrder({
        batchExternalNo,
        examId: examId.value,
        scannerDeviceId,
        scannerStationId,
        discardPendingPages,
      })
    } catch (error) {
      const message = getUserErrorMessage(error, '关闭扫描批次失败')
      if (discardPendingPages && isWorkOrderDiscardConflictMessage(message)) {
        await discardActiveBackendBatchFallback(message)
        activeBatchExternalNo.value = ''
        activeScanBatchId.value = ''
        return
      }
      throw error
    }
    if (!discardPendingPages) {
      if (
        typeof lifecycle.pendingPageCount !== 'number'
        || !Number.isFinite(lifecycle.pendingPageCount)
      ) {
        throw toUserError(null, '扫描批次关闭结果异常')
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

  /** 处理后端存在 IN_PROGRESS 批次但本机 Agent 没有任务的孤儿扫描进程，避免阻断新批次创建。 */
  async function discardOrphanActiveBatch() {
    const confirmed = await confirmAsync({
      title: '结束未完成扫描进程',
      content: '本机未找到对应扫描任务。确认结束当前未完成扫描进程并返回准备扫描？',
      type: 'warning',
      okText: '结束进程',
    })
    if (!confirmed) return
    stopJobPolling()
    loading.value = true
    successMessage.value = ''
    errorMessage.value = ''
    try {
      await closeActiveBatch(true)
      currentJob.value = null
      clearReviewBatchAnchor()
      await refreshKioskContext()
      await refreshPageLedger()
      await recoverLocalScanJob()
      successMessage.value = '已结束未完成扫描进程，可以重新开始扫描'
    } catch (error) {
      handleError(error, '结束未完成扫描进程失败', true)
    } finally {
      loading.value = false
    }
  }

  async function handleTerminalBatchClosure(job: ScanJobResponse) {
    activeBatchExternalNo.value = job.batchExternalNo || activeBatchExternalNo.value
    if (job.status === LocalScanJobStatusCode.REPORTED && job.reported) {
      // Agent 逐页 commit 已将草稿转为 RECEIVED 并清理 Redis 锚点，不能再调 discard。
      snapshotReportedLocalJob(job)
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
      currentJob.value = null
      await refreshKioskContext()
      await refreshPageLedger()
      await recoverLocalScanJob()
      const firstBrowsablePage = displayPages.value[0]
      if (firstBrowsablePage) {
        previewPageNo.value = firstBrowsablePage.pageNo
      }
      const pageRegisterBlockMessage = job.pageRegisterBlocked
        ? scannerDiagnosticText(job.pageRegisterDiagnostic || job.message)
        : resolvePageRegisterBlockMessage()
      applyPageRegisterState(
        job.pageRegisterBlocked || Boolean(pageRegisterBlockMessage),
        job.pageRegisterPending,
        job.pageRegisterDiagnostic || pageRegisterBlockMessage,
      )
      if (job.pageRegisterPending) {
        successMessage.value = '批次已提交，页登记处理中，可在复核页重试页登记'
      } else if (pageRegisterBlockMessage) {
        errorMessage.value = `批次已上传，但自动页登记被阻断：${pageRegisterBlockMessage}。请在复核页重试页登记。`
        successMessage.value = ''
      } else {
        successMessage.value = KIOSK_BATCH_SUBMITTED_HINT
      }
      return
    }
    if (job.status === LocalScanJobStatusCode.CANCELLED) {
      try {
        if (getActiveBatchExternalNo()) {
          await closeActiveBatch(true)
        }
      } catch {
        // cancelCurrentJob 可能已关闭批次，重复收口不再提示。
      }
      await refreshKioskContext()
      await refreshPageLedger()
      return
    }
    if (job.status === LocalScanJobStatusCode.FAILED) {
      const uploadablePages = job.pages.filter((page) => page.status !== LocalScanPageStatusCode.DELETED)
      const allPagesUploaded
        = uploadablePages.length > 0
          && job.uploadedPages > 0
          && uploadablePages.every(
            (page) => page.status === LocalScanPageStatusCode.UPLOADED && Boolean(page.uploadedFileId),
          )
      if (uploadablePages.length === 0 && job.scannedPages === 0) {
        if (!suppressScanCancelNotice) {
          errorMessage.value = '扫描未采集到页面，请点击取消清理任务后重新开始'
        }
      } else {
        errorMessage.value = allPagesUploaded
          ? '扫描提交未完成，已保留中间页，请点击重试提交'
          : '扫描上传未完成，已保留中间页，请点击重试上传或删除任务'
      }
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
        if (job.status === LocalScanJobStatusCode.FAILED) {
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

  watch(
    () => [
      localAgentReachable.value,
      health.value?.bound,
      health.value?.diagnosticMessage,
      isLocalScannerConnected.value,
    ],
    () => {
      if (!needsScannerInventoryProbe() || scannerInventoryRefreshing.value) {
        return
      }
      void ensureScannerInventoryReady().catch((error) => {
        handleError(error)
      })
    },
    { immediate: true },
  )

  watch(needsExamBindingGate, (show) => {
    if (!show) return
    resetBindExamCandidateFilter()
    void loadBindExamCandidates().catch((error) => {
      handleError(error)
    })
  })

  watch(
    () => route.name,
    (routeName) => {
      if (routeName === SCANNER_EXAM_BIND_ROUTE) {
        examId.value = ''
      }
    },
    { immediate: true },
  )

  watch(examId, (newVal, oldVal) => {
    if (newVal === oldVal) return
    if (restoringExamId) return
    if (currentJobBlocksWorkspace.value) {
      errorMessage.value = switchExamBlockedReason.value || '当前扫描任务未结束，不能切换考试'
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
    clearReviewBatchAnchor()
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
      resetLedgerCache()
      refreshPageLedger({ forceFull: true }).catch((error) => {
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
    await deviceActivation.syncActivationFormFromAgent()
    try {
      await refreshAll()
      if (!needsActivationGate.value) {
        await ensureLiveStreamConnected()
      }
    } finally {
      if (examBindingBootstrapPending.value) {
        await ensureKioskExamBindingBootstrap()
      }
      kioskBootstrapPending.value = false
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
    clearRegisterStatePoll()
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
    scannerCatalogDiagnostic,
    selectedScannerId,
    kioskContext,
    boundPapers,
    boundPapersLoading,
    boundPapersError,
    boundPaperScanBatchId,
    boundPaperSummary,
    pageRegisterBlocked,
    pageRegisterPending,
    pageRegisterDiagnostic,
    pageRegisterRetryLoading,
    canRetryPageRegister,
    currentJob,
    previewScanJob,
    reviewScanJob,
    isWaitingForPaperFeed,
    isPreUploadScanFailure,
    loading,
    refreshAllInFlight,
    errorMessage,
    successMessage,
    activationModalOpen: manualActivationGateOpen,
    deviceActivation,
    activationModalForced,
    activationErrorMessage,
    previewPageNo,
    scanMode,
    businessScene,
    providerChain,
    providerChainOptions,
    tenantProviderChainLabel,
    selectProviderChain,
    providerChainText,
    supplementTargetPageNo,
    supplementReason,
    supplementReplaceTargetPage,
    supplementPaperInstanceId,
    materialKindLabel,
    supplementBoundPapers,
    scanConfig,
    activationForm,
    examId,
    stationBoundExamId,
    resolveBindExamPrefillExamId,
    examBindingRequired,
    examSwitchGateOpen,
    workbenchTab,
    deviceReadiness,
    activationGateReason,
    needsActivationGate,
    needsExamBindingGate,
    bindExamCandidates,
    bindExamCandidateTotal,
    bindExamCandidateLoading,
    bindExamCandidateLoadIssue,
    bindExamCandidateFilter,

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
    isLocalScannerConnected,
    isScannerProbePending,
    isDeviceRefreshing,
    scannerInventoryRefreshing,
    selectedBindExamCandidate,
    selectedScanner,
    visiblePages,
    displayPages,
    displayScannedCount,
    displayUploadedCount,
    exceptionPages,
    previewImageUrl,
    previewLoadError,
    scanProgress,
    activeBackendBatch,
    activeBackendScanSession,
    hasOrphanBackendScanSession,
    activeBackendBatchExternalNo,
    activeBackendScanSessionReason,
    scanWorkspaceBootstrapping,
    kioskBootstrapPending,
    examBindingBootstrapPending,
    currentJobBlocksWorkspace,
    canCancelJob,
    canEndBatch,
    canRetryUpload,
    canRetryCommit,
    canRemoveCurrentJob,
    currentJobAllPagesUploadedButUnconfirmed,
    removeCurrentJobTitle,
    scanBlockedReason: directScanBlockedReason,
    directScanBlockedReason,
    supplementScanBlockedReason,
    supplementLaunchFieldBlockedReason,
    switchExamBlockedReason,
    canStartScan,
    canStartDirectScan,
    canStartSupplementScan,
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
    scanPageDisplayTitle,
    scanPageDisplayTitleByNo,
    scanPageDisplayTitleByNoForDuplex,
    localScanJobStatusText,
    ledgerSourceText,
    registrationStatusText,
    attentionTypeText,
    scannerDiagnosticText,
    ledgerItemKey,
    formatTime,

    // ---- 数据刷新 ----
    refreshAll,
    ensureScannerInventoryReady,
    refreshScannersByUser,
    refreshPageLedger,
    refreshBoundPapers,
    onManualRefreshLedger,
    loadBindExamCandidates,
    resetBindExamCandidateFilter,
    bindKioskExam,
    openExamSwitchGate,
    closeExamSwitchGate,
    onBindExamCandidateSearch,
    refreshBindExamCandidatesByUser,
    changeBindExamCandidatePage,

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
    ensureScanningWorkspaceReady,
    prepareSupplementLaunch,
    cancelSupplementLaunch,
    selectSupplementPaper,
    resolveSuggestedSupplementTargetPageNo,
    startDirectScan,
    startSupplementScan,
    submitScanJob,
    cancelCurrentJob,
    retryCurrentUpload,
    pauseCurrentJob,
    resumeCurrentJob,
    endCurrentBatch,
    retryCurrentCommit,
    retryPageRegister,
    removeCurrentScanJob,
    discardLedgerPage,

    // ---- 预览 ----
    onPreviewImageLoadError,

    // ---- Agent 操作 ----
    activateAgent,
    installAgentUpdatePackage,
    openActivationModal,
  }
}

export type ExamKioskWorkflow = ReturnType<typeof useExamKioskWorkflow>

// -------------------------------------------------------------
// 模块级 helper
// -------------------------------------------------------------

function queryValue(value: LocationQueryValue | LocationQueryValue[]) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : ''
  return typeof value === 'string' ? value.trim() : ''
}

function isCountableLedgerPage(status?: ExamScannerPageRegistrationStatusCode) {
  return status !== ExamScannerPageRegistrationStatusCode.DISCARDED
    && status !== ExamScannerPageRegistrationStatusCode.SUPERSEDED
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
