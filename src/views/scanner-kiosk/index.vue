<script setup lang="ts">
import type {
  AgentHealthResponse,
  ScanJobResponse,
  ScannerAgentActivateResponse,
  ScannerDeviceInfo,
} from '@/apis/mark/scanner-agent-local'
import type { ExamScannerKioskContextVO, ScannerKioskScanMode } from '@/apis/mark/scanner-kiosk'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  ControlOutlined,
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  activateLocalAgent,
  cancelScanJob,
  getAgentHealth,
  getLocalAgentBaseUrl,
  getPageImageUrl,
  getScanJob,
  listLocalScanners,
  openDiagnosticsExport,
  retryUpload,
  ScannerBusyError,
  startScanJob,
  unbindLocalAgent,
} from '@/apis/mark/scanner-agent-local'
import { getScannerKioskContext } from '@/apis/mark/scanner-kiosk'
import { useScanLiveStream } from '@/composables/useScanLiveStream'

const route = useRoute()
const agentBaseUrl = getLocalAgentBaseUrl()
const gatewayBaseUrlEnv = import.meta.env.VITE_SCANNER_GATEWAY_BASE_URL
const defaultGatewayBaseUrl = typeof gatewayBaseUrlEnv === 'string' ? gatewayBaseUrlEnv.trim() : ''

const health = ref<AgentHealthResponse | null>(null)
const scanners = ref<ScannerDeviceInfo[]>([])
const selectedScannerId = ref('')
const kioskContext = ref<ExamScannerKioskContextVO | null>(null)
const currentJob = ref<ScanJobResponse | null>(null)
const activationResponse = ref<ScannerAgentActivateResponse | null>(null)
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
const busyState = ref<{ active: boolean, activeJobId: string, activeJob: ScanJobResponse | null }>({
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

const {
  events: liveEvents,
  isStreaming: sseStreaming,
  start: startSse,
  stop: stopSse,
  refresh: refreshSse,
} = useScanLiveStream({
  filter: () => ({
    examId: examId.value || undefined,
    scannerDeviceId: queryScannerDeviceId.value || undefined,
  }),
  initialLimit: 20,
  maxEvents: 50,
})

const examId = computed(() => queryValue(route.query.examId))
const queryScannerDeviceId = computed(() => queryValue(route.query.scannerDeviceId))
const queryScannerStationId = computed(() => queryValue(route.query.scannerStationId))
const availableScanners = computed(() => scanners.value.filter((item) => item.available))
const selectedScanner = computed(() =>
  scanners.value.find((item) => item.localScannerId === selectedScannerId.value),
)
const visiblePages = computed(
  () => currentJob.value?.pages.filter((item) => item.status !== 'DELETED') ?? [],
)
const exceptionPages = computed(() =>
  visiblePages.value.filter((item) => {
    const status = item.status.toUpperCase()
    return status === 'FAILED' || status === 'UPLOAD_FAILED' || Boolean(item.diagnostic)
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
const jobIsTerminal = computed(() => {
  const status = currentJob.value?.status.toUpperCase()
  return status === 'REPORTED' || status === 'FAILED' || status === 'CANCELLED'
})
const scanBlockedReason = computed(() => {
  if (!examId.value) return '缺少考试入口参数 examId'
  if (!health.value?.bound) return '一体机未激活'
  if (health.value?.tokenResetRequired) return '服务端已重置设备 token'
  if (health.value?.upgradeRequired) return '本地 Agent 或 WebView2 客户端需要升级'
  if (!health.value?.scannerConnected) return '本地扫描仪未连接'
  if (!health.value?.scanAllowed) return '服务端心跳未允许扫描'
  if (!selectedScannerId.value) return '未检测到可用本地扫描仪'
  if (!kioskContext.value) return '考试扫描上下文未加载'
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
const workState = computed(() => {
  const status = currentJob.value?.status.toUpperCase()
  if (status === 'REPORTED') return { text: '已自动上传并提交批次', tone: 'success' }
  if (status === 'FAILED') return { text: '存在失败项', tone: 'danger' }
  if (status === 'CANCELLED') return { text: '已取消', tone: 'muted' }
  if (currentJob.value)
    return { text: scanModeText(currentJob.value.scanMode, '上传中'), tone: 'running' }
  if (scanBlockedReason.value) return { text: '入口阻断', tone: 'danger' }
  return { text: `可开始${scanModeText(scanMode.value, '')}`, tone: 'ready' }
})
const uploadStage = computed(() => {
  if (!currentJob.value) return '等待扫描'
  if (currentJob.value.reported) return '服务端已接收批次'
  if (currentJob.value.scannedPages === 0) return '等待扫描仪送纸'
  if (currentJob.value.uploadedPages < currentJob.value.scannedPages) return '页面自动上传中'
  return '批次自动提交中'
})
const latestBatchText = computed(() => {
  const batch = kioskContext.value?.latestBatch
  if (!batch) return '暂无批次'
  return `${batch.batchNo || batch.batchExternalNo || batch.scanBatchId} · ${batch.statusMessage || batch.status}`
})

onMounted(async () => {
  await refreshAll()
  healthTimer = window.setInterval(() => refreshHealth().catch(handleError), 5000)
  contextTimer = window.setInterval(() => refreshKioskContext().catch(handleError), 15000)
  if (examId.value) {
    startSse().catch(handleError)
  }
})

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
        refreshKioskContext().catch(handleError)
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
  if (!selectedScannerId.value && availableScanners.value.length > 0) {
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

async function submitScanJob() {
  if (!kioskContext.value || !canStartScan.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  resetBusyState()
  const isSupplement = scanMode.value === 'SUPPLEMENT'
  try {
    currentJob.value = await startScanJob({
      context: kioskContext.value,
      localScannerId: selectedScannerId.value,
      expectedPages: expectedPages.value,
      scanMode: scanMode.value,
      targetPageNo: isSupplement ? supplementTargetPageNo.value : undefined,
      supplementReason: isSupplement ? supplementReason.value.trim() || undefined : undefined,
    })
    startJobPolling(currentJob.value.scanJobId)
  } catch (error) {
    if (error instanceof ScannerBusyError) {
      enterBusyState(error.activeJobId)
      return
    }
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function changeScanMode(mode: ScannerKioskScanMode) {
  if (scanMode.value === mode) return
  scanMode.value = mode
  if (mode !== 'SUPPLEMENT') {
    supplementTargetPageNo.value = undefined
    supplementReason.value = ''
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
  scanMode.value = 'SUPPLEMENT'
  supplementTargetPageNo.value = pageNo
  supplementReason.value = `${action}第 ${pageNo} 页`
  errorMessage.value = ''
  await refreshKioskContext()
}

async function activateAgent() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const payload = validateActivationForm()
    activationResponse.value = await activateLocalAgent(payload)
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
  loading.value = true
  errorMessage.value = ''
  try {
    currentJob.value = await cancelScanJob(currentJob.value.scanJobId)
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

function startJobPolling(scanJobId: string) {
  if (jobTimer) window.clearInterval(jobTimer)
  jobTimer = window.setInterval(async () => {
    try {
      const prevPageCount = currentJob.value?.pages.length ?? 0
      currentJob.value = await getScanJob(scanJobId)
      if (currentJob.value.pages.length > prevPageCount) {
        const lastPage = visiblePages.value.at(-1)
        if (lastPage) previewPageNo.value = lastPage.pageNo
      }
      if (jobIsTerminal.value) {
        if (jobTimer) window.clearInterval(jobTimer)
        jobTimer = undefined
        await refreshKioskContext()
      }
    } catch (error) {
      handleError(error)
    }
  }, 1500)
}

function enterBusyState(activeJobId: string) {
  busyState.value = { active: true, activeJobId, activeJob: null }
  pollActiveJob(activeJobId)
  if (busyPollTimer) window.clearInterval(busyPollTimer)
  busyPollTimer = window.setInterval(() => pollActiveJob(activeJobId), 2000)
}

async function pollActiveJob(activeJobId: string) {
  try {
    const job = await getScanJob(activeJobId)
    busyState.value.activeJob = job
    if (['REPORTED', 'CANCELLED', 'FAILED'].includes(job.status.toUpperCase())) {
      resetBusyState()
      successMessage.value = '上一扫描任务已结束'
    }
  } catch {}
}

function resetBusyState() {
  if (busyPollTimer) {
    window.clearInterval(busyPollTimer)
    busyPollTimer = undefined
  }
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

function pageStatusText(status: string) {
  const value = status.toUpperCase()
  if (value === 'UPLOADED') return '已上传'
  if (value === 'SCANNED') return '已扫描'
  if (value === 'FAILED' || value === 'UPLOAD_FAILED') return '失败'
  return status || '处理中'
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

function handleError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <main class="scanner-kiosk">
    <header class="kiosk-header">
      <div>
        <div class="eyebrow">高校期末考试</div>
        <h1>期末考试扫描工作台</h1>
        <p>{{ kioskContext?.exam.examName || '等待考试上下文' }}</p>
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

    <section v-if="errorMessage || successMessage || busyState.active" class="notice-stack">
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
        <span>扫描仪正在执行任务 {{ busyState.activeJobId }}</span>
        <button type="button" @click="resetBusyState">停止等待</button>
      </div>
    </section>

    <section class="hero-band">
      <div class="status-panel">
        <div class="state-line">
          <span class="state-dot" :class="workState.tone" />
          <strong>{{ workState.text }}</strong>
        </div>
        <div class="progress-track">
          <span :style="{ width: `${scanProgress}%` }" />
        </div>
        <div class="progress-meta">
          <span>{{ uploadStage }}</span>
          <span>{{ currentJob?.uploadedPages || 0 }}/{{ currentJob?.scannedPages || 0 }} 页</span>
        </div>
        <div class="mode-switch" role="group" aria-label="扫描模式">
          <button
            type="button"
            :class="{ active: scanMode === 'DIRECT' }"
            @click="changeScanMode('DIRECT')"
          >
            首次扫描
          </button>
          <button
            type="button"
            :class="{ active: scanMode === 'SUPPLEMENT' }"
            @click="changeScanMode('SUPPLEMENT')"
          >
            补扫
          </button>
          <button
            type="button"
            :class="{ active: scanMode === 'ARCHIVE' }"
            @click="changeScanMode('ARCHIVE')"
          >
            历史存档
          </button>
        </div>
        <div v-if="scanMode === 'SUPPLEMENT'" class="supplement-form">
          <label>
            <span>目标页号</span>
            <input v-model.number="supplementTargetPageNo" type="number" min="1" />
          </label>
          <label>
            <span>补扫原因</span>
            <input v-model.trim="supplementReason" placeholder="漏扫、异常页或替换页" />
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
            :disabled="!currentJob || jobIsTerminal"
            @click="cancelCurrentJob"
          >
            <StopOutlined />
            <span>取消</span>
          </button>
          <button
            class="quiet-button"
            type="button"
            :disabled="!currentJob"
            @click="retryCurrentUpload"
          >
            <CloudUploadOutlined />
            <span>重试上传</span>
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
            <dt>班级范围</dt>
            <dd>{{ kioskContext?.classIds.length || 0 }} 个</dd>
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
        <span>已扫页数</span><strong>{{ kioskContext?.scannedPages ?? 0 }}</strong>
      </div>
      <div class="metric">
        <span>试卷实例</span><strong>{{ kioskContext?.paperInstances ?? 0 }}</strong>
      </div>
      <div class="metric">
        <span>已绑定</span><strong>{{ kioskContext?.boundPaperInstances ?? 0 }}</strong>
      </div>
      <div class="metric">
        <span>异常队列</span><strong>{{ kioskContext?.attentionCount ?? 0 }}</strong>
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
            <dd>{{ health?.status || '-' }} · {{ health?.agentVersion || '-' }}</dd>
          </div>
          <div>
            <dt>本地扫描仪</dt>
            <dd>{{ selectedScanner?.displayName || '未检测到' }}</dd>
          </div>
          <div>
            <dt>待处理</dt>
            <dd>{{ health?.pendingUploadJobs ?? 0 }} 个任务</dd>
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
          <input v-model.number="expectedPages" type="number" min="1" placeholder="可选" />
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
            <dt>批次数</dt>
            <dd>{{ kioskContext?.scanBatchCount ?? 0 }}</dd>
          </div>
          <div>
            <dt>页数</dt>
            <dd>{{ kioskContext?.latestBatch?.pageCount ?? 0 }}</dd>
          </div>
          <div>
            <dt>开始</dt>
            <dd>{{ formatTime(kioskContext?.latestBatch?.scanStartTime) }}</dd>
          </div>
          <div>
            <dt>结束</dt>
            <dd>{{ formatTime(kioskContext?.latestBatch?.scanEndTime) }}</dd>
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
          <strong>{{ pageStatusText(page.status) }}</strong>
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
          <button type="button" @click="prepareSupplementScan(page.pageNo, '补扫')">补扫</button>
          <button type="button" @click="prepareSupplementScan(page.pageNo, '替换')">替换</button>
        </div>
        <div class="exception-actions">
          <button type="button" :disabled="!currentJob" @click="retryCurrentUpload">
            重试失败项
          </button>
        </div>
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
          <input v-model="activationForm.gatewayBaseUrl" placeholder="后端网关地址" />
          <input v-model="activationForm.activationCode" placeholder="激活码" />
          <input v-model="activationForm.endpointName" placeholder="端点名称" />
          <button class="drawer-primary" type="button" :disabled="loading" @click="activateAgent">
            激活
          </button>
        </div>
        <div class="config-section">
          <div class="panel-title">
            <ScanOutlined />
            <span>本地扫描仪</span>
          </div>
          <select v-model="selectedScannerId">
            <option
              v-for="scanner in availableScanners"
              :key="scanner.localScannerId"
              :value="scanner.localScannerId"
            >
              {{ scanner.displayName }}
            </option>
          </select>
          <button type="button" @click="refreshScanners">刷新扫描仪</button>
        </div>
        <div class="config-section">
          <button
            class="danger-action"
            type="button"
            :disabled="loading || !health?.bound"
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

.state-dot.success,
.state-dot.ready {
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
  grid-template-columns: 160px minmax(240px, 1fr);
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
  grid-template-columns: minmax(280px, 0.8fr) minmax(360px, 1.2fr) minmax(280px, 0.8fr);
  gap: 16px;
}

.stream-panel,
.preview-panel,
.exception-panel {
  min-height: 420px;
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
