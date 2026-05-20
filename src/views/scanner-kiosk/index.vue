<script setup lang="ts">
import type {
  AgentHealthResponse,
  ScanJobResponse,
  ScannerAgentActivateResponse,
  ScannerDeviceInfo,
  StartScanJobRequest,
} from '@/apis/mark/scanner-agent-local'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

type ColorMode = 'COLOR' | 'GRAY' | 'LINEART'
type DuplexMode = 'SIMPLEX' | 'DUPLEX'

const STEPS = [
  { key: 'connect', label: '连接激活', icon: 'link' },
  { key: 'scanner', label: '扫描仪', icon: 'scan' },
  { key: 'params', label: '扫描参数', icon: 'settings' },
  { key: 'progress', label: '任务进度', icon: 'activity' },
] as const

const currentStep = ref(0)
const health = ref<AgentHealthResponse | null>(null)
const scanners = ref<ScannerDeviceInfo[]>([])
const selectedScannerId = ref('')
const currentJob = ref<ScanJobResponse | null>(null)
const activationResponse = ref<ScannerAgentActivateResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const agentBaseUrl = getLocalAgentBaseUrl()
const gatewayBaseUrlEnv = import.meta.env.VITE_SCANNER_GATEWAY_BASE_URL
const defaultGatewayBaseUrl = typeof gatewayBaseUrlEnv === 'string' ? gatewayBaseUrlEnv.trim() : ''
const previewPageNo = ref<number>(0)

const busyState = ref<{ active: boolean, activeJobId: string, activeJob: ScanJobResponse | null }>({
  active: false,
  activeJobId: '',
  activeJob: null,
})
let busyPollTimer: number | undefined

const previewImageUrl = computed(() => {
  if (!currentJob.value || previewPageNo.value === 0) return ''
  return getPageImageUrl(currentJob.value.scanJobId, previewPageNo.value)
})

const visiblePages = computed(() => {
  if (!currentJob.value) return []
  return currentJob.value.pages.filter((p) => p.status !== 'DELETED')
})

const activationForm = ref({
  gatewayBaseUrl: defaultGatewayBaseUrl,
  activationCode: '',
  endpointName: '',
})

const scanForm = ref({
  examId: '',
  declaredClassIdsText: '',
  scannerDeviceId: '',
  scannerStationId: '',
  dpi: 300,
  colorMode: 'GRAY' as ColorMode,
  duplexMode: 'SIMPLEX' as DuplexMode,
  expectedPages: undefined as number | undefined,
  blankPageDetectionEnabled: false,
})

let healthTimer: number | undefined
let jobTimer: number | undefined

const availableScanners = computed(() => scanners.value.filter((s) => s.available))
const selectedScanner = computed(() =>
  scanners.value.find((s) => s.localScannerId === selectedScannerId.value),
)
const canStartScan = computed(() => {
  return Boolean(
    health.value?.bound
    && health.value.scannerConnected
    && !health.value.upgradeRequired
    && !health.value.tokenResetRequired
    && selectedScannerId.value
    && scanForm.value.examId.trim()
    && scanForm.value.declaredClassIdsText.trim()
    && scanForm.value.scannerDeviceId.trim()
    && scanForm.value.scannerStationId.trim(),
  )
})

const jobStatusTone = computed(() => {
  const status = currentJob.value?.status
  if (status === 'REPORTED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'CANCELLED') return 'muted'
  return 'warning'
})

const jobIsTerminal = computed(() => {
  const s = currentJob.value?.status
  return s === 'REPORTED' || s === 'FAILED' || s === 'CANCELLED'
})

const scanProgress = computed(() => {
  if (!currentJob.value) return 0
  const { scannedPages, uploadedPages } = currentJob.value
  if (currentJob.value.reported) return 100
  if (scannedPages === 0) return 5
  const uploaded = uploadedPages / Math.max(scannedPages, 1)
  return Math.min(Math.round(10 + uploaded * 85), 95)
})

const canGoNext = computed(() => {
  if (currentStep.value === 0) return health.value?.bound === true
  if (currentStep.value === 1)
    return Boolean(selectedScannerId.value && health.value?.scannerConnected)
  if (currentStep.value === 2) return canStartScan.value
  return false
})

watch(
  () => health.value?.bound,
  (bound, prevBound) => {
    if (bound && currentStep.value === 0) {
      if (health.value?.scannerConnected) {
        currentStep.value = 2
      } else {
        currentStep.value = 1
      }
      return
    }
    if (prevBound === true && bound === false) {
      activationResponse.value = null
      currentJob.value = null
      selectedScannerId.value = ''
      if (jobTimer) {
        window.clearInterval(jobTimer)
        jobTimer = undefined
      }
      resetBusyState()
      currentStep.value = 0
      if (health.value?.tokenResetRequired) {
        errorMessage.value = '服务端已重置 token，请使用管理员新生成的激活码重新激活'
      } else {
        errorMessage.value = '设备绑定已失效，请重新激活'
      }
    }
  },
)

const upgradeBannerVisible = computed(() => Boolean(health.value?.upgradeRequired))
const upgradeBannerMessage = computed(() => {
  if (!health.value?.upgradeRequired) return ''
  const agentMin = health.value.minimumAgentVersion || '未知'
  const agentLatest = health.value.latestAgentVersion || '未知'
  const clientMin = health.value.minimumClientVersion || '未知'
  const clientLatest = health.value.latestClientVersion || '未知'
  return `服务端要求升级：Agent 当前版本=${health.value.agentVersion} 最低=${agentMin} 最新=${agentLatest}；WebView2 客户端最低=${clientMin} 最新=${clientLatest}。请联系管理员推送最新安装包后重启一体机。`
})

onMounted(async () => {
  await refreshAll()
  healthTimer = window.setInterval(() => {
    refreshHealth().catch(handleError)
  }, 5000)
})

onBeforeUnmount(() => {
  if (healthTimer) window.clearInterval(healthTimer)
  if (jobTimer) window.clearInterval(jobTimer)
  if (busyPollTimer) window.clearInterval(busyPollTimer)
})

async function refreshAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([refreshHealth(), refreshScanners()])
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

async function activateAgent() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const payload = validateActivationForm()
    activationResponse.value = await activateLocalAgent(payload)
    scanForm.value.scannerDeviceId = activationResponse.value.scannerDeviceId
    scanForm.value.scannerStationId = activationResponse.value.scannerStationId
    if (activationResponse.value.defaultExamId) {
      scanForm.value.examId = activationResponse.value.defaultExamId
    }
    if (activationResponse.value.defaultClassIds.length > 0) {
      scanForm.value.declaredClassIdsText = activationResponse.value.defaultClassIds.join(',')
    }
    successMessage.value = '设备激活成功'
    await refreshHealth()
    currentStep.value = 1
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
    activationResponse.value = null
    currentJob.value = null
    successMessage.value = '绑定已清除'
    await refreshHealth()
    currentStep.value = 0
  } catch (error) {
    handleError(error)
  } finally {
    loading.value = false
  }
}

async function submitScanJob() {
  if (!canStartScan.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  resetBusyState()
  try {
    const examId = normalizePositiveIntegerId(scanForm.value.examId, '考试 ID')
    const declaredClassIds = parseDeclaredClassIds(scanForm.value.declaredClassIdsText)
    const payload: StartScanJobRequest = {
      examId,
      declaredClassIds,
      scannerDeviceId: scanForm.value.scannerDeviceId.trim(),
      scannerStationId: scanForm.value.scannerStationId.trim(),
      localScannerId: selectedScannerId.value,
      dpi: scanForm.value.dpi,
      colorMode: scanForm.value.colorMode,
      duplexMode: scanForm.value.duplexMode,
      expectedPages: scanForm.value.expectedPages,
      blankPageDetectionEnabled: scanForm.value.blankPageDetectionEnabled,
    }
    currentJob.value = await startScanJob(payload)
    currentStep.value = 3
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

function validateActivationForm() {
  const gatewayBaseUrl = activationForm.value.gatewayBaseUrl.trim()
  const activationCode = activationForm.value.activationCode.trim()
  const endpointName = activationForm.value.endpointName.trim()
  if (!gatewayBaseUrl) {
    throw new Error('请输入后端网关地址')
  }
  let url: URL
  try {
    url = new URL(gatewayBaseUrl)
  } catch {
    throw new Error('后端网关地址格式不正确')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('后端网关地址必须以 http:// 或 https:// 开头')
  }
  if (!activationCode) {
    throw new Error('请输入激活码')
  }
  if (!endpointName) {
    throw new Error('请输入端点名称')
  }
  activationForm.value.gatewayBaseUrl = gatewayBaseUrl.replace(/\/+$/, '')
  activationForm.value.activationCode = activationCode
  activationForm.value.endpointName = endpointName
  return {
    gatewayBaseUrl: activationForm.value.gatewayBaseUrl,
    activationCode,
    endpointName,
  }
}

function normalizePositiveIntegerId(value: string, label: string) {
  const normalized = value.trim()
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new Error(`${label} 必须是正整数字符串`)
  }
  return normalized
}

function parseDeclaredClassIds(text: string) {
  const parts = text.split(',').map((v) => v.trim())
  if (parts.length === 0 || parts.every((v) => !v)) {
    throw new Error('班级 ID 集合不能为空')
  }
  const invalid = parts.find((v) => !v || !/^[1-9]\d*$/.test(v))
  if (invalid !== undefined) {
    throw new Error(`班级 ID "${invalid || '空值'}" 不是正整数字符串`)
  }
  return parts
}

function enterBusyState(activeJobId: string) {
  busyState.value = { active: true, activeJobId, activeJob: null }
  errorMessage.value = ''
  pollActiveJob(activeJobId)
  if (busyPollTimer) window.clearInterval(busyPollTimer)
  busyPollTimer = window.setInterval(() => pollActiveJob(activeJobId), 2000)
}

async function pollActiveJob(activeJobId: string) {
  try {
    const job = await getScanJob(activeJobId)
    busyState.value.activeJob = job
    const terminalStatuses = ['REPORTED', 'CANCELLED', 'FAILED']
    if (terminalStatuses.includes(job.status.toUpperCase())) {
      resetBusyState()
      successMessage.value = `扫描仪上一任务（${activeJobId}）已${terminalStatusLabel(job.status)}，可重新提交`
    }
  } catch {}
}

function terminalStatusLabel(status: string) {
  const value = status.toUpperCase()
  if (value === 'REPORTED') return '完成'
  if (value === 'CANCELLED') return '取消'
  if (value === 'FAILED') return '失败'
  return value
}

function resetBusyState() {
  if (busyPollTimer) {
    window.clearInterval(busyPollTimer)
    busyPollTimer = undefined
  }
  busyState.value = { active: false, activeJobId: '', activeJob: null }
}

async function retryAfterBusy() {
  resetBusyState()
  await submitScanJob()
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
        const lastVisible = currentJob.value.pages.filter((p) => p.status !== 'DELETED').at(-1)
        if (lastVisible) previewPageNo.value = lastVisible.pageNo
      }
      if (jobIsTerminal.value) {
        if (jobTimer) window.clearInterval(jobTimer)
        jobTimer = undefined
      }
    } catch (error) {
      handleError(error)
    }
  }, 1500)
}

function goNext() {
  if (currentStep.value < STEPS.length - 1) currentStep.value++
}

function goPrev() {
  if (currentStep.value > 0) currentStep.value--
}

function goToStep(index: number) {
  if (index <= currentStep.value) currentStep.value = index
}

function dismissMessage() {
  errorMessage.value = ''
  successMessage.value = ''
}

function handleError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <main class="kiosk">
    <header class="kiosk-header">
      <div class="kiosk-brand">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 8h20" />
          <path d="M6 12h4" />
          <path d="M6 16h8" />
        </svg>
        <span class="brand-text">NYBC 扫描工作台</span>
      </div>
      <nav class="step-nav">
        <button
          v-for="(step, idx) in STEPS"
          :key="step.key"
          class="step-item" :class="[{ active: idx === currentStep, done: idx < currentStep }]"
          type="button"
          @click="goToStep(idx)"
        >
          <span class="step-num">{{ idx < currentStep ? '✓' : idx + 1 }}</span>
          <span class="step-label">{{ step.label }}</span>
        </button>
      </nav>
      <div class="header-status">
        <span class="status-beacon" :class="[health?.bound ? 'online' : 'offline']" />
        <span class="status-text">{{ health?.bound ? '已绑定' : '未绑定' }}</span>
      </div>
    </header>

    <Transition name="toast">
      <div v-if="errorMessage || successMessage" class="toast-bar" @click="dismissMessage">
        <div v-if="errorMessage" class="toast toast-error">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <div v-if="successMessage" class="toast toast-success">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div v-if="upgradeBannerVisible" class="upgrade-banner">
        <div class="upgrade-banner-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22V8" />
            <path d="m5 15 7-7 7 7" />
            <path d="M5 3h14" />
          </svg>
        </div>
        <div class="upgrade-banner-body">
          <div class="upgrade-banner-title">需要升级才能继续扫描</div>
          <div class="upgrade-banner-message">{{ upgradeBannerMessage }}</div>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div v-if="busyState.active" class="busy-banner">
        <div class="busy-banner-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div class="busy-banner-body">
          <div class="busy-banner-title">扫描仪正在执行其他扫描任务</div>
          <div class="busy-banner-meta">
            <span>活动任务：<code>{{ busyState.activeJobId }}</code></span>
            <span v-if="busyState.activeJob">
              状态：{{ busyState.activeJob.status }} · {{ busyState.activeJob.scannedPages }}/{{
                busyState.activeJob.pages.length
              }}
              页
            </span>
          </div>
          <div v-if="busyState.activeJob?.message" class="busy-banner-message">
            {{ busyState.activeJob.message }}
          </div>
        </div>
        <div class="busy-banner-actions">
          <button class="btn btn-secondary" type="button" @click="resetBusyState">取消等待</button>
          <button class="btn btn-primary" type="button" :disabled="loading" @click="retryAfterBusy">
            立即重试
          </button>
        </div>
      </div>
    </Transition>

    <section class="kiosk-body">
      <article v-show="currentStep === 0" class="step-panel">
        <div class="panel-icon-header">
          <div class="icon-circle">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <h2>连接与激活</h2>
            <p class="subtitle">将本设备绑定至阅卷平台，建立安全通道</p>
          </div>
        </div>

        <div class="info-strip">
          <div class="info-item">
            <span class="info-label">Agent 地址</span>
            <span class="info-value">{{ agentBaseUrl }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Agent 版本</span>
            <span class="info-value">{{ health?.agentVersion || '读取中...' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">机器码</span>
            <span class="info-value mono">{{ health?.machineCode || '-' }}</span>
          </div>
        </div>

        <div v-if="!health?.bound" class="form-card">
          <div class="field-group">
            <label class="field">
              <span class="field-label">网关地址</span>
              <input v-model="activationForm.gatewayBaseUrl" class="field-input" />
            </label>
            <label class="field">
              <span class="field-label">激活码</span>
              <input
                v-model="activationForm.activationCode"
                class="field-input"
                placeholder="管理员生成的一次性激活码"
              />
            </label>
            <label class="field">
              <span class="field-label">端点名称</span>
              <input
                v-model="activationForm.endpointName"
                class="field-input"
                placeholder="例如：阅卷室一号扫描台"
              />
            </label>
          </div>
          <button
            class="btn btn-primary btn-lg"
            type="button"
            :disabled="loading"
            @click="activateAgent"
          >
            <svg
              v-if="loading"
              class="spin"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            激活并绑定
          </button>
        </div>

        <div v-else class="bound-card">
          <div class="bound-badge">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <div>
              <strong>设备已绑定</strong>
              <p>{{ health.diagnosticMessage }}</p>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-danger-text"
            type="button"
            :disabled="loading"
            @click="unbindAgent"
          >
            清除绑定
          </button>
        </div>
      </article>

      <article v-show="currentStep === 1" class="step-panel">
        <div class="panel-icon-header">
          <div class="icon-circle">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 18h8" />
              <path d="M3 22h18" />
              <path d="M14 22a7 7 0 1 0 0-14h-1" />
              <path d="M9 14h2" />
              <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
            </svg>
          </div>
          <div>
            <h2>选择扫描仪</h2>
            <p class="subtitle">检测本机可用扫描设备并选择目标扫描仪</p>
          </div>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="loading"
            @click="refreshScanners"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            刷新
          </button>
        </div>

        <div class="scanner-list">
          <button
            v-for="scanner in scanners"
            :key="scanner.localScannerId"
            class="scanner-card" :class="[
              {
                selected: selectedScannerId === scanner.localScannerId,
                unavailable: !scanner.available,
              },
            ]"
            type="button"
            :disabled="!scanner.available"
            @click="selectedScannerId = scanner.localScannerId"
          >
            <div class="scanner-card-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="2" y="7" width="20" height="5" rx="1" />
                <path d="M4 12v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
                <path d="M6 3h12v4H6z" />
              </svg>
            </div>
            <div class="scanner-card-info">
              <strong>{{ scanner.displayName }}</strong>
              <span class="scanner-meta">{{ scanner.driverType }} · {{ scanner.supportsAdf ? 'ADF' : '平板' }} ·
                {{ scanner.supportsDuplex ? '双面' : '单面' }}</span>
            </div>
            <span class="scanner-status" :class="[scanner.available ? 'online' : 'offline']">
              {{ scanner.available ? '可用' : '离线' }}
            </span>
          </button>
          <div v-if="scanners.length === 0" class="empty-hint">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p>未检测到扫描仪设备，请确认扫描仪已开机并连接</p>
          </div>
        </div>

        <div v-if="selectedScanner" class="selected-hint">
          已选择：<strong>{{ selectedScanner.displayName }}</strong>
          <span v-if="selectedScanner.diagnostic"> — {{ selectedScanner.diagnostic }}</span>
        </div>
      </article>

      <article v-show="currentStep === 2" class="step-panel">
        <div class="panel-icon-header">
          <div class="icon-circle">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h2>扫描参数</h2>
            <p class="subtitle">配置考试信息与扫描参数</p>
          </div>
        </div>

        <div class="form-card">
          <h3 class="form-section-title">考试信息</h3>
          <div class="field-row">
            <label class="field">
              <span class="field-label">考试 ID</span>
              <input v-model="scanForm.examId" class="field-input" placeholder="后端 examId" />
            </label>
            <label class="field">
              <span class="field-label">班级 ID 集合</span>
              <input
                v-model="scanForm.declaredClassIdsText"
                class="field-input"
                placeholder="逗号分隔，如 1001,1002"
              />
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span class="field-label">设备业务 ID</span>
              <input
                v-model="scanForm.scannerDeviceId"
                class="field-input"
                placeholder="scannerDeviceId"
              />
            </label>
            <label class="field">
              <span class="field-label">工位 ID</span>
              <input
                v-model="scanForm.scannerStationId"
                class="field-input"
                placeholder="scannerStationId"
              />
            </label>
          </div>

          <h3 class="form-section-title">扫描设置</h3>
          <div class="field-row">
            <label class="field">
              <span class="field-label">DPI 分辨率</span>
              <input
                v-model.number="scanForm.dpi"
                class="field-input"
                type="number"
                min="100"
                max="600"
                step="50"
              />
            </label>
            <label class="field">
              <span class="field-label">期望页数</span>
              <input
                v-model.number="scanForm.expectedPages"
                class="field-input"
                type="number"
                min="1"
                placeholder="可选"
              />
            </label>
          </div>

          <div class="option-cards">
            <div class="option-group">
              <span class="option-title">色彩模式</span>
              <div class="option-row">
                <button
                  v-for="mode in ['GRAY', 'COLOR', 'LINEART'] as const"
                  :key="mode"
                  class="option-btn" :class="[{ active: scanForm.colorMode === mode }]"
                  type="button"
                  @click="scanForm.colorMode = mode"
                >
                  {{ mode === 'GRAY' ? '灰度' : mode === 'COLOR' ? '彩色' : '黑白' }}
                </button>
              </div>
            </div>
            <div class="option-group">
              <span class="option-title">扫描面</span>
              <div class="option-row">
                <button
                  v-for="mode in ['SIMPLEX', 'DUPLEX'] as const"
                  :key="mode"
                  class="option-btn" :class="[{ active: scanForm.duplexMode === mode }]"
                  type="button"
                  @click="scanForm.duplexMode = mode"
                >
                  {{ mode === 'SIMPLEX' ? '单面' : '双面' }}
                </button>
              </div>
            </div>
          </div>

          <label class="toggle-row">
            <span class="toggle-label">空白页自动检测</span>
            <button
              class="toggle" :class="[{ on: scanForm.blankPageDetectionEnabled }]"
              type="button"
              role="switch"
              :aria-checked="scanForm.blankPageDetectionEnabled"
              @click="scanForm.blankPageDetectionEnabled = !scanForm.blankPageDetectionEnabled"
            >
              <span class="toggle-thumb" />
            </button>
          </label>
        </div>
      </article>

      <article v-show="currentStep === 3" class="step-panel workstation-panel">
        <div class="ws-header">
          <div class="ws-status-bar">
            <div class="ws-status-item">
              <span class="ws-status-dot" :class="[jobStatusTone]" />
              <span class="ws-status-label">{{ currentJob?.status || '—' }}</span>
            </div>
            <div class="ws-status-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01" />
              </svg>
              <span class="ws-status-label">{{ currentJob?.scannedPages || 0 }} 页</span>
            </div>
            <div class="ws-status-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span class="ws-status-label">{{ currentJob?.uploadedPages || 0 }} 已上传</span>
            </div>
            <div class="ws-status-item" :class="{ 'text-green': currentJob?.reported }">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span class="ws-status-label">{{ currentJob?.reported ? '已上报' : '未上报' }}</span>
            </div>
          </div>
          <div class="ws-actions-mini">
            <button class="btn btn-ghost btn-sm" type="button" @click="openDiagnosticsExport">
              导出诊断
            </button>
            <button
              class="btn btn-danger btn-sm"
              type="button"
              :disabled="loading || jobIsTerminal"
              @click="cancelCurrentJob"
            >
              取消
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="loading || currentJob?.status !== 'FAILED'"
              @click="retryCurrentUpload"
            >
              重试上传
            </button>
          </div>
        </div>

        <div v-if="currentJob" class="ws-body">
          <div class="ws-preview">
            <div v-if="previewImageUrl" class="ws-preview-image-wrap">
              <img
                :src="previewImageUrl"
                :alt="`第 ${previewPageNo} 页`"
                class="ws-preview-image"
              />
              <div class="ws-preview-badge">第 {{ previewPageNo }} 页</div>
            </div>
            <div v-else class="ws-preview-empty">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <p v-if="!jobIsTerminal">等待扫描图片...</p>
              <p v-else>点击底部缩略图查看</p>
            </div>
          </div>

          <div class="ws-filmstrip-wrap">
            <div v-if="visiblePages.length > 0" class="ws-filmstrip">
              <button
                v-for="page in visiblePages"
                :key="page.pageNo"
                class="ws-thumb" :class="[{ active: previewPageNo === page.pageNo }]"
                type="button"
                @click="previewPageNo = page.pageNo"
              >
                <img
                  :src="getPageImageUrl(currentJob.scanJobId, page.pageNo)"
                  :alt="`P${page.pageNo}`"
                  class="ws-thumb-img"
                  loading="lazy"
                />
                <span class="ws-thumb-no">{{ page.pageNo }}</span>
                <span
                  class="ws-thumb-status" :class="[
                    page.status === 'UPLOADED'
                      ? 'uploaded'
                      : page.status === 'UPLOADING'
                        ? 'uploading'
                        : 'waiting',
                  ]"
                />
              </button>
            </div>
            <div v-else class="ws-filmstrip-empty">
              <span v-if="!jobIsTerminal" class="ws-scanning-hint">
                <svg
                  class="spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                扫描中，页面将实时出现...
              </span>
              <span v-else>无有效扫描页</span>
            </div>
          </div>

          <div class="ws-progress-bar">
            <div class="ws-progress-track">
              <div
                class="ws-progress-fill"
                :class="jobStatusTone"
                :style="{ width: `${scanProgress}%` }"
              />
            </div>
            <span class="ws-progress-text">{{ scanProgress }}%</span>
          </div>

          <div v-if="currentJob.message" class="ws-message">
            {{ currentJob.message }}
          </div>
          <div class="ws-job-id">
            <span>任务</span>
            <code>{{ currentJob.scanJobId }}</code>
          </div>
        </div>

        <div v-else class="empty-state-large">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 12h.01" />
          </svg>
          <p>暂无扫描任务</p>
          <span>在上一步配置好参数后，点击「开始扫描」即可创建任务</span>
        </div>
      </article>
    </section>

    <footer class="kiosk-footer">
      <button class="btn btn-ghost" type="button" :disabled="currentStep === 0" @click="goPrev">
        ← 上一步
      </button>
      <div class="footer-center">
        <span class="footer-hint">{{ agentBaseUrl }}</span>
      </div>
      <button
        v-if="currentStep < 2"
        class="btn btn-primary"
        type="button"
        :disabled="!canGoNext"
        @click="goNext"
      >
        下一步 →
      </button>
      <button
        v-else-if="currentStep === 2"
        class="btn btn-primary btn-accent"
        type="button"
        :disabled="loading || !canStartScan"
        @click="submitScanJob"
      >
        <svg
          v-if="loading"
          class="spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        开始扫描
      </button>
      <button
        v-else
        class="btn btn-ghost"
        type="button"
        :disabled="!jobIsTerminal"
        @click="currentStep = 2"
      >
        新建任务
      </button>
    </footer>
  </main>
</template>

<style scoped>
.kiosk {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: #e2ecf8;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(ellipse at 15% 0%, rgba(34, 211, 238, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 100%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
    linear-gradient(180deg, #080f1e 0%, #0f172a 100%);
}

.kiosk-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(8, 15, 30, 0.85);
  backdrop-filter: blur(12px);
}

.kiosk-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #67e8f9;
}

.brand-text {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.step-nav {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 8px 16px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.step-item.active {
  color: #f0f9ff;
  background: rgba(34, 211, 238, 0.15);
}

.step-item.done {
  color: #34d399;
}

.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid currentColor;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 900;
}

.step-item.done .step-num {
  border-color: #34d399;
  color: #34d399;
}

.step-item.active .step-num {
  border-color: #67e8f9;
  color: #67e8f9;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.4);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-beacon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-beacon.online {
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.status-beacon.offline {
  background: #fb7185;
  box-shadow: 0 0 8px #fb7185;
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.toast-bar {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  cursor: pointer;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.toast-error {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.85);
}

.toast-success {
  color: #bbf7d0;
  background: rgba(20, 83, 45, 0.85);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}

.upgrade-banner {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: min(720px, 92vw);
  padding: 16px 20px;
  color: #fee2e2;
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(159, 18, 57, 0.9));
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.upgrade-banner-icon {
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fee2e2;
  background: rgba(248, 113, 113, 0.18);
  border-radius: 999px;
}

.upgrade-banner-body {
  flex: 1;
  min-width: 0;
}

.upgrade-banner-title {
  font-size: 15px;
  font-weight: 600;
  color: #fef2f2;
  margin-bottom: 6px;
}

.upgrade-banner-message {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(254, 226, 226, 0.85);
  word-break: break-word;
}

.busy-banner {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(720px, 92vw);
  padding: 16px 20px;
  color: #fde68a;
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.92), rgba(146, 64, 14, 0.86));
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.busy-banner-icon {
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fde68a;
  background: rgba(251, 191, 36, 0.18);
  border-radius: 999px;
  animation: spin 2s linear infinite;
}

.busy-banner-body {
  flex: 1;
  min-width: 0;
}

.busy-banner-title {
  font-size: 15px;
  font-weight: 600;
  color: #fef3c7;
  margin-bottom: 6px;
}

.busy-banner-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: rgba(254, 240, 138, 0.85);
}

.busy-banner-meta code {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.busy-banner-message {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(254, 240, 138, 0.7);
}

.busy-banner-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.kiosk-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px;
  overflow-y: auto;
}

.step-panel {
  width: 100%;
  max-width: 720px;
  animation: fadeIn 0.25s ease;
}

.panel-icon-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  color: #67e8f9;
  background: rgba(34, 211, 238, 0.1);
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.panel-icon-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 14px;
}

.info-strip {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.info-item {
  flex: 1;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.info-label {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.info-value {
  display: block;
  margin-top: 4px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.info-value.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.form-card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.form-section-title {
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.form-section-title + .form-section-title {
  margin-top: 24px;
}

.field-group {
  display: grid;
  gap: 16px;
  margin-bottom: 20px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
  color: #f1f5f9;
  font-size: 15px;
  background: rgba(15, 23, 42, 0.6);
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.field-input:focus {
  border-color: #22d3ee;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
}

.field-input::placeholder {
  color: #475569;
}

.option-cards {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.option-group {
  flex: 1;
}

.option-title {
  display: block;
  margin-bottom: 8px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.option-row {
  display: flex;
  gap: 8px;
}

.option-btn {
  flex: 1;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  padding: 12px 8px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  background: rgba(30, 41, 59, 0.5);
  cursor: pointer;
  transition: all 0.15s;
}

.option-btn:hover {
  border-color: rgba(34, 211, 238, 0.3);
  color: #e2e8f0;
}

.option-btn.active {
  border-color: #22d3ee;
  color: #f0f9ff;
  background: rgba(34, 211, 238, 0.12);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.15);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.toggle-label {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 700;
}

.toggle {
  position: relative;
  width: 48px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  padding: 2px;
  background: rgba(71, 85, 105, 0.6);
  cursor: pointer;
  transition: background 0.2s;
}

.toggle.on {
  background: #22d3ee;
}

.toggle-thumb {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.toggle.on .toggle-thumb {
  transform: translateX(22px);
}

.bound-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 20px;
  background: rgba(20, 83, 45, 0.15);
  border: 1px solid rgba(52, 211, 153, 0.2);
}

.bound-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #34d399;
}

.bound-badge strong {
  display: block;
  color: #bbf7d0;
  font-size: 16px;
}

.bound-badge p {
  margin: 2px 0 0;
  color: #6ee7b7;
  font-size: 13px;
}

.scanner-list {
  display: grid;
  gap: 12px;
}

.scanner-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 16px 20px;
  text-align: left;
  color: #e2e8f0;
  background: rgba(30, 41, 59, 0.5);
  cursor: pointer;
  transition: all 0.15s;
}

.scanner-card:hover:not(:disabled) {
  border-color: rgba(34, 211, 238, 0.3);
  background: rgba(30, 41, 59, 0.7);
}

.scanner-card.selected {
  border-color: #22d3ee;
  background: rgba(34, 211, 238, 0.08);
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.1);
}

.scanner-card.unavailable {
  opacity: 0.45;
  cursor: not-allowed;
}

.scanner-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #67e8f9;
  background: rgba(34, 211, 238, 0.1);
}

.scanner-card-info {
  flex: 1;
}

.scanner-card-info strong {
  display: block;
  font-size: 15px;
}

.scanner-meta {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.scanner-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.scanner-status.online {
  color: #bbf7d0;
  background: rgba(20, 83, 45, 0.5);
}

.scanner-status.offline {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.4);
}

.selected-hint {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  background: rgba(30, 41, 59, 0.5);
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: #64748b;
  text-align: center;
}

.progress-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-ring-wrap {
  position: relative;
  width: 180px;
  height: 180px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(71, 85, 105, 0.3);
  stroke-width: 8;
}

.ring-fg {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.ring-fg.success {
  stroke: #34d399;
}
.ring-fg.warning {
  stroke: #fbbf24;
}
.ring-fg.danger {
  stroke: #fb7185;
}
.ring-fg.muted {
  stroke: #64748b;
}

.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.ring-percent {
  display: block;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.ring-status {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.job-stats {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.stat-num {
  font-size: 24px;
  font-weight: 900;
}

.stat-num.text-green {
  color: #34d399;
}

.stat-label {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.job-message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  background: rgba(30, 41, 59, 0.5);
  text-align: center;
}

.job-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: #475569;
  font-size: 12px;
}

.job-id-label {
  font-weight: 700;
}

.job-id-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #64748b;
}

.action-group {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.empty-state-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: #475569;
  text-align: center;
}

.empty-state-large p {
  margin: 0;
  color: #64748b;
  font-size: 16px;
  font-weight: 700;
}

.empty-state-large span {
  color: #475569;
  font-size: 13px;
}

.kiosk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(8, 15, 30, 0.9);
  backdrop-filter: blur(12px);
}

.footer-center {
  flex: 1;
  text-align: center;
}

.footer-hint {
  color: #334155;
  font-size: 12px;
  font-family: monospace;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.btn-primary {
  color: #05101f;
  background: linear-gradient(135deg, #67e8f9, #34d399);
  box-shadow: 0 4px 16px rgba(34, 211, 238, 0.25);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 6px 24px rgba(34, 211, 238, 0.35);
  transform: translateY(-1px);
}

.btn-accent {
  background: linear-gradient(135deg, #22d3ee, #06b6d4);
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.35);
}

.btn-ghost {
  color: #94a3b8;
  background: rgba(71, 85, 105, 0.2);
}

.btn-ghost:hover:not(:disabled) {
  color: #e2e8f0;
  background: rgba(71, 85, 105, 0.35);
}

.btn-danger {
  color: #fee2e2;
  background: rgba(225, 29, 72, 0.6);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(225, 29, 72, 0.75);
}

.btn-danger-text {
  color: #fb7185;
}

.btn-lg {
  width: 100%;
  padding: 16px;
  font-size: 16px;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 12px;
  border-radius: 10px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.workstation-panel {
  max-width: 960px;
}

.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.ws-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ws-status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.ws-status-item.text-green {
  color: #34d399;
}

.ws-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
}

.ws-status-dot.success {
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
}
.ws-status-dot.warning {
  background: #fbbf24;
  box-shadow: 0 0 6px #fbbf24;
}
.ws-status-dot.danger {
  background: #fb7185;
  box-shadow: 0 0 6px #fb7185;
}
.ws-status-dot.muted {
  background: #64748b;
}

.ws-actions-mini {
  display: flex;
  gap: 8px;
}

.ws-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ws-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  max-height: 520px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
}

.ws-preview-image-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ws-preview-image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
  border-radius: 8px;
}

.ws-preview-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.ws-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #475569;
  text-align: center;
}

.ws-preview-empty p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.ws-filmstrip-wrap {
  overflow-x: auto;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
}

.ws-filmstrip {
  display: flex;
  gap: 8px;
  padding: 4px;
}

.ws-thumb {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 96px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  background: rgba(30, 41, 59, 0.6);
  cursor: pointer;
  transition: all 0.15s;
}

.ws-thumb:hover {
  border-color: rgba(34, 211, 238, 0.4);
}

.ws-thumb.active {
  border-color: #22d3ee;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

.ws-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ws-thumb-no {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #e2e8f0;
  font-size: 10px;
  font-weight: 700;
}

.ws-thumb-status {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ws-thumb-status.uploaded {
  background: #34d399;
}
.ws-thumb-status.uploading {
  background: #fbbf24;
  animation: pulse 1s infinite;
}
.ws-thumb-status.waiting {
  background: #64748b;
}

.ws-filmstrip-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #64748b;
  font-size: 13px;
}

.ws-scanning-hint {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-progress-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ws-progress-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(71, 85, 105, 0.3);
  overflow: hidden;
}

.ws-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.ws-progress-fill.success {
  background: #34d399;
}
.ws-progress-fill.warning {
  background: #fbbf24;
}
.ws-progress-fill.danger {
  background: #fb7185;
}
.ws-progress-fill.muted {
  background: #64748b;
}

.ws-progress-text {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.ws-message {
  padding: 10px 14px;
  border-radius: 10px;
  color: #94a3b8;
  font-size: 13px;
  background: rgba(30, 41, 59, 0.5);
}

.ws-job-id {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 12px;
}

.ws-job-id code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #64748b;
}

@media (max-width: 900px) {
  .kiosk-header {
    padding: 12px 16px;
  }

  .step-label {
    display: none;
  }

  .kiosk-body {
    padding: 20px 16px;
  }

  .info-strip {
    flex-direction: column;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .option-cards {
    flex-direction: column;
  }

  .kiosk-footer {
    padding: 12px 16px;
  }

  .ws-header {
    flex-direction: column;
    align-items: stretch;
  }

  .ws-status-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .ws-actions-mini {
    justify-content: flex-end;
  }

  .ws-preview {
    min-height: 240px;
    max-height: 360px;
  }

  .ws-thumb {
    width: 56px;
    height: 74px;
  }
}

.kiosk {
  color: #1f2937;
  font-family: var(
    --dp-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif
  );
  background: #f5f6f8;
}

.kiosk-header,
.kiosk-footer {
  border-color: #d9dee7;
  background: #ffffff;
  backdrop-filter: none;
}

.kiosk-brand {
  color: #1f5f8f;
}

.brand-text,
.panel-icon-header h2 {
  letter-spacing: 0;
}

.step-item {
  border-radius: 8px;
  color: #6b7280;
}

.step-item.active {
  color: #174d75;
  background: #e8f2fa;
}

.step-item.done {
  color: #2f7a4d;
}

.step-num {
  border-width: 1px;
  border-radius: 8px;
}

.step-item.active .step-num,
.step-item.done .step-num,
.status-beacon.online,
.status-beacon.offline,
.ws-status-dot.success,
.ws-status-dot.warning,
.ws-status-dot.danger,
.ws-thumb.active {
  box-shadow: none;
}

.status-beacon.online,
.ws-status-dot.success,
.ws-progress-fill.success,
.ws-thumb-status.uploaded {
  background: #2f7a4d;
}

.status-beacon.offline,
.ws-status-dot.danger,
.ws-progress-fill.danger {
  background: #b42318;
}

.status-text,
.subtitle,
.info-value,
.field-label,
.toggle-label,
.ws-status-item,
.ws-progress-text,
.ws-message,
.selected-hint,
.scanner-meta,
.footer-hint,
.ws-job-id,
.empty-state-large p {
  color: #4b5563;
}

.toast,
.upgrade-banner,
.busy-banner {
  border-radius: 8px;
  backdrop-filter: none;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.toast-error {
  color: #7f1d1d;
  background: #fff1f2;
}

.toast-success {
  color: #14532d;
  background: #edf7ed;
}

.upgrade-banner {
  color: #7f1d1d;
  border-color: #fecaca;
  background: #fff1f2;
}

.upgrade-banner-icon {
  color: #b42318;
  background: #fee2e2;
}

.upgrade-banner-title {
  color: #7f1d1d;
}

.upgrade-banner-message {
  color: #991b1b;
}

.busy-banner {
  color: #854d0e;
  border-color: #fde68a;
  background: #fffbeb;
}

.busy-banner-icon {
  color: #a16207;
  background: #fef3c7;
}

.busy-banner-title {
  color: #78350f;
}

.busy-banner-meta,
.busy-banner-message {
  color: #92400e;
}

.busy-banner-meta code {
  color: #78350f;
  background: #fef3c7;
}

.kiosk-body {
  padding: 24px;
}

.step-panel {
  max-width: 880px;
}

.workstation-panel {
  max-width: 1120px;
}

.icon-circle,
.scanner-card-icon {
  border-color: #cfe0ec;
  border-radius: 8px;
  color: #1f5f8f;
  background: #eef6fb;
}

.info-item,
.form-card,
.bound-card,
.scanner-card,
.selected-hint,
.ws-header,
.ws-preview,
.ws-message,
.stat-card,
.job-message {
  border: 1px solid #d9dee7;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: none;
}

.info-label,
.form-section-title,
.option-title {
  color: #6b7280;
  letter-spacing: 0;
  text-transform: none;
}

.form-section-title {
  border-color: #e5e7eb;
}

.field-input {
  border-color: #cfd6df;
  border-radius: 8px;
  color: #111827;
  background: #ffffff;
}

.field-input:focus {
  border-color: #1f6f9f;
  box-shadow: 0 0 0 3px rgba(31, 111, 159, 0.12);
}

.field-input::placeholder {
  color: #9ca3af;
}

.option-btn {
  border-color: #cfd6df;
  border-radius: 8px;
  color: #4b5563;
  background: #f8fafc;
}

.option-btn:hover {
  border-color: #8fb6d0;
  color: #1f2937;
}

.option-btn.active {
  border-color: #1f6f9f;
  color: #174d75;
  background: #e8f2fa;
  box-shadow: none;
}

.toggle {
  background: #cfd6df;
}

.toggle.on {
  background: #1f6f9f;
}

.toggle-thumb {
  box-shadow: none;
}

.bound-card {
  background: #edf7ed;
  border-color: #badbcc;
}

.bound-badge,
.bound-badge strong,
.bound-badge p,
.stat-num.text-green,
.ws-status-item.text-green {
  color: #2f7a4d;
}

.scanner-card {
  color: #1f2937;
}

.scanner-card:hover:not(:disabled) {
  border-color: #8fb6d0;
  background: #f8fafc;
}

.scanner-card.selected {
  border-color: #1f6f9f;
  background: #eef6fb;
}

.scanner-status {
  border-radius: 8px;
}

.scanner-status.online {
  color: #14532d;
  background: #edf7ed;
}

.scanner-status.offline {
  color: #7f1d1d;
  background: #fff1f2;
}

.empty-hint,
.empty-state-large,
.empty-state-large span,
.ws-preview-empty,
.ws-filmstrip-empty {
  color: #6b7280;
}

.btn {
  border: 1px solid transparent;
  border-radius: 8px;
  box-shadow: none;
}

.btn-primary,
.btn-accent {
  color: #ffffff;
  background: #1f6f9f;
  box-shadow: none;
}

.btn-primary:hover:not(:disabled),
.btn-accent:hover:not(:disabled) {
  background: #174d75;
  box-shadow: none;
  transform: translateY(-1px);
}

.btn-ghost,
.btn-secondary {
  border-color: #cfd6df;
  color: #374151;
  background: #ffffff;
}

.btn-ghost:hover:not(:disabled),
.btn-secondary:hover:not(:disabled) {
  color: #1f2937;
  background: #f3f4f6;
}

.btn-danger {
  color: #ffffff;
  background: #b42318;
}

.btn-danger:hover:not(:disabled) {
  background: #8f1d14;
}

.btn-danger-text {
  color: #b42318;
}

.ws-status-dot.warning,
.ws-progress-fill.warning,
.ws-thumb-status.uploading {
  background: #b7791f;
}

.ws-status-dot.muted,
.ws-progress-fill.muted,
.ws-thumb-status.waiting {
  background: #6b7280;
}

.ws-preview {
  background: #f8fafc;
}

.ws-preview-badge,
.ws-thumb-no {
  border-radius: 4px;
  color: #ffffff;
  background: rgba(17, 24, 39, 0.72);
  backdrop-filter: none;
}

.ws-thumb {
  border-color: #cfd6df;
  border-radius: 8px;
  background: #ffffff;
}

.ws-thumb:hover,
.ws-thumb.active {
  border-color: #1f6f9f;
}

.ws-progress-track {
  background: #e5e7eb;
}

.ws-job-id code,
.info-value.mono,
.job-id-code {
  color: #374151;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
