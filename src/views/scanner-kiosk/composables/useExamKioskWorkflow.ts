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

type KioskWorkStateTone = 'success' | 'running' | 'danger' | 'muted'

interface KioskWorkState {
  text: string
  tone: KioskWorkStateTone
}
import type {
  AgentHealthStatusCode,
  LocalScanPageSide,
  ScanJobListResponse,
  ScanJobResponse,
  ScannerDeviceInfo,
  ScannerListResponse,
} from '@/apis/mark/scanner-agent-local'
import type {
  ExamScannerBatchResponse,
  ExamScannerBoundPaperItemVO,
  ExamScannerKioskBatchHistoryRequest,
  ExamScannerKioskContextVO,
  ExamScannerKioskExamOptionRequest,
  ExamScannerKioskExamOptionVO,
  ExamScannerPageLedgerVO,
  ExamScannerScanConfigOptionsVO,
  ExamScannerScanConfigVO,
} from '@/apis/mark/scanner-kiosk'
import type { ScanWorkOrderLifecycleVO } from '@/apis/mark/scanner-work-order'
import type { SemesterCode } from '@/types/enums'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ScannerColorModeCode,
  ScannerColorModeDescription,
  ScannerDuplexModeCode,
  ScannerDuplexModeDescription,
  ScannerEndpointOnlineStatusDescription,
} from '@/apis/mark/exam-mark-scanner'
import { ScanAttentionTypeCode, ScanAttentionTypeDescription } from '@/apis/mark/exam-scan'
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
  pageScannerKioskBatchHistory,
  pageScannerKioskExamOptions,
  retryKioskScanBatchPageRegister,
  ScannerKioskScanModeCode,
  ScannerKioskScanModeDescription,
} from '@/apis/mark/scanner-kiosk'
import { commitExamScanWorkOrder, discardExamScanWorkOrder, startExamScanWorkOrder } from '@/apis/mark/scanner-work-order'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { getSemesterDescription, SemesterOptions } from '@/types/enums'
import { ExamScannerPageUploadStatusCode } from '@/types/enums/exam-scanner-page-upload-status-enum'
import {
  KioskActivationGateReasonCode,
  KioskActivationGateReasonDescription,
} from '@/types/enums/kiosk-activation-gate-reason-enum'
import { ScanBatchStatusCode } from '@/types/enums/scan-batch-status-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
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
} from '@/utils/kiosk-auth'
import {
  kioskMaterialKindLabel,
  kioskScanModeAdvisory,
  resolveKioskClassScopeAdvisory,
  resolveKioskScanMaterialAdvisory,
} from '@/utils/scanner-kiosk-ui'
import { strictEnumLabel } from '@/utils/strict-enum'
import { fetchPagedHistoryLedgerSnapshot } from '@/views/scanner-kiosk/composables/ledgerMerge'
import { useKioskDeviceActivation } from '@/views/scanner-kiosk/composables/useKioskDeviceActivation'
import {
  isAgentWorkspaceBlocked,
  resolveKioskActivationGuardMessage,
} from '@/views/scanner-kiosk/utils/kioskActivationGuard'

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
  pageSide: LocalScanPageSide
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
  /** 自动页登记阻断态：commit 成功后批次已收件但页登记未完成。 */
  const pageRegisterBlocked = ref(false)
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
  const examSwitchGateOpen = ref(false)
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
    pageSize: 50,
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

  const selectedExamOption = computed<ExamScannerKioskExamOptionVO | null>(
    () => examOptions.value.find((item) => item.examId === examId.value) ?? null,
  )
  const availableScanners = computed(() => scanners.value.filter((item) => item.available))
  const selectedScanner = computed(() =>
    scanners.value.find((item) => item.localScannerId === selectedScannerId.value),
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
    const pageSide: LocalScanPageSide = isBack ? 'BACK' : 'FRONT'
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
  const scanBlockedReason = computed(() => {
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
    if (!health.value?.scannerConnected) return '本地扫描仪未连接'
    if (health.value.lastHeartbeatAt && !health.value.scanAllowed) return '系统暂未允许开始扫描'
    if (!selectedScannerId.value) return '未检测到可用本地扫描仪'
    if (!kioskContext.value) return '考试扫描上下文未加载'
    if (activeBackendScanSession.value) return activeBackendScanSessionReason.value
    if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束'
    if (!kioskContext.value.canStartScan) return kioskContext.value.blockReason
    if (scanMode.value === ScannerKioskScanModeCode.SUPPLEMENT) {
      if (!kioskContext.value.canStartSupplementScan) {
        return kioskContext.value.supplementBlockReason
      }
      if (!supplementTargetPageNo.value || supplementTargetPageNo.value <= 0) {
        return '补扫目标页号不能为空'
      }
      if (!supplementReason.value.trim()) return '补扫原因不能为空'
      if (!supplementPaperInstanceId.value.trim()) return '补扫必须选择已绑定试卷'
    }
    if (!kioskContext.value.device) return '考试未绑定可用扫描设备'
    if (!kioskContext.value.capabilities?.loaded) return '扫描仪能力未上报，请确认 Agent 心跳正常'
    if (!scanConfig.value.dpi) return '请选择扫描分辨率'
    return ''
  })
  const scanModeAdvisory = computed(() => kioskScanModeAdvisory(scanMode.value))
  const materialKindLabel = computed(() =>
    kioskMaterialKindLabel(kioskContext.value?.taskContract?.materialLayoutMode))
  const scanMaterialAdvisory = computed(() =>
    resolveKioskScanMaterialAdvisory(kioskContext.value?.taskContract))
  const classScopeAdvisory = computed(() =>
    resolveKioskClassScopeAdvisory(kioskContext.value?.classIds))
  const supplementBoundPapers = computed<ExamScannerBoundPaperItemVO[]>(
    () => kioskContext.value?.supplementBoundPapers ?? [],
  )
  const canStartScan = computed(() => !scanBlockedReason.value && !loading.value)
  const canSwitchScanMode = computed(() => !currentJobBlocksWorkspace.value)
  /** 切换考试阻断原因；空字符串表示允许切换。 */
  const switchExamBlockedReason = computed(() => {
    if (kioskContext.value?.kioskLockEnabled && kioskContext.value?.kioskBoundExamId) {
      return '工位已锁定本场考试，请在 Web 端扫描设备管理中关闭「Kiosk 防误触锁」后再切换'
    }
    if (currentJobBlocksWorkspace.value) {
      const status = currentJob.value?.status
      if (status === LocalScanJobStatusCode.CANCELLED) {
        return '当前有已取消的扫描任务，请先删除任务后再切换考试'
      }
      if (isPreUploadScanFailure.value) {
        return '当前扫描失败且无页面，请先取消并清理后再切换考试'
      }
      if (activeBackendScanSession.value) {
        return activeBackendScanSessionReason.value
      }
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
  const needsExamBindingGate = computed(
    () => !needsActivationGate.value && hasActiveDeviceActivation() && !examId.value,
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
        detail: '请在绑定向导中搜索并选择本场考试，确认后进入工作台。',
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
    if (health.value?.upgradeRequired || health.value?.updateStatus === AgentUpdateStatusCode.FAILED) {
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
        headline: scanBlockedReason.value,
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
    if (scanBlockedReason.value) return { text: '入口阻断', tone: 'danger' }
    return { text: `可开始${scanModeText(scanMode.value, '')}`, tone: 'success' }
  })

  const uploadStage = computed(() => {
    if (!currentJob.value) return '等待扫描'
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
      throw toUserError(null, '页级账本缺少页号，请刷新后重试')
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
    pageRegisterDiagnostic.value = ''
  }

  /** 同步页登记阻断态，供 Review 阶段显式重试入口读取。 */
  function applyPageRegisterBlockState(blocked?: boolean, diagnostic?: string | null) {
    pageRegisterBlocked.value = blocked === true
    pageRegisterDiagnostic.value = blocked === true ? (diagnostic?.trim() ?? '') : ''
  }

  const canRetryPageRegister = computed(
    () =>
      pageRegisterBlocked.value
      && Boolean(examId.value)
      && Boolean(activeScanBatchId.value),
  )

  async function retryPageRegister() {
    if (!examId.value || !activeScanBatchId.value) {
      return
    }
    pageRegisterRetryLoading.value = true
    errorMessage.value = ''
    try {
      const response = await retryKioskScanBatchPageRegister({
        examId: examId.value,
        scanBatchId: activeScanBatchId.value,
      })
      if (response.pageRegisterBlocked) {
        applyPageRegisterBlockState(true, response.pageRegisterDiagnostic)
        errorMessage.value = `页登记仍被阻断：${pageRegisterDiagnostic.value || '请检查模板与页序配置'}`
        return
      }
      applyPageRegisterBlockState(false)
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
    const shouldCloseBackendBatch = Boolean(getActiveBatchExternalNo())
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
      const wasUnreachable = !localAgentReachable.value
      await deviceActivation.refreshDeviceActivationState()
      syncPreferredScannerFromSetup()
      if (!localAgentReachable.value) {
        return
      }
      if (wasUnreachable) {
        void refreshScanners()
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
      activeBatchExternalNo.value = ''
      activeScanBatchId.value = ''
    }
    const activeBatchConfig = activeBackendBatch.value?.scanConfig
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

  const providerChainOptions = [
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

  function selectProviderChain(chain: DirectScanProviderChainCode) {
    providerChain.value = chain
  }

  function providerChainText(chain: DirectScanProviderChainCode | undefined): string {
    if (chain === DirectScanProviderChainCode.BAIDU_QWEN) {
      return '云端 AI（百度+千问）'
    }
    if (chain === DirectScanProviderChainCode.PADDLE_LOCAL) {
      return '本地 PaddleOCR'
    }
    return '按租户配置'
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
      closeExamSwitchGate()
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
      const sessionReady = await ensureKioskBrowserAuthSynced()
      if (!sessionReady) {
        examOptions.value = []
        examOptionTotal.value = 0
        errorMessage.value = KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE
        return
      }
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
      examOptions.value = result.list
      examOptionFilter.pageNum = result.pageNum
      examOptionFilter.pageSize = result.pageSize
      examOptionTotal.value = Number(result.total)
    } catch (error) {
      showUserError(error, '考试列表加载失败')
      examOptions.value = []
      examOptionTotal.value = 0
    } finally {
      examOptionLoading.value = false
    }
  }

  function openExamSwitchGate() {
    const reason = switchExamBlockedReason.value
    if (reason) {
      errorMessage.value = reason
      return
    }
    resetExamOptionFilter()
    examSwitchGateOpen.value = true
    void loadExamOptions()
  }

  function closeExamSwitchGate() {
    examSwitchGateOpen.value = false
  }

  function resetExamOptionFilter() {
    examOptionFilter.keyword = ''
    examOptionFilter.academicYear = ''
    examOptionFilter.semester = undefined
    examOptionFilter.classId = undefined
    examOptionFilter.pageNum = 1
  }

  function onExamSelectSearch(value: string) {
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
      batchHistoryList.value = result.list
      batchHistoryFilter.pageNum = result.pageNum
      batchHistoryFilter.pageSize = result.pageSize
      batchHistoryTotal.value = Number(result.total)
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
        errorMessage: '扫描工单班级范围与当前考试不一致，请刷新后重新启动扫描',
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

  async function submitScanJob() {
    if (!kioskContext.value) return
    await refreshKioskContext()
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
    const isSupplement = scanMode.value === ScannerKioskScanModeCode.SUPPLEMENT
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
        return
      }
      if (!scannerStationId) {
        errorMessage.value = '考试扫描站点缺失，无法创建扫描批次'
        return
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
        return
      }
      const rawScanBatchId = batchLifecycle.scanBatchId
      if (rawScanBatchId == null || String(rawScanBatchId).trim() === '') {
        await handleScanJobStartFailure(
          null,
          '扫描工单创建结果缺少批次 ID，无法启动本地扫描',
        )
        return
      }
      activeBatchExternalNo.value = batchLifecycle.batchExternalNo
      activeScanBatchId.value = String(rawScanBatchId).trim()
      if (!batchLifecycle.reportId) {
        await handleScanJobStartFailure(
          null,
          '扫描批次创建结果缺少扫描报告 ID，无法启动本地扫描',
        )
        return
      }
      activeReportId.value = batchLifecycle.reportId
      activeResolvedScanConfig.value = batchLifecycle.resolvedScanConfig ?? null
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
      startJobPolling(currentJob.value.scanJobId)
    } catch (error) {
      await handleScanJobStartFailure(error)
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
    activeBatchExternalNo.value = ''
    activeReportId.value = ''
    activeResolvedScanConfig.value = null
    currentJob.value = null
    await refreshKioskContext()
    await refreshPageLedger()
    applyPageRegisterBlockState(lifecycle.pageRegisterBlocked, lifecycle.pageRegisterDiagnostic)
    if (lifecycle.pageRegisterBlocked) {
      errorMessage.value = `批次已提交，但自动页登记被阻断：${lifecycle.pageRegisterDiagnostic ?? '请在复核页重试页登记'}`
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
      throw toUserError(null, '页级账本缺少页号，请刷新后重试')
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
        await loadKioskBootstrap()
        await loadExamOptions()
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
    const lifecycle = await discardExamScanWorkOrder({
      batchExternalNo,
      examId: examId.value,
      scannerDeviceId,
      scannerStationId,
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
      applyPageRegisterBlockState(
        job.pageRegisterBlocked || Boolean(pageRegisterBlockMessage),
        job.pageRegisterDiagnostic || pageRegisterBlockMessage,
      )
      if (pageRegisterBlockMessage) {
        errorMessage.value = `批次已上传，但自动页登记被阻断：${pageRegisterBlockMessage}。请在复核页重试页登记。`
        successMessage.value = ''
      }
      else {
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

  watch(needsExamBindingGate, (show) => {
    if (!show) return
    resetExamOptionFilter()
    void loadExamOptions()
  })

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
    pageRegisterBlocked,
    pageRegisterDiagnostic,
    pageRegisterRetryLoading,
    canRetryPageRegister,
    currentJob,
    previewScanJob,
    reviewScanJob,
    isWaitingForPaperFeed,
    isPreUploadScanFailure,
    loading,
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
    selectProviderChain,
    providerChainText,
    supplementTargetPageNo,
    supplementReason,
    supplementReplaceTargetPage,
    supplementPaperInstanceId,
    scanModeAdvisory,
    materialKindLabel,
    scanMaterialAdvisory,
    classScopeAdvisory,
    supplementBoundPapers,
    scanConfig,
    activationForm,
    examId,
    examBindingRequired,
    examSwitchGateOpen,
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
    displayPages,
    displayScannedCount,
    displayUploadedCount,
    exceptionPages,
    previewImageUrl,
    previewLoadError,
    scanProgress,
    activeBackendBatch,
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
    switchExamBlockedReason,
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
    refreshScannersByUser,
    refreshPageLedger,
    refreshBoundPapers,
    onManualRefreshLedger,
    loadExamOptions,
    resetExamOptionFilter,
    bindKioskExam,
    openExamSwitchGate,
    closeExamSwitchGate,
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
