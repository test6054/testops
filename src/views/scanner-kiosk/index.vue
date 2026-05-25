<script setup lang="ts">
import type {
  AgentHealthResponse,
  AgentHealthStatus,
  LocalScanPageStatus,
  ScanJobResponse,
  ScannerDeviceInfo,
} from '@/apis/mark/scanner-agent-local'
import {
  activateLocalAgent,
  cancelScanJob,
  deleteScanJob,
  discardScanJob,
  endBatch,
  getAgentHealth,
  getPageImageUrl,
  getScanJob,
  listLocalScanners,
  listScanJobs,
  openDiagnosticsExport,
  pauseScanJob,
  resumeScanJob,
  retryCommit,
  retryUpload,
  ScannerBusyError,
  startScanJob,
  unbindLocalAgent,
} from '@/apis/mark/scanner-agent-local'
import type {
  ExamScannerBatchLifecycleVO,
  ExamScannerKioskContextVO,
  ExamScannerKioskExamOptionRequest,
  ExamScannerKioskExamOptionVO,
  ExamScannerLedgerDataSource,
  ExamScannerPageRegistrationStatus,
  ScanAttentionTypeCode,
  ScannerKioskScanMode,
} from '@/apis/mark/scanner-kiosk'
import {
  closeScannerKioskBatch,
  discardScannedPage,
  discardScannerKioskBatch,
  getScannerKioskContext,
  pageScannerKioskExamOptions,
  sealScannerKioskBatch,
  startScannerKioskBatch,
} from '@/apis/mark/scanner-kiosk'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  ControlOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ScanOutlined,
  SettingOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { promptModal } from '@/views/quality/_helpers'

const route = useRoute()
const gatewayBaseUrlEnv = import.meta.env.VITE_SCANNER_GATEWAY_BASE_URL
const defaultGatewayBaseUrl = typeof gatewayBaseUrlEnv === 'string' ? gatewayBaseUrlEnv.trim() : ''

const health = ref<AgentHealthResponse | null>(null)
const scanners = ref<ScannerDeviceInfo[]>([])
const selectedScannerId = ref('')
const kioskContext = ref<ExamScannerKioskContextVO | null>(null)
const currentJob = ref<ScanJobResponse | null>(null)
const loading = ref(false)
const contextLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const previewPageNo = ref(0)
const configOpen = ref(false)
const expectedPages = ref<number | undefined>()
const scanMode = ref<ScannerKioskScanMode>('DIRECT')
const supplementTargetPageNo = ref<number | undefined>()
const supplementReason = ref('')
const activeBatchExternalNo = ref('')
const localJobRecoveryMessage = ref('')
/**
 * 补扫子模式：true=替换目标页（旧扫描页 SUPERSEDED），false=纯追加补扫（保留旧页，仅新增）。
 * 仅在 scanMode==='SUPPLEMENT' 时有效；切到其他模式时由 changeScanMode 自动重置为 false。
 */
const supplementReplaceTargetPage = ref(false)
const busyState = ref<{ active: boolean; activeJobId: string; activeJob: ScanJobResponse | null }>({
  active: false,
  activeJobId: '',
  activeJob: null,
})
const activationForm = ref({
  gatewayBaseUrl: defaultGatewayBaseUrl,
  activationCode: '',
  endpointName: '',
})

let healthTimer: number | undefined
let contextTimer: number | undefined
let jobTimer: number | undefined
let busyPollTimer: number | undefined
let sseRefreshDebounce: number | undefined
let busyPollFailureCount = 0
let jobPollFailureCount = 0
let restoringExamId = false
let restoringScannerId = false
let lastStableScannerId = ''

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
    scannerDeviceId: queryScannerDeviceId.value || undefined,
  }),
  initialLimit: 20,
  maxEvents: 50,
  // 当当前活动任务或 kioskContext 中已有批次外部号时拉页级账本，由 useScanLiveStream
  // 在 start / onReady / refresh 时间点自动触发；批次切换由下方 watch 显式 refreshPageLedger。
  ledgerFilter: () => {
    const device = getActiveScannerDeviceId()
    const station = getActiveScannerStationId()
    const batchExternalNo = getActiveBatchExternalNo()
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

// examId 不再仅来自 URL query：从 query 取初始值后由考试选择下拉接管，前端业务流程要求一体机
// 必须先选择考试再扫描，已归档（CLOSED）考试由后端 /exam-options 强制过滤掉。
const examId = ref<string>(queryValue(route.query.examId))
const queryScannerDeviceId = computed(() => queryValue(route.query.scannerDeviceId))
const queryScannerStationId = computed(() => queryValue(route.query.scannerStationId))

// 考试选择下拉的本地状态：分页 / 关键字 / 学年 / 学期 / 班级 过滤都通过
// pageScannerKioskExamOptions 接口承载，后端只返 status=ACTIVE 的考试。
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
  if (!currentJob.value || previewPageNo.value === 0) return ''
  return getPageImageUrl(currentJob.value.scanJobId, previewPageNo.value)
})
const scanProgress = computed(() => {
  if (!currentJob.value) return 0
  if (currentJob.value.reported) return 100
  if (currentJob.value.scannedPages === 0) return 3
  const uploadedRatio = currentJob.value.uploadedPages / Math.max(currentJob.value.scannedPages, 1)
  return Math.min(Math.round(12 + uploadedRatio * 84), 96)
})
const currentJobBlocksWorkspace = computed(() => {
  const status = currentJob.value?.status
  return Boolean(status && status !== 'REPORTED')
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
  return uploadablePages.every((page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId))
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
    return '调用后端废弃接口把扫描批次置为 DISCARDED，并清理 Agent 本地任务'
  }
  if (currentJobAllPagesUploadedButUnconfirmed.value) {
    return '页面已上传完成但批次未确认，请先点击重试 commit'
  }
  return '仅清理 Agent 本地的未上报扫描任务；上传中任务需等待完成或失败后处理'
})
const canRetryUpload = computed(() => {
  const job = currentJob.value
  if (!job || job.reported) return false
  const status = job.status
  if (
    status === 'SCANNING' ||
    status === 'PAUSED' ||
    status === 'UPLOADING' ||
    status === 'CANCELLED' ||
    status === 'REPORTED'
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
    status === 'SCANNING' ||
    status === 'PAUSED' ||
    status === 'UPLOADING' ||
    status === 'CANCELLED' ||
    status === 'REPORTED'
  ) {
    return false
  }
  const uploadablePages = visiblePages.value.filter((page) => page.status !== 'DELETED')
  if (uploadablePages.length === 0 || job.uploadedPages <= 0) return false
  return uploadablePages.every((page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId))
})
const scanBlockedReason = computed(() => {
  if (!examId.value) return '请先在顶部下拉中选择考试'
  if (!health.value?.bound) return '一体机未激活'
  if (health.value?.tokenResetRequired) return '服务端已重置设备 token'
  if (health.value?.upgradeRequired) return '本地 Agent 或 WebView2 客户端需要升级'
  if (!health.value?.scannerConnected) return '本地扫描仪未连接'
  if (health.value.lastHeartbeatAt && !health.value.scanAllowed) return '服务端心跳未允许扫描'
  if (!selectedScannerId.value) return '未检测到可用本地扫描仪'
  if (!kioskContext.value) return '考试扫描上下文未加载'
  if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束'
  if (!kioskContext.value.canStartScan)
    return kioskContext.value.blockReason || '服务端未允许启动扫描'
  if (scanMode.value === 'SUPPLEMENT') {
    if (!kioskContext.value.canStartSupplementScan)
      return kioskContext.value.supplementBlockReason || '服务端未允许启动补扫'
    if (!supplementTargetPageNo.value || supplementTargetPageNo.value <= 0)
      return '补扫目标页号不能为空'
    if (!supplementReason.value.trim()) return '补扫原因不能为空'
  }
  if (!kioskContext.value.device) return '考试未绑定可用扫描设备'
  if (!kioskContext.value.policy) return '考试扫描策略未配置'
  return ''
})
const canStartScan = computed(() => !scanBlockedReason.value && !loading.value)
const canSwitchScanMode = computed(() => !currentJobBlocksWorkspace.value)
const canSwitchExam = computed(() => !currentJobBlocksWorkspace.value)
const canSwitchScanner = computed(() => !currentJobBlocksWorkspace.value)
const canEditScanSetup = computed(() => !currentJobBlocksWorkspace.value)
const canActivateAgent = computed(() => !currentJobBlocksWorkspace.value)
const canUnbindAgent = computed(() => !currentJobBlocksWorkspace.value)
const canDiscardLedgerPage = computed(() => !currentJobBlocksWorkspace.value)
const workState = computed(() => {
  const job = currentJob.value
  const status = job?.status
  if (status === 'REPORTED') return { text: '已自动上传并提交批次', tone: 'success' }
  if (status === 'FAILED') return { text: '存在失败项', tone: 'danger' }
  if (status === 'CANCELLED') return { text: '已取消，待删除清理', tone: 'muted' }
  if (job && status === 'PAUSED')
    return { text: scanModeText(job.scanMode, '已暂停'), tone: 'running' }
  if (job) return { text: scanModeText(job.scanMode, '上传中'), tone: 'running' }
  if (scanBlockedReason.value) return { text: '入口阻断', tone: 'danger' }
  return { text: `可开始${scanModeText(scanMode.value, '')}`, tone: 'success' }
})
const uploadStage = computed(() => {
  if (!currentJob.value) return '等待扫描'
  if (currentJob.value.reported) return '服务端已接收批次'
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
  return `${batch.batchNo || batch.batchExternalNo || batch.scanBatchId} · ${batch.statusMessage || batch.status}`
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
const latestBatchLifecycleItems = computed(() => {
  const batch = kioskContext.value?.latestBatch
  if (!batch) return [] as { label: string; value: string; danger?: boolean }[]
  const items: { label: string; value: string; danger?: boolean }[] = []
  if (batch.sealedAt) {
    items.push({
      label: '封存',
      value: `${formatTime(batch.sealedAt)}${batch.sealedBy ? ` · #${batch.sealedBy}` : ''}`,
    })
  }
  if (batch.discardedAt || batch.status === 'DISCARDED') {
    items.push({
      label: '废弃',
      value: `${formatTime(batch.discardedAt)}${batch.discardedBy ? ` · #${batch.discardedBy}` : ''}`,
      danger: true,
    })
  }
  if (batch.discardReason) {
    items.push({ label: '原因', value: batch.discardReason, danger: true })
  }
  if (batch.pendingUploadCount > 0) {
    items.push({
      label: '阻断',
      value: `仍有 ${batch.pendingUploadCount} 页待上传，不能封存`,
      danger: true,
    })
  }
  return items
})
const latestBatchSealBlockedReason = computed(() => {
  const batch = kioskContext.value?.latestBatch
  const device = kioskContext.value?.device
  if (!batch?.scanBatchId) return '当前考试尚无已落库扫描批次'
  if (!device?.scannerDeviceId) return '考试扫描设备缺失'
  if (currentJobBlocksWorkspace.value) return '当前扫描任务未结束，不能封存批次'
  if (batch.sealedAt) return '批次已封存'
  if (batch.status === 'DISCARDED' || batch.discardedAt) return '批次已废弃'
  if (batch.pendingUploadCount > 0) return `仍有 ${batch.pendingUploadCount} 页待上传`
  return ''
})
const canSealLatestBatch = computed(() => !latestBatchSealBlockedReason.value && !loading.value)
const examTermText = computed(() => {
  const exam = kioskContext.value?.exam
  if (!exam) return ''
  const year = (exam.academicYear || '').trim()
  const semester = (exam.semester || '').trim()
  if (!year && !semester) return ''
  const semesterLabel = semester === '1' ? '秋季学期' : semester === '2' ? '春季学期' : ''
  return [year, semesterLabel].filter(Boolean).join(' · ')
})
const declaredClassChips = computed(() => {
  const ctx = kioskContext.value
  if (!ctx) return [] as { key: string; label: string; missing: boolean }[]
  return ctx.classIds.map((classId, idx) => {
    const name = ctx.declaredClassNames[idx]
    return {
      key: classId,
      label: name || `班级 #${classId}（已删除）`,
      missing: !name,
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
const latestBatchPageStats = computed(() => {
  const batch = kioskContext.value?.latestBatch
  if (!batch) return null
  return {
    declared: batch.pageCount,
    received: batch.receivedPageCount,
    pending: batch.pendingUploadCount,
    attention: batch.attentionItemCount,
  }
})
const latestBatchStatsText = computed(() => {
  const stats = latestBatchPageStats.value
  if (!stats) {
    return {
      declared: '-',
      received: '-',
      pending: '-',
      attention: '-',
    }
  }
  return {
    declared: String(stats.declared),
    received: String(stats.received),
    pending: String(stats.pending),
    attention: String(stats.attention),
  }
})
const latestBatchPeriodText = computed(() => {
  const batch = kioskContext.value?.latestBatch
  if (!batch) return '-'
  const start = formatTime(batch.scanStartTime)
  const end = formatTime(batch.scanEndTime)
  if (start === '-' && end === '-') return '-'
  return `${start} → ${end}`
})
const pendingUploadJobsText = computed(() => {
  if (!health.value) return '未连接'
  return `${health.value.pendingUploadJobs} 个任务`
})
const pendingUploadDiagnosticText = computed(() => {
  if (!health.value || health.value.pendingUploadJobs <= 0 || currentJob.value) return ''
  if (!localJobRecoveryMessage.value) {
    return '本地 Agent 存在未完成上传任务，但不属于当前考试、设备或班级范围'
  }
  return localJobRecoveryMessage.value
})
const busyStateText = computed(() => {
  const job = busyState.value.activeJob
  if (job?.status === 'FAILED') {
    return '扫描仪任务已失败，请先处理失败项'
  }
  return '扫描仪正在执行任务'
})

onMounted(async () => {
  // 先加载考试下拉，保证用户可以在工作台首屏立即看到可选考试列表。
  await loadExamOptions().catch(handleError)
  await refreshAll()
  healthTimer = window.setInterval(() => refreshHealth().catch(handleError), 5000)
  contextTimer = window.setInterval(() => {
    refreshKioskContext().then(recoverLocalScanJob).catch(handleError)
  }, 15000)
  if (examId.value) {
    startSse().catch(handleError)
  }
})

// examId 由考试选择下拉切换或 URL query 初始化驱动；变更后立即刷新工作台上下文，
// 否则 latestBatch / classIds 等会停留在上一考试，导致扫描 / 启动决策错误。
watch(examId, (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (restoringExamId) {
    return
  }
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能切换考试'
    restoringExamId = true
    examId.value = oldVal || ''
    nextTick(() => {
      restoringExamId = false
    })
    return
  }
  kioskContext.value = null
  activeBatchExternalNo.value = ''
  currentJob.value = null
  previewPageNo.value = 0
  if (jobTimer) {
    window.clearInterval(jobTimer)
    jobTimer = undefined
  }
  refreshKioskContext().then(recoverLocalScanJob).catch(handleError)
  if (newVal) {
    refreshSse().catch(handleError)
  } else {
    stopSse()
  }
})

watch(selectedScannerId, (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (restoringScannerId) {
    return
  }
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能切换本地扫描仪'
    restoringScannerId = true
    selectedScannerId.value = oldVal || lastStableScannerId
    nextTick(() => {
      restoringScannerId = false
    })
    return
  }
  lastStableScannerId = newVal
})

// 批次切换（活动批次 / 当前任务 / latestBatch 变化）时显式触发页级账本刷新；
// useScanLiveStream 的 ledgerFilter getter 会在下次 refreshPageLedger 调用时读到新批次。
watch(
  () => getActiveBatchExternalNo(),
  (newBatchNo, oldBatchNo) => {
    if (newBatchNo === oldBatchNo) return
    refreshPageLedger().catch(handleError)
  },
)

onBeforeUnmount(() => {
  if (healthTimer) window.clearInterval(healthTimer)
  if (contextTimer) window.clearInterval(contextTimer)
  if (jobTimer) window.clearInterval(jobTimer)
  if (busyPollTimer) window.clearInterval(busyPollTimer)
  if (sseRefreshDebounce) window.clearTimeout(sseRefreshDebounce)
  stopSse()
})

watch(
  liveEvents,
  (newEvents, oldEvents) => {
    if (newEvents.length > (oldEvents?.length ?? 0)) {
      if (sseRefreshDebounce) window.clearTimeout(sseRefreshDebounce)
      sseRefreshDebounce = window.setTimeout(() => {
        // SSE 推送增量页 → 节流刷新工作台上下文 + 页级账本：
        // - context 反映 latestBatch / scannedPages / attentionCount 等聚合视图；
        // - ledger 反映当前批次每页的稳定状态视图，前端按 batchExternalNo + pageNo 对齐。
        refreshKioskContext().catch(handleError)
        refreshPageLedger().catch(handleError)
      }, 800)
    }
  },
  { deep: false },
)

async function refreshAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([refreshHealth(), refreshScanners(), refreshKioskContext()])
    await recoverLocalScanJob()
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function refreshHealth() {
  health.value = await getAgentHealth()
}

async function refreshScanners() {
  const response = await listLocalScanners()
  scanners.value = response.devices
  if (!selectedScannerId.value && availableScanners.value.length > 0 && canSwitchScanner.value) {
    selectedScannerId.value = availableScanners.value[0].localScannerId
  }
}

async function refreshKioskContext() {
  if (!examId.value) {
    kioskContext.value = null
    return
  }
  contextLoading.value = true
  try {
    kioskContext.value = await getScannerKioskContext({
      examId: examId.value,
      scannerDeviceId: queryScannerDeviceId.value || undefined,
      scannerStationId: queryScannerStationId.value || undefined,
      scanMode: scanMode.value,
    })
  } finally {
    contextLoading.value = false
  }
}

/**
 * 浏览器刷新后从 Agent 持久化任务中恢复当前工作台：只接管考试、设备、班级顺序全部一致
 * 且仍可处理的任务，避免把其它考试或其它扫描设备的残留任务挂到当前页面。
 */
async function recoverLocalScanJob() {
  const ctx = kioskContext.value
  const deviceId = getActiveScannerDeviceId()
  const stationId = getActiveScannerStationId()
  if (!examId.value || !ctx || !deviceId || !stationId) {
    localJobRecoveryMessage.value = ''
    return
  }
  const response = await listScanJobs({
    examId: examId.value,
    scannerDeviceId: deviceId,
    scannerStationId: stationId,
    includeTerminal: true,
  })
  const currentJobId = currentJob.value?.scanJobId || ''
  const hasActiveCurrentJob = Boolean(currentJob.value && currentJob.value.status !== 'REPORTED')
  const recoverableJobs = response.jobs.filter(isRecoverableLocalJob)
  const currentPersistedJob = currentJobId
    ? recoverableJobs.find((job) => job.scanJobId === currentJobId)
    : undefined
  const recoverableJob =
    (currentPersistedJob && (hasActiveCurrentJob || isRecoverableLocalJob(currentPersistedJob))
      ? currentPersistedJob
      : undefined) ||
    (!hasActiveCurrentJob
      ? recoverableJobs.find((job) => {
          return (
            job.examId === examId.value &&
            job.scannerDeviceId === deviceId &&
            job.scannerStationId === stationId &&
            sameOrderedStringList(job.declaredClassIds, ctx.classIds) &&
            isRecoverableLocalJob(job)
          )
        })
      : undefined)
  if (hasActiveCurrentJob && recoverableJob) {
    currentJob.value = recoverableJob
    activeBatchExternalNo.value = recoverableJob.batchExternalNo
    localJobRecoveryMessage.value = ''
    if (shouldPollRecoveredJob(recoverableJob)) {
      startJobPolling(recoverableJob.scanJobId)
    }
    return
  }
  if (hasActiveCurrentJob) {
    return
  }
  if (!recoverableJob) {
    localJobRecoveryMessage.value =
      recoverableJobs.length > 0 ? '本地任务与当前班级范围不一致，未自动接管' : ''
    return
  }
  currentJob.value = recoverableJob
  activeBatchExternalNo.value = recoverableJob.batchExternalNo
  localJobRecoveryMessage.value = ''
  if (shouldPollRecoveredJob(recoverableJob)) {
    startJobPolling(recoverableJob.scanJobId)
  }
  successMessage.value = '已恢复本地未完成扫描任务'
}

/**
 * 加载考试选择下拉项。后端 /exam-options 只返当前租户内 status=ACTIVE 的考试，
 * 已归档（CLOSED）一律不返回；筛选条件 keyword / academicYear / semester / classId
 * 由 examOptionFilter 承载，下拉中支持服务端搜索。
 */
async function loadExamOptions() {
  examOptionLoading.value = true
  try {
    const payload: ExamScannerKioskExamOptionRequest = {
      pageNum: examOptionFilter.pageNum,
      pageSize: examOptionFilter.pageSize,
    }
    const keyword = examOptionFilter.keyword.trim()
    if (keyword) payload.keyword = keyword
    const academicYear = examOptionFilter.academicYear.trim()
    if (academicYear) payload.academicYear = academicYear
    if (examOptionFilter.semester) payload.semester = examOptionFilter.semester
    if (examOptionFilter.classId) payload.classId = examOptionFilter.classId
    const result = await pageScannerKioskExamOptions(payload)
    examOptions.value = result.list
    examOptionTotal.value = result.total
  } finally {
    examOptionLoading.value = false
  }
}

/**
 * 考试下拉的服务端搜索：a-select 输入时触发；keyword 写入 filter，300ms 防抖后
 * 调一次 loadExamOptions，避免逐字符打接口。空字符串等价于清空 keyword。
 */
let examSelectSearchDebounce: number | undefined
function onExamSelectSearch(value: string) {
  if (!canSwitchExam.value) {
    errorMessage.value = '当前扫描任务未结束，不能搜索考试'
    return
  }
  examOptionFilter.keyword = (value || '').trim()
  examOptionFilter.pageNum = 1
  if (examSelectSearchDebounce) window.clearTimeout(examSelectSearchDebounce)
  examSelectSearchDebounce = window.setTimeout(() => {
    loadExamOptions().catch(handleError)
  }, 300)
}

function onExamFilterChange() {
  if (!canSwitchExam.value) {
    errorMessage.value = '当前扫描任务未结束，不能修改考试筛选条件'
    return
  }
  loadExamOptions().catch(handleError)
}

function refreshExamOptionsByUser() {
  if (!canSwitchExam.value) {
    errorMessage.value = '当前扫描任务未结束，不能刷新考试列表'
    return
  }
  loadExamOptions().catch(handleError)
}

async function refreshScannersByUser() {
  if (!canSwitchScanner.value) {
    errorMessage.value = '当前扫描任务未结束，不能刷新本地扫描仪'
    return
  }
  await refreshScanners()
}

/**
 * 考试选择下拉受控值变化处理：清空时把 examId 设为空字符串以触发 watch 链路；
 * 选中具体考试时直接覆盖 examId.value。
 */
function onExamSelectChange(value: unknown) {
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能切换考试'
    return
  }
  currentJob.value = null
  activeBatchExternalNo.value = ''
  examId.value = typeof value === 'string' ? value : ''
}

async function submitScanJob() {
  if (!kioskContext.value || !canStartScan.value) return
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能新建扫描'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  resetBusyState()
  const isSupplement = scanMode.value === 'SUPPLEMENT'
  const scannerDeviceId = getActiveScannerDeviceId()
  const scannerStationId = getActiveScannerStationId()
  try {
    if (!scannerDeviceId) {
      throw new Error('考试扫描设备缺失，无法创建服务端批次锚点')
    }
    if (!scannerStationId) {
      throw new Error('考试扫描站点缺失，无法创建服务端批次锚点')
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
    })
    if (!batchLifecycle.batchExternalNo) {
      throw new Error('服务端未返回批次外部号，无法启动本地扫描')
    }
    activeBatchExternalNo.value = batchLifecycle.batchExternalNo
    const lifecycleScanSource = resolveLifecycleScanSource(batchLifecycle, kioskContext.value)
    currentJob.value = await startScanJob({
      context: kioskContext.value,
      localScannerId: selectedScannerId.value,
      batchExternalNo: batchLifecycle.batchExternalNo,
      expectedPages: expectedPages.value,
      scanMode: lifecycleScanSource.scanMode,
      targetPageNo: lifecycleScanSource.targetPageNo,
      supplementReason: lifecycleScanSource.supplementReason,
      replaceTargetPage: lifecycleScanSource.replaceTargetPage,
    })
    startJobPolling(currentJob.value.scanJobId)
  } catch (error) {
    if (activeBatchExternalNo.value) {
      try {
        await closeActiveBatch(true)
      } catch (closeError) {
        const startMessage = error instanceof Error ? error.message : String(error)
        const closeMessage = closeError instanceof Error ? closeError.message : String(closeError)
        handleError(new Error(`${startMessage}；服务端批次关闭失败：${closeMessage}`))
        return
      }
    }
    if (error instanceof ScannerBusyError) {
      enterBusyState(error.activeJobId)
      return
    }
    handleError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 以服务端 Redis 锚点回执作为 Agent 启动真源。start 接口可能命中既有锚点，
 * 前端表单值不能覆盖 batchLifecycle 中的批次号、模式、补扫目标页和班级范围。
 */
function resolveLifecycleScanSource(
  lifecycle: ExamScannerBatchLifecycleVO,
  context: ExamScannerKioskContextVO,
): {
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  replaceTargetPage: boolean
} {
  if (!lifecycle.scanMode) {
    throw new Error('服务端批次锚点缺少扫描模式，已阻断本地扫描启动')
  }
  if (
    lifecycle.declaredClassIds &&
    !sameOrderedStringList(lifecycle.declaredClassIds, context.classIds)
  ) {
    throw new Error('服务端批次锚点班级范围与当前考试上下文不一致，请刷新后重新启动扫描')
  }
  if (lifecycle.scanMode !== 'SUPPLEMENT') {
    return {
      scanMode: lifecycle.scanMode,
      replaceTargetPage: false,
    }
  }
  if (!lifecycle.targetPageNo || lifecycle.targetPageNo <= 0) {
    throw new TypeError('服务端补扫锚点缺少目标页号，已阻断本地扫描启动')
  }
  const reason = lifecycle.supplementReason?.trim()
  if (!reason) {
    throw new Error('服务端补扫锚点缺少补扫原因，已阻断本地扫描启动')
  }
  return {
    scanMode: lifecycle.scanMode,
    targetPageNo: lifecycle.targetPageNo,
    supplementReason: reason,
    replaceTargetPage: lifecycle.replaceTargetPage,
  }
}

/**
 * 班级范围需要与后端锚点顺序完全一致；顺序变化会导致 Agent 上报声明范围与批次锚点错位。
 */
function sameOrderedStringList(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

/**
 * 可恢复任务状态白名单：Cancelled 是待删除清理态，刷新后必须接管并阻断切换 / 解绑；
 * Failed 保留在工作台，允许继续重试上传、重试 commit、删除或废弃，Reported 不再接管。
 */
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

/**
 * 只有仍在采集或上传链路中的恢复任务需要自动轮询；Paused / Failed 由用户显式恢复或重试。
 */
function shouldPollRecoveredJob(job: ScanJobResponse) {
  return ['CREATED', 'SCANNING', 'READYTOUPLOAD', 'UPLOADING', 'RETRYING'].includes(job.status)
}

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

function scanModeText(mode: ScannerKioskScanMode, suffix: string) {
  if (mode === 'SUPPLEMENT') return `补扫${suffix}`
  if (mode === 'ARCHIVE') return `历史存档${suffix}`
  return `首次扫描${suffix}`
}

async function prepareSupplementScan(pageNo: number, action: '补扫' | '替换') {
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能切换到补扫模式'
    return
  }
  scanMode.value = 'SUPPLEMENT'
  supplementTargetPageNo.value = pageNo
  supplementReason.value = `${action}第 ${pageNo} 页`
  // 关键：通过 action 决定是否替换。点击 "替换" 时把旧扫描页置为 SUPERSEDED；
  // 点击 "补扫" 走纯追加，保留旧页。
  supplementReplaceTargetPage.value = action === '替换'
  errorMessage.value = ''
  await refreshKioskContext()
}

/**
 * 删除当前 Agent 本地扫描任务：已上报任务先由前端用户态废弃后端批次，
 * Agent 只清理本地任务；未上报任务删除本地数据并关闭服务端 Redis 锚点。
 */
async function removeCurrentScanJob() {
  if (!currentJob.value) return
  const job = currentJob.value
  if (currentJobAllPagesUploadedButUnconfirmed.value) {
    errorMessage.value = '页面已上传完成但 commit 未确认，请先点击重试 commit'
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
      content: `确认废弃任务 ${job.scanJobId}？该操作将通知服务端把扫描批次置为 DISCARDED，且不可逆。`,
      type: 'error',
      okText: '废弃',
    })
    if (!confirmed) return
    loading.value = true
    try {
      if (!job.scanBatchId) {
        throw new Error('已上报任务缺少服务端批次 ID，无法执行废弃')
      }
      await discardScannerKioskBatch({
        scanBatchId: job.scanBatchId,
        discardReason: reason,
      })
      await discardScanJob(job.scanJobId, reason)
      activeBatchExternalNo.value = ''
      successMessage.value = '已废弃服务端扫描批次并清理 Agent 本地任务'
      currentJob.value = null
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
    content: `确认删除尚未上报的扫描任务 ${job.scanJobId}？该操作会清理 Agent 本地任务，并关闭服务端工作台锚点、丢弃未提交中间页。`,
    type: 'warning',
    okText: '删除',
  })
  if (!confirmed) return
  loading.value = true
  try {
    await closeActiveBatch(true)
    await deleteScanJob(job.scanJobId)
    successMessage.value = '已删除本地扫描任务并关闭服务端工作台锚点'
    currentJob.value = null
    await refreshKioskContext()
    await refreshPageLedger()
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function activateAgent() {
  if (!canActivateAgent.value) {
    errorMessage.value = '当前扫描任务未结束，不能重新激活一体机'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const payload = validateActivationForm()
    await activateLocalAgent(payload)
    successMessage.value = '一体机已激活'
    await refreshAll()
    configOpen.value = false
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function unbindAgent() {
  if (currentJobBlocksWorkspace.value) {
    errorMessage.value = '当前扫描任务未结束，不能解除绑定'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await unbindLocalAgent()
    currentJob.value = null
    successMessage.value = '一体机绑定已清除'
    await refreshAll()
  } catch (error) {
    handleError(error)
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
    content: '确认结束本批次吗？已扫描页面会进入上传链路并 commit。',
  })
  if (!confirmed) return
  loading.value = true
  errorMessage.value = ''
  try {
    currentJob.value = await endBatch(currentJob.value.scanJobId)
    if (isPollingTerminalJob(currentJob.value)) {
      await handleTerminalBatchClosure(currentJob.value)
      successMessage.value = '本批次已结束并完成服务端收口'
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
    successMessage.value = '已重新进入 commit 队列'
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 封存当前最近一个已落库扫描批次：调 backend /batch/seal 写入 sealed_at / sealed_by。
 * 封存后该批次再写入将被服务端拒绝；通常用于教师确认本场考试录入完成、不再追加补扫。
 */
async function sealLatestBatch() {
  const batch = kioskContext.value?.latestBatch
  const device = kioskContext.value?.device
  const blockedReason = latestBatchSealBlockedReason.value
  if (blockedReason) {
    errorMessage.value = blockedReason
    return
  }
  if (!batch || !batch.scanBatchId || !device || !device.scannerDeviceId) {
    errorMessage.value = '当前考试尚无已落库扫描批次或设备信息缺失，无法封存'
    return
  }
  if (!device.scannerStationId) {
    errorMessage.value = '当前考试扫描站点缺失，无法封存批次'
    return
  }
  const confirmed = await confirmAsync({
    title: '封存批次',
    content: `确认封存批次 ${batch.batchNo || batch.batchExternalNo}？封存后无法再追加扫描。`,
  })
  if (!confirmed) return
  loading.value = true
  errorMessage.value = ''
  try {
    await sealScannerKioskBatch({
      scanBatchId: batch.scanBatchId,
      scannerDeviceId: device.scannerDeviceId,
      scannerStationId: device.scannerStationId,
    })
    successMessage.value = '批次已封存'
    await refreshKioskContext()
    await refreshPageLedger()
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

function startJobPolling(scanJobId: string) {
  if (jobTimer) window.clearInterval(jobTimer)
  jobPollFailureCount = 0
  jobTimer = window.setInterval(async () => {
    try {
      const prevPageCount = currentJob.value?.pages.length ?? 0
      currentJob.value = await getScanJob(scanJobId)
      jobPollFailureCount = 0
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
        errorMessage.value = '扫描任务轮询连续失败，请检查本地 Agent 连接后手动刷新'
      }
      handleError(error)
    }
  }, 1500)
}

function getActiveBatchExternalNo() {
  return (
    activeBatchExternalNo.value ||
    currentJob.value?.batchExternalNo ||
    kioskContext.value?.latestBatch?.batchExternalNo ||
    ''
  )
}

function getActiveScannerDeviceId() {
  return queryScannerDeviceId.value || kioskContext.value?.device?.scannerDeviceId || ''
}

function getActiveScannerStationId() {
  return queryScannerStationId.value || kioskContext.value?.device?.scannerStationId || ''
}

/**
 * 轮询关闭态只表示 Agent 状态不需要继续拉取；FAILED / CANCELLED 仍会占用工作台，
 * 保留重试、删除或废弃入口，不能等同于业务可释放态。
 */
function isPollingTerminalJob(job: ScanJobResponse) {
  return ['REPORTED', 'CANCELLED', 'FAILED'].includes(job.status)
}

/**
 * 关闭当前扫描锚点：成功上报保留 pending 诊断；取消、用户删除未上报任务、
 * 本地启动失败时可显式丢弃中间页。失败终态不在这里自动丢弃，需保留给 retryUpload / retryCommit。
 */
async function closeActiveBatch(discardPendingPages: boolean) {
  const batchExternalNo = getActiveBatchExternalNo()
  if (!batchExternalNo) return
  const scannerDeviceId = getActiveScannerDeviceId()
  const scannerStationId = getActiveScannerStationId()
  if (!examId.value) {
    throw new Error('当前扫描锚点缺少考试 ID，无法关闭服务端批次')
  }
  if (!scannerDeviceId) {
    throw new Error('当前扫描锚点缺少扫描设备，无法关闭服务端批次')
  }
  if (!scannerStationId) {
    throw new Error('当前扫描锚点缺少扫描站点，无法关闭服务端批次')
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
      typeof lifecycle.pendingPageCount !== 'number' ||
      !Number.isFinite(lifecycle.pendingPageCount)
    ) {
      throw new TypeError('服务端批次关闭回执缺少 pending 页数')
    }
    if (lifecycle.pendingPageCount > 0) {
      errorMessage.value = lifecycle.pendingPagesDiagnostic || '服务端批次仍存在未提交扫描页'
    }
  }
  activeBatchExternalNo.value = ''
}

/**
 * Agent 任务进入终态后的批次收口：REPORTED 关闭锚点保留诊断，FAILED 保留中间页供重试，
 * CANCELLED 主动丢弃未提交中间页。
 */
async function handleTerminalBatchClosure(job: ScanJobResponse) {
  activeBatchExternalNo.value = job.batchExternalNo || activeBatchExternalNo.value
  if (job.status === 'REPORTED' && job.reported) {
    await closeActiveBatch(false)
    await refreshKioskContext()
    await refreshPageLedger()
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
    const allPagesUploaded =
      uploadablePages.length > 0 &&
      job.uploadedPages > 0 &&
      uploadablePages.every((page) => page.status === 'UPLOADED' && Boolean(page.uploadedFileId))
    errorMessage.value = allPagesUploaded
      ? '服务端提交未完成，已保留中间页，请点击重试 commit'
      : '扫描上传未完成，已保留中间页，请点击重试上传或删除任务'
    await refreshKioskContext()
    await refreshPageLedger()
  }
}

function enterBusyState(activeJobId: string) {
  busyPollFailureCount = 0
  busyState.value = { active: true, activeJobId, activeJob: null }
  pollActiveJob(activeJobId)
  if (busyPollTimer) window.clearInterval(busyPollTimer)
  busyPollTimer = window.setInterval(() => pollActiveJob(activeJobId), 2000)
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
    errorMessage.value =
      busyPollFailureCount >= 3
        ? '无法确认上一扫描任务状态，请检查本地扫描 Agent 后重试'
        : '本地扫描 Agent 状态查询失败，正在重试'
    if (busyPollFailureCount >= 3 && busyPollTimer) {
      window.clearInterval(busyPollTimer)
      busyPollTimer = undefined
      console.error('本地扫描 Agent 状态连续查询失败', error)
    }
  }
}

function resetBusyState() {
  if (busyPollTimer) {
    window.clearInterval(busyPollTimer)
    busyPollTimer = undefined
  }
  busyPollFailureCount = 0
  busyState.value = { active: false, activeJobId: '', activeJob: null }
}

function validateActivationForm() {
  const gatewayBaseUrl = activationForm.value.gatewayBaseUrl.trim().replace(/\/+$/, '')
  const activationCode = activationForm.value.activationCode.trim()
  const endpointName = activationForm.value.endpointName.trim()
  if (!gatewayBaseUrl) throw new Error('后端网关地址不能为空')
  let url: URL
  try {
    url = new URL(gatewayBaseUrl)
  } catch {
    throw new Error('后端网关地址格式不正确')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('后端网关地址必须以 http:// 或 https:// 开头')
  if (!activationCode) throw new Error('激活码不能为空')
  if (!endpointName) throw new Error('端点名称不能为空')
  return { gatewayBaseUrl, activationCode, endpointName }
}

function queryValue(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : ''
  return typeof value === 'string' ? value.trim() : ''
}

function pageStatusText(status: LocalScanPageStatus) {
  if (status === 'CAPTURED') return '已采集'
  if (status === 'PREPROCESSED') return '已预处理'
  if (status === 'UPLOADING') return '上传中'
  if (status === 'UPLOADED') return '已上传'
  if (status === 'FAILED') return '失败'
  return '已删除'
}

function agentHealthStatusLabel(status?: AgentHealthStatus) {
  if (!status) return '-'
  return '运行中'
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

function handleError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}

/**
 * 手动刷新页级账本：用户点击"刷新"按钮时调用；与 useScanLiveStream 的 onReady / SSE 增量
 * 自动刷新互补，覆盖 SSE 中断 + 没有新事件触发场景。错误回填 pageLedgerError，不打断 SSE 流。
 */
function onManualRefreshLedger() {
  refreshPageLedger().catch(handleError)
}

function ledgerSourceText(source: ExamScannerLedgerDataSource) {
  if (source === 'DATABASE') return '已落库'
  if (source === 'REDIS_PENDING') return '等待 commit'
  if (source === 'NONE') return '空批次'
}

function registrationStatusText(status: ExamScannerPageRegistrationStatus) {
  if (status === 'REGISTERED') return '已识别'
  if (status === 'PENDING') return '等待识别'
  if (status === 'DISCARDED') return '已废弃'
  if (status === 'SUPERSEDED') return '已替换'
}

async function discardLedgerPage(item: { localPageId?: string; pageNo: number }) {
  if (!Number.isFinite(item.pageNo)) {
    throw new TypeError('页级账本缺少页号')
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

function attentionTypeText(type: ScanAttentionTypeCode) {
  if (type === 'QUALITY_BLOCK') return '质量阻断'
  if (type === 'PROCESSING_BLOCK') return '处理阻断'
  if (type === 'DUPLICATE_PENDING') return '重复待裁决'
  if (type === 'RECOGNITION_REVIEW') return '识别复核'
}

/**
 * 页级账本条目唯一键：按后端规范"batchExternalNo + pageNo + sha256"对账，避免基于数组下标
 * 的伪稳定 key（后端可能切换 DATABASE / REDIS_PENDING 分支时下标变化）。
 */
function ledgerItemKey(item: { pageNo: number; sha256?: string; localPageId?: string }) {
  const batchNo = pageLedger.value?.batchExternalNo ?? ''
  const sha = item.sha256 ?? ''
  const pageNo = item.pageNo
  if (!Number.isFinite(pageNo)) {
    throw new TypeError('页级账本缺少页号')
  }
  const local = item.localPageId ?? ''
  return `${batchNo}#${pageNo}#${sha || local || 'nokey'}`
}

function ledgerErrorText(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}
</script>

<template>
  <main class="scanner-kiosk">
    <header class="kiosk-header">
      <div>
        <div class="eyebrow">高校期末考试</div>
        <h1>期末考试扫描工作台</h1>
        <p>
          {{ kioskContext?.exam.examName || '等待考试上下文' }}
          <span v-if="examTermText" class="exam-term-tag">{{ examTermText }}</span>
        </p>
      </div>
      <div class="header-actions">
        <span
          class="sse-indicator"
          :class="{ active: sseStreaming }"
          :title="sseStreaming ? '实时流已连接' : '实时流未连接'"
        />
        <button
          class="icon-button"
          type="button"
          title="刷新"
          :disabled="loading"
          @click="refreshAll"
        >
          <ReloadOutlined />
        </button>
        <button class="icon-button" type="button" title="诊断导出" @click="openDiagnosticsExport">
          <DownloadOutlined />
        </button>
        <button class="icon-button" type="button" title="设备设置" @click="configOpen = true">
          <SettingOutlined />
        </button>
      </div>
    </header>

    <section class="exam-selector">
      <div class="exam-selector-title">
        <ScanOutlined />
        <span>选择考试</span>
        <span class="exam-selector-required">必填</span>
        <span v-if="examOptionTotal > 0" class="exam-selector-total">
          共 {{ examOptionTotal }} 个可用考试（已自动过滤已归档）
        </span>
      </div>
      <div class="exam-selector-filters">
        <a-input
          v-model:value="examOptionFilter.academicYear"
          placeholder="学年（如 2024-2025）"
          allow-clear
          style="width: 200px"
          :disabled="!canSwitchExam"
          :title="canSwitchExam ? undefined : '当前扫描任务未结束，不能修改考试筛选条件'"
          @change="onExamFilterChange"
        />
        <a-select
          v-model:value="examOptionFilter.semester"
          placeholder="学期"
          allow-clear
          style="width: 140px"
          :disabled="!canSwitchExam"
          :title="canSwitchExam ? undefined : '当前扫描任务未结束，不能修改考试筛选条件'"
          :options="[
            { label: '秋季学期', value: '1' },
            { label: '春季学期', value: '2' },
          ]"
          @change="onExamFilterChange"
        />
        <a-button
          type="primary"
          :loading="examOptionLoading"
          :disabled="!canSwitchExam"
          :title="canSwitchExam ? undefined : '当前扫描任务未结束，不能刷新考试列表'"
          @click="refreshExamOptionsByUser"
        >
          刷新考试列表
        </a-button>
      </div>
      <a-select
        :value="examId || undefined"
        show-search
        allow-clear
        :loading="examOptionLoading"
        :disabled="!canSwitchExam"
        :title="canSwitchExam ? undefined : '当前扫描任务未结束，不能切换考试'"
        :filter-option="false"
        placeholder="搜索并选择考试（按考试名 / 编号模糊匹配）"
        style="width: 100%"
        size="large"
        not-found-content="无符合条件的考试"
        @search="onExamSelectSearch"
        @change="onExamSelectChange"
      >
        <a-select-option
          v-for="item in examOptions"
          :key="item.examId"
          :value="item.examId"
          :label="item.examName"
        >
          <div class="exam-option-row">
            <div class="exam-option-primary">
              <span class="exam-option-name">{{ item.examName }}</span>
              <span class="exam-option-no">{{ item.examNo }}</span>
            </div>
            <div class="exam-option-meta">
              <span v-if="item.courseName">{{ item.courseName }}</span>
              <span v-if="item.academicYear">· {{ item.academicYear }}</span>
              <span v-if="item.semester">
                ·
                {{
                  item.semester === '1' ? '秋季' : item.semester === '2' ? '春季' : item.semester
                }}
              </span>
              <span>· 班级 {{ item.classIds.length }}</span>
              <span>· 已扫批次 {{ item.scanBatchCount }}</span>
            </div>
          </div>
        </a-select-option>
      </a-select>
      <div v-if="selectedExamOption" class="exam-selected-summary">
        <span class="selected-tag">已选</span>
        <strong>{{ selectedExamOption.examName }}</strong>
        <span class="selected-meta">
          {{ selectedExamOption.examNo }}
          <template v-if="selectedExamOption.courseName"
            >· {{ selectedExamOption.courseName }}</template
          >
          <template v-if="selectedExamOption.declaredClassNames.length">
            · 班级:
            <span
              v-for="(name, idx) in selectedExamOption.declaredClassNames"
              :key="`${selectedExamOption.classIds[idx] || idx}`"
              class="selected-class-tag"
            >
              {{ name || `#${selectedExamOption.classIds[idx] || '-'}` }}
            </span>
          </template>
        </span>
      </div>
    </section>

    <section
      v-if="errorMessage || successMessage || busyState.active || pendingUploadDiagnosticText"
      class="notice-stack"
    >
      <div v-if="errorMessage" class="notice danger">
        <CloseCircleOutlined />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-if="successMessage" class="notice success">
        <CheckCircleOutlined />
        <span>{{ successMessage }}</span>
      </div>
      <div v-if="busyState.active" class="notice warning">
        <PauseCircleOutlined />
        <span>{{ busyStateText }} {{ busyState.activeJobId }}</span>
        <button type="button" @click="resetBusyState">停止等待</button>
      </div>
      <div v-if="pendingUploadDiagnosticText" class="notice warning">
        <ExclamationCircleOutlined />
        <span>{{ pendingUploadDiagnosticText }}</span>
      </div>
    </section>

    <section class="hero-band">
      <div class="status-panel">
        <div class="state-line">
          <span
            class="state-dot"
            :class="{
              success: workState.tone === 'success',
              running: workState.tone === 'running',
              danger: workState.tone === 'danger',
            }"
          />
          <strong>{{ workState.text }}</strong>
        </div>
        <div class="progress-track">
          <span :style="{ width: `${scanProgress}%` }" />
        </div>
        <div class="progress-meta">
          <span>{{ uploadStage }}</span>
          <span v-if="currentJob"
            >{{ currentJob.uploadedPages }}/{{ currentJob.scannedPages }} 页</span
          >
          <span v-else>暂无扫描任务</span>
        </div>
        <div class="mode-switch" role="group" aria-label="扫描模式">
          <button
            type="button"
            :class="{ active: scanMode === 'DIRECT' }"
            :disabled="!canSwitchScanMode"
            @click="changeScanMode('DIRECT')"
          >
            首次扫描
          </button>
          <button
            type="button"
            :class="{ active: scanMode === 'SUPPLEMENT' }"
            :disabled="!canSwitchScanMode"
            @click="changeScanMode('SUPPLEMENT')"
          >
            补扫
          </button>
          <button
            type="button"
            :class="{ active: scanMode === 'ARCHIVE' }"
            :disabled="!canSwitchScanMode"
            @click="changeScanMode('ARCHIVE')"
          >
            历史存档
          </button>
        </div>
        <div v-if="scanMode === 'SUPPLEMENT'" class="supplement-form">
          <label>
            <span>目标页号</span>
            <input
              v-model.number="supplementTargetPageNo"
              type="number"
              min="1"
              :disabled="!canSwitchScanMode"
            />
          </label>
          <label class="supplement-mode-field">
            <span>补扫方式</span>
            <div class="supplement-mode-switch" role="group" aria-label="补扫方式">
              <button
                type="button"
                :class="{ active: !supplementReplaceTargetPage }"
                :disabled="!canSwitchScanMode"
                @click="supplementReplaceTargetPage = false"
              >
                追加补扫
              </button>
              <button
                type="button"
                :class="{ active: supplementReplaceTargetPage }"
                :disabled="!canSwitchScanMode"
                @click="supplementReplaceTargetPage = true"
              >
                替换目标页
              </button>
            </div>
          </label>
          <label>
            <span>补扫原因</span>
            <input
              v-model.trim="supplementReason"
              placeholder="漏扫、异常页或替换页"
              :disabled="!canSwitchScanMode"
            />
          </label>
        </div>
        <div class="primary-actions">
          <button
            class="start-button"
            type="button"
            :disabled="!canStartScan"
            @click="submitScanJob"
          >
            <PlayCircleOutlined />
            <span>开始{{ scanModeText(scanMode, '') }}</span>
          </button>
          <button
            class="quiet-button"
            type="button"
            :disabled="!canCancelJob || loading"
            @click="cancelCurrentJob"
          >
            <StopOutlined />
            <span>取消</span>
          </button>
          <button
            class="quiet-button"
            type="button"
            :disabled="!canRetryUpload || loading"
            @click="retryCurrentUpload"
          >
            <CloudUploadOutlined />
            <span>重试上传</span>
          </button>
          <button
            class="quiet-button danger-button"
            type="button"
            :disabled="!canRemoveCurrentJob || loading"
            :title="removeCurrentJobTitle"
            @click="removeCurrentScanJob"
          >
            <DeleteOutlined />
            <span>{{ currentJob?.reported ? '废弃任务' : '删除任务' }}</span>
          </button>
        </div>
        <div class="primary-actions secondary-actions">
          <button
            v-if="currentJob?.status === 'SCANNING'"
            class="quiet-button"
            type="button"
            :disabled="loading"
            @click="pauseCurrentJob"
          >
            <PauseCircleOutlined />
            <span>暂停</span>
          </button>
          <button
            v-if="currentJob?.status === 'PAUSED'"
            class="quiet-button"
            type="button"
            :disabled="loading"
            @click="resumeCurrentJob"
          >
            <PlayCircleOutlined />
            <span>继续</span>
          </button>
          <button
            class="quiet-button"
            type="button"
            :disabled="!canEndBatch || loading"
            @click="endCurrentBatch"
          >
            <ControlOutlined />
            <span>结束本批次</span>
          </button>
          <button
            class="quiet-button"
            type="button"
            :disabled="!canRetryCommit || loading"
            @click="retryCurrentCommit"
            title="commit 阶段失败时重新触发 commit；服务端使用 reportId / batchExternalNo 唯一约束保证幂等"
          >
            <ReloadOutlined />
            <span>重试 commit</span>
          </button>
          <button
            class="quiet-button danger-button"
            type="button"
            :disabled="!canSealLatestBatch"
            @click="sealLatestBatch"
            :title="
              latestBatchSealBlockedReason ||
              '将最近一个已落库扫描批次写入 sealed_at / sealed_by；封存后该批次禁止再写入'
            "
          >
            <StopOutlined />
            <span>封存批次</span>
          </button>
        </div>
        <div v-if="scanBlockedReason" class="block-reason">
          <ExclamationCircleOutlined />
          <span>{{ scanBlockedReason }}</span>
        </div>
      </div>

      <div class="exam-panel">
        <div class="panel-title">
          <ScanOutlined />
          <span>考试上下文</span>
        </div>
        <dl>
          <div>
            <dt>考试编号</dt>
            <dd>{{ kioskContext?.exam.examNo || '-' }}</dd>
          </div>
          <div>
            <dt>考试状态</dt>
            <dd>{{ kioskContext?.exam.statusMessage || kioskContext?.exam.status || '-' }}</dd>
          </div>
          <div>
            <dt>学年学期</dt>
            <dd>{{ examTermText || '-' }}</dd>
          </div>
          <div>
            <dt>班级范围</dt>
            <dd v-if="kioskContext">{{ kioskContext.classIds.length }} 个</dd>
            <dd v-else>等待考试上下文</dd>
          </div>
          <div>
            <dt>班级名称</dt>
            <dd>
              <div v-if="declaredClassChips.length === 0" class="class-chip-empty">-</div>
              <div v-else class="class-chip-list">
                <span
                  v-for="chip in declaredClassChips"
                  :key="chip.key"
                  class="class-chip"
                  :class="{ missing: chip.missing }"
                  :title="chip.label"
                >
                  {{ chip.label }}
                </span>
              </div>
            </dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>{{ formatTime(kioskContext?.exam.examStartTime) }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric">
        <span>已扫页数</span><strong>{{ kioskMetrics.scannedPages }}</strong>
      </div>
      <div class="metric">
        <span>试卷实例</span><strong>{{ kioskMetrics.paperInstances }}</strong>
      </div>
      <div class="metric">
        <span>已绑定</span><strong>{{ kioskMetrics.boundPaperInstances }}</strong>
      </div>
      <div class="metric">
        <span>异常队列</span><strong>{{ kioskMetrics.attentionCount }}</strong>
      </div>
    </section>

    <section class="work-grid">
      <article class="work-panel scanner-panel">
        <div class="panel-title">
          <ApiOutlined />
          <span>一体机状态</span>
        </div>
        <div class="device-line">
          <strong>{{ kioskContext?.device?.deviceName || '未定位设备' }}</strong>
          <span>{{ kioskContext?.device?.onlineStatus || '-' }}</span>
        </div>
        <dl class="compact-list">
          <div>
            <dt>Agent</dt>
            <dd>
              {{ agentHealthStatusLabel(health?.status) }} · {{ health?.agentVersion || '-' }}
            </dd>
          </div>
          <div>
            <dt>本地扫描仪</dt>
            <dd>{{ selectedScanner?.displayName || '未检测到' }}</dd>
          </div>
          <div>
            <dt>待处理</dt>
            <dd>{{ pendingUploadJobsText }}</dd>
          </div>
          <div>
            <dt>设备业务键</dt>
            <dd>{{ kioskContext?.device?.scannerDeviceId || '-' }}</dd>
          </div>
        </dl>
      </article>

      <article class="work-panel policy-panel">
        <div class="panel-title">
          <ControlOutlined />
          <span>服务端扫描策略</span>
        </div>
        <div class="policy-row">
          <span>DPI</span><strong>{{ kioskContext?.policy?.dpi || '-' }}</strong>
          <span>色彩</span>
          <strong>{{ kioskContext?.policy?.colorMode || '-' }}</strong>
          <span>单双面</span>
          <strong>{{ kioskContext?.policy?.duplexMode || '-' }}</strong>
        </div>
        <label class="expected-input">
          <span>预计页数</span>
          <input
            v-model.number="expectedPages"
            type="number"
            min="1"
            placeholder="可选"
            :disabled="!canEditScanSetup"
          />
        </label>
        <div class="policy-note">
          <CheckCircleOutlined />
          <span>{{ scanModeText(scanMode, '完成后自动上传并提交批次') }}</span>
        </div>
      </article>

      <article class="work-panel batch-panel">
        <div class="panel-title">
          <HistoryOutlined />
          <span>最近批次</span>
        </div>
        <strong>{{ latestBatchText }}</strong>
        <dl class="compact-list">
          <div>
            <dt>模式</dt>
            <dd>{{ latestBatchModeText }}</dd>
          </div>
          <div>
            <dt>批次数</dt>
            <dd>{{ kioskMetrics.scanBatchCount }}</dd>
          </div>
          <div>
            <dt>申报页数</dt>
            <dd>{{ latestBatchStatsText.declared }}</dd>
          </div>
          <div>
            <dt>已落库</dt>
            <dd>{{ latestBatchStatsText.received }}</dd>
          </div>
          <div>
            <dt>待上传</dt>
            <dd
              :class="{
                'value-warning': Boolean(latestBatchPageStats && latestBatchPageStats.pending > 0),
              }"
            >
              {{ latestBatchStatsText.pending }}
            </dd>
          </div>
          <div>
            <dt>异常处置</dt>
            <dd
              :class="{
                'value-danger': Boolean(latestBatchPageStats && latestBatchPageStats.attention > 0),
              }"
            >
              {{ latestBatchStatsText.attention }}
            </dd>
          </div>
          <div>
            <dt>时段</dt>
            <dd>{{ latestBatchPeriodText }}</dd>
          </div>
        </dl>
        <div v-if="kioskContext?.latestBatch?.supplementReason" class="batch-note">
          {{ kioskContext.latestBatch.supplementReason }}
        </div>
        <dl v-if="latestBatchLifecycleItems.length" class="compact-list lifecycle-list">
          <div v-for="item in latestBatchLifecycleItems" :key="`${item.label}-${item.value}`">
            <dt>{{ item.label }}</dt>
            <dd :class="{ 'value-danger': item.danger }">{{ item.value }}</dd>
          </div>
        </dl>
      </article>
    </section>

    <section class="detail-grid">
      <article class="stream-panel">
        <div class="panel-title">
          <CloudUploadOutlined />
          <span>页级流水</span>
        </div>
        <div v-if="visiblePages.length === 0" class="empty-state">暂无扫描页</div>
        <button
          v-for="page in visiblePages"
          :key="page.pageNo"
          class="page-row"
          type="button"
          @click="previewPageNo = page.pageNo"
        >
          <span>第 {{ page.pageNo }} 页</span>
          <strong>
            {{ pageStatusText(page.status) }}
            <small v-if="page.diagnostic" class="page-diagnostic">{{ page.diagnostic }}</small>
          </strong>
          <em>{{ Math.round(page.sizeBytes / 1024) }} KB</em>
        </button>
      </article>

      <article class="preview-panel">
        <div class="panel-title">
          <ScanOutlined />
          <span>扫描预览</span>
        </div>
        <img v-if="previewImageUrl" :src="previewImageUrl" alt="扫描页预览" />
        <div v-else class="empty-state">等待扫描页</div>
      </article>

      <article class="exception-panel">
        <div class="panel-title">
          <ExclamationCircleOutlined />
          <span>异常队列</span>
        </div>
        <div v-if="exceptionPages.length === 0" class="empty-state">暂无异常</div>
        <div v-for="page in exceptionPages" :key="page.pageNo" class="exception-row">
          <strong>第 {{ page.pageNo }} 页</strong>
          <span>{{ page.diagnostic || pageStatusText(page.status) }}</span>
          <button
            type="button"
            :disabled="!canSwitchScanMode || loading"
            :title="canSwitchScanMode ? '切换到补扫模式' : '当前扫描任务未结束，不能切换到补扫模式'"
            @click="prepareSupplementScan(page.pageNo, '补扫')"
          >
            补扫
          </button>
          <button
            type="button"
            :disabled="!canSwitchScanMode || loading"
            :title="
              canSwitchScanMode ? '切换到补扫替换模式' : '当前扫描任务未结束，不能切换到补扫模式'
            "
            @click="prepareSupplementScan(page.pageNo, '替换')"
          >
            替换
          </button>
        </div>
        <div class="exception-actions">
          <button type="button" :disabled="!canRetryUpload || loading" @click="retryCurrentUpload">
            重试失败项
          </button>
        </div>
      </article>

      <article class="ledger-panel">
        <div class="panel-title ledger-title">
          <HistoryOutlined />
          <span>页级账本</span>
          <span v-if="pageLedger?.dataSource" class="ledger-source-tag">
            {{ ledgerSourceText(pageLedger.dataSource) }}
          </span>
          <button
            class="ledger-refresh-button"
            type="button"
            :disabled="pageLedgerLoading"
            title="重新拉取当前批次页级账本，断线 / 切换批次时使用"
            @click="onManualRefreshLedger"
          >
            <ReloadOutlined />
            <span>刷新</span>
          </button>
        </div>
        <div v-if="pageLedgerError" class="ledger-error">
          页级账本加载失败：{{ ledgerErrorText(pageLedgerError) }}
        </div>
        <div v-if="pageLedgerLoading && !pageLedger" class="empty-state">加载中…</div>
        <div v-else-if="!pageLedger || pageLedger.items.length === 0" class="empty-state">
          当前批次无页级数据
        </div>
        <template v-else>
          <div class="ledger-summary">
            <span>共 {{ pageLedger.items.length }} 页</span>
            <span>已识别 {{ pageLedger.registeredCount }}</span>
            <span>待识别 {{ pageLedger.pendingCount }}</span>
            <span>异常 {{ pageLedger.attentionCount }}</span>
          </div>
          <div class="ledger-list">
            <div
              v-for="item in pageLedger.items"
              :key="ledgerItemKey(item)"
              class="ledger-row"
              :class="{
                'ledger-row--abnormal': Boolean(item.attentionType),
                'ledger-row--pending': item.registrationStatus === 'PENDING',
                'ledger-row--discarded': item.registrationStatus === 'DISCARDED',
                'ledger-row--superseded': item.registrationStatus === 'SUPERSEDED',
              }"
            >
              <div class="ledger-row-main">
                <strong>第 {{ item.pageNo }} 页</strong>
                <span class="ledger-status">{{
                  registrationStatusText(item.registrationStatus)
                }}</span>
                <span v-if="item.attentionType" class="ledger-attention">
                  {{ attentionTypeText(item.attentionType) }}
                </span>
                <span v-if="item.attentionMessage" class="ledger-diagnostic">
                  {{ item.attentionMessage }}
                </span>
              </div>
              <button
                v-if="pageLedger.dataSource === 'DATABASE' && item.localPageId"
                class="ledger-discard-button"
                type="button"
                :disabled="
                  loading ||
                  !canDiscardLedgerPage ||
                  item.registrationStatus === 'DISCARDED' ||
                  item.registrationStatus === 'SUPERSEDED'
                "
                @click="discardLedgerPage(item)"
              >
                废弃本页
              </button>
            </div>
          </div>
        </template>
      </article>
    </section>

    <aside v-if="configOpen" class="config-drawer">
      <button class="drawer-mask" type="button" @click="configOpen = false" />
      <section class="drawer-panel">
        <header>
          <h2>一体机设置</h2>
          <button class="icon-button" type="button" title="关闭" @click="configOpen = false">
            <CloseCircleOutlined />
          </button>
        </header>
        <div class="config-section">
          <div class="panel-title">
            <LinkOutlined />
            <span>激活</span>
          </div>
          <input
            v-model="activationForm.gatewayBaseUrl"
            placeholder="后端网关地址"
            :disabled="!canActivateAgent || loading"
          />
          <input
            v-model="activationForm.activationCode"
            placeholder="激活码"
            :disabled="!canActivateAgent || loading"
          />
          <input
            v-model="activationForm.endpointName"
            placeholder="端点名称"
            :disabled="!canActivateAgent || loading"
          />
          <button
            class="drawer-primary"
            type="button"
            :disabled="!canActivateAgent || loading"
            :title="canActivateAgent ? '激活一体机' : '当前扫描任务未结束，不能重新激活一体机'"
            @click="activateAgent"
          >
            激活
          </button>
        </div>
        <div class="config-section">
          <div class="panel-title">
            <ScanOutlined />
            <span>本地扫描仪</span>
          </div>
          <select
            v-model="selectedScannerId"
            :disabled="!canSwitchScanner || loading"
            :title="canSwitchScanner ? undefined : '当前扫描任务未结束，不能切换本地扫描仪'"
          >
            <option
              v-for="scanner in availableScanners"
              :key="scanner.localScannerId"
              :value="scanner.localScannerId"
            >
              {{ scanner.displayName }}
            </option>
          </select>
          <button
            type="button"
            :disabled="!canSwitchScanner || loading"
            :title="canSwitchScanner ? '刷新本地扫描仪' : '当前扫描任务未结束，不能刷新本地扫描仪'"
            @click="refreshScannersByUser"
          >
            刷新扫描仪
          </button>
        </div>
        <div class="config-section">
          <button
            class="danger-action"
            type="button"
            :disabled="loading || !health?.bound || !canUnbindAgent"
            :title="canUnbindAgent ? '解除当前一体机绑定' : '当前扫描任务未结束，不能解除绑定'"
            @click="unbindAgent"
          >
            解除绑定
          </button>
        </div>
      </section>
    </aside>
  </main>
</template>

<style scoped>
.scanner-kiosk {
  min-height: 100vh;
  padding: 24px;
  background: #f6f7f9;
  color: #1f2933;
  font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.kiosk-header,
.hero-band,
.work-grid,
.detail-grid,
.metric-grid {
  max-width: 1440px;
  margin: 0 auto;
}

.kiosk-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.eyebrow {
  margin-bottom: 4px;
  color: #687385;
  font-size: 13px;
}

h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0;
}

p {
  margin: 8px 0 0;
  color: #5d6675;
}

.header-actions,
.primary-actions,
.exception-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.sse-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d1d5db;
  transition: background 0.3s;
}

.sse-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #fff;
  color: #314155;
}

.exam-selector {
  max-width: 1440px;
  margin: 0 auto 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e3e7ee;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-selector-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.exam-selector-required {
  font-size: 12px;
  font-weight: 500;
  color: #c0392b;
  background: #fff1f0;
  padding: 1px 8px;
  border-radius: 999px;
}

.exam-selector-total {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: #6b7480;
}

.exam-selector-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.exam-option-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.exam-option-primary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
}

.exam-option-name {
  font-weight: 600;
  color: #1f2937;
}

.exam-option-no {
  font-size: 12px;
  color: #6b7480;
  font-family: 'JetBrains Mono', monospace;
}

.exam-option-meta {
  font-size: 12px;
  color: #6b7480;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.exam-selected-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #f3f8ff;
  border: 1px solid #c8def8;
  border-radius: 8px;
  color: #234982;
  font-size: 13px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #1d6fff;
  border-radius: 4px;
}

.selected-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  color: #4a5568;
}

.selected-class-tag {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 2px;
  background: #fff;
  border: 1px solid #c8def8;
  border-radius: 4px;
  font-size: 12px;
  color: #234982;
}

.notice-stack {
  max-width: 1440px;
  margin: 0 auto 16px;
  display: grid;
  gap: 8px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.notice button {
  margin-left: auto;
  color: inherit;
  background: transparent;
}

.notice.danger {
  background: #fff1f0;
  color: #a61d24;
}

.notice.success {
  background: #f0f8f2;
  color: #23633b;
}

.notice.warning {
  background: #fff7e6;
  color: #8a5200;
}

.hero-band {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.55fr);
  gap: 16px;
  margin-bottom: 16px;
}

.status-panel,
.exam-panel,
.work-panel,
.stream-panel,
.preview-panel,
.exception-panel {
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  background: #fff;
}

.status-panel {
  padding: 24px;
}

.state-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
}

.state-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8a94a6;
}

.state-dot.success {
  background: #237b4b;
}

.state-dot.running {
  background: #1769aa;
}

.state-dot.danger {
  background: #cf222e;
}

.progress-track {
  height: 12px;
  margin: 24px 0 8px;
  overflow: hidden;
  border-radius: 8px;
  background: #edf0f4;
}

.progress-track span {
  display: block;
  height: 100%;
  background: #1769aa;
  transition: width 0.25s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  color: #5d6675;
  font-size: 14px;
}

.primary-actions {
  margin-top: 24px;
}

.mode-switch {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(88px, 1fr));
  gap: 4px;
  margin-top: 20px;
  padding: 4px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #f8fafc;
}

.mode-switch button {
  min-height: 36px;
  border-radius: 6px;
  background: transparent;
  color: #314155;
}

.mode-switch button.active {
  background: #1f2933;
  color: #fff;
}

.supplement-form {
  display: grid;
  grid-template-columns: 140px 220px minmax(240px, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.supplement-form label {
  display: grid;
  gap: 8px;
  color: #687385;
  font-size: 13px;
}

.supplement-form input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #fff;
  color: #1f2933;
}

.supplement-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  height: 38px;
  padding: 3px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #f8fafc;
}

.supplement-mode-switch button {
  min-width: 0;
  border-radius: 6px;
  background: transparent;
  color: #314155;
  font-size: 13px;
  white-space: nowrap;
}

.supplement-mode-switch button.active {
  background: #1769aa;
  color: #fff;
}

.start-button,
.quiet-button,
.drawer-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 8px;
}

.start-button,
.drawer-primary {
  background: #1769aa;
  color: #fff;
}

.quiet-button {
  border: 1px solid #d7dce3;
  background: #fff;
  color: #314155;
}

.secondary-actions {
  margin-top: 8px;
  flex-wrap: wrap;
}

.danger-button {
  border-color: #ffccc7;
  color: #a61d24;
  background: #fff7f6;
}

.danger-button:hover:not(:disabled) {
  background: #ffeceb;
}

.block-reason,
.policy-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: #8a5200;
  font-size: 14px;
}

.exam-panel,
.work-panel,
.stream-panel,
.preview-panel,
.exception-panel {
  padding: 16px;
}

.exam-term-tag {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #e7f1fa;
  color: #1769aa;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.class-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 96px;
  overflow-y: auto;
}

.class-chip {
  display: inline-flex;
  align-items: center;
  max-width: 200px;
  padding: 2px 10px;
  border: 1px solid #d7e2ee;
  border-radius: 999px;
  background: #f1f6fb;
  color: #1f4f86;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.class-chip.missing {
  border-color: #f3c8c8;
  background: #fff1f0;
  color: #a61d24;
}

.class-chip-empty {
  color: #8a94a6;
  font-size: 13px;
}

.value-warning {
  color: #b25000 !important;
}

.value-danger {
  color: #a61d24 !important;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #314155;
  font-weight: 600;
}

dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

dt {
  color: #687385;
  font-size: 12px;
}

dd {
  margin: 4px 0 0;
  color: #1f2933;
  font-weight: 600;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  padding: 16px;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  background: #fff;
}

.metric span {
  display: block;
  color: #687385;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
}

.work-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.device-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.compact-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid #eef1f4;
}

.compact-list dd {
  text-align: right;
}

.batch-note {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #d7e2ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #314155;
  font-size: 13px;
  line-height: 1.5;
}

.lifecycle-list {
  margin-top: 8px;
}

.policy-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.policy-row span {
  color: #687385;
}

.expected-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.expected-input input,
.config-section input,
.config-section select {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #fff;
}

.detail-grid {
  display: grid;
  /*
   * 桌面：四列等宽承载 stream / preview / exception / ledger，每列最低 260px；
   * 紧凑屏（< 1280px）：auto-fit 自动回流，preview-panel 通过下面的 grid-column: span 2 占双列保证扫描预览不被压扁。
   */
  grid-template-columns: repeat(4, minmax(260px, 1fr));
  gap: 16px;
}

@media (max-width: 1280px) {
  .detail-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

.detail-grid > .preview-panel {
  /* 扫描预览天然是大图，桌面给它占用两列以匹配视觉权重；紧凑屏 auto-fit 时退回单列。 */
  grid-column: span 2;
}

@media (max-width: 1280px) {
  .detail-grid > .preview-panel {
    grid-column: auto;
  }
}

.stream-panel,
.preview-panel,
.exception-panel,
.ledger-panel {
  min-height: 420px;
}

.ledger-panel {
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ledger-source-tag {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef4ff;
  color: #1769aa;
  font-size: 12px;
}

.ledger-refresh-button {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d7dce3;
  background: #fff;
  border-radius: 6px;
  color: #314155;
  cursor: pointer;
}

.ledger-refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ledger-summary {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #4a5666;
}

.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 360px;
}

.ledger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 13px;
  color: #1f2933;
}

.ledger-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
}

.ledger-row--abnormal {
  background: #fff5f5;
  color: #a61d24;
}

.ledger-row--pending {
  background: #fffbe6;
  color: #8a5200;
}

.ledger-row--discarded {
  background: #f6f7f9;
  color: #687385;
}

.ledger-row--superseded {
  background: #eef4ff;
  color: #31507a;
}

.ledger-status {
  font-weight: 500;
}

.ledger-attention {
  padding: 1px 6px;
  border-radius: 999px;
  background: #ffeceb;
  color: #a61d24;
  font-size: 12px;
}

.ledger-diagnostic {
  color: #6b7280;
  font-size: 12px;
}

.ledger-discard-button {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  background: #fff;
  color: #a61d24;
  font-size: 12px;
  cursor: pointer;
}

.ledger-discard-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ledger-error {
  padding: 6px 10px;
  background: #fff5f5;
  border: 1px solid #ffccc7;
  color: #a61d24;
  border-radius: 6px;
  font-size: 13px;
}

.page-row,
.exception-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 42px;
  padding: 0 10px;
  border-top: 1px solid #eef1f4;
  background: #fff;
  color: #314155;
  text-align: left;
}

.page-row em {
  color: #687385;
  font-style: normal;
}

.page-diagnostic {
  display: block;
  max-width: 520px;
  margin-top: 2px;
  color: #a61d24;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.preview-panel img {
  width: 100%;
  max-height: 560px;
  object-fit: contain;
  border: 1px solid #eef1f4;
  border-radius: 8px;
  background: #f8fafc;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: #8a94a6;
  border: 1px dashed #d7dce3;
  border-radius: 8px;
  background: #fafbfc;
}

.exception-row {
  grid-template-columns: auto 1fr auto auto;
}

.exception-row button {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #fff;
  color: #314155;
}

.exception-actions {
  margin-top: 16px;
}

.exception-actions button,
.config-section button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #d7dce3;
  border-radius: 8px;
  background: #fff;
  color: #314155;
}

.config-drawer {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgb(15 23 42 / 32%);
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(420px, 100vw);
  height: 100%;
  padding: 20px;
  background: #fff;
  box-shadow: -8px 0 24px rgb(15 23 42 / 12%);
}

.drawer-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.drawer-panel h2 {
  margin: 0;
  font-size: 20px;
}

.config-section {
  display: grid;
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid #eef1f4;
}

.danger-action {
  color: #a61d24 !important;
}

@media (max-width: 1100px) {
  .hero-band,
  .work-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .scanner-kiosk {
    padding: 16px;
  }

  .kiosk-header,
  .primary-actions,
  .progress-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .policy-row {
    grid-template-columns: auto 1fr;
  }

  .supplement-form {
    grid-template-columns: 1fr;
  }
}
</style>
