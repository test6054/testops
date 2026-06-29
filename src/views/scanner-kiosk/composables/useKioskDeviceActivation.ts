import type { AgentHealthResponse, AgentSetupContextResponse } from '@/apis/mark/scanner-agent-local'
import { computed, ref } from 'vue'
import {
  activateLocalAgent,
  getAgentHealth,
  getAgentSetupContext,
  LOCAL_AGENT_UNAVAILABLE_ERROR,
  LocalAgentUnavailableError,
} from '@/apis/mark/scanner-agent-local'
import { getUserErrorMessage } from '@/utils/error-handler'
import {
  clearKioskAuthSession,
  getKioskBindingProfile,
  hasMarkScannerKioskAuth,
  KIOSK_BROWSER_SESSION_SYNC_MESSAGE,
  needsKioskBrowserSessionSync,
  recoverKioskBrowserSessionFromAgent,
  saveKioskAuthSession,
} from '@/utils/kiosk-auth'

const gatewayBaseUrlEnv = import.meta.env.VITE_SCANNER_GATEWAY_BASE_URL
const defaultGatewayFromEnv
  = typeof gatewayBaseUrlEnv === 'string' ? gatewayBaseUrlEnv.trim() : ''

export interface KioskDeviceActivateOptions {
  /** 返回非空字符串时阻断激活并写入 activationErrorMessage */
  guard?: () => string | null
  onSuccess?: (activation: Awaited<ReturnType<typeof activateLocalAgent>>) => Promise<void> | void
}

let sharedKioskDeviceActivation: ReturnType<typeof createKioskDeviceActivation> | null = null

/**
 * 一体机设备级激活真源（单例）：一次 push_token 绑定，考试 / 归档 / 档案袋共用同一工位凭证。
 */
export function useKioskDeviceActivation() {
  if (!sharedKioskDeviceActivation) {
    sharedKioskDeviceActivation = createKioskDeviceActivation()
  }
  return sharedKioskDeviceActivation
}

function createKioskDeviceActivation() {
  const loading = ref(false)
  const health = ref<AgentHealthResponse | null>(null)
  const setup = ref<AgentSetupContextResponse | null>(null)
  const localAgentReachable = ref(true)
  const activationErrorMessage = ref('')
  /** 设置抽屉「重新激活」等主动触发的激活向导，与 forced gate 叠加 */
  const manualActivationGateOpen = ref(false)
  const activationForm = ref({
    activationCode: '',
    endpointName: '',
    gatewayBaseUrl: defaultGatewayFromEnv,
  })

  const isDeviceBound = computed(() => Boolean(health.value?.bound))
  const activationModalForced = computed(() =>
    !health.value?.bound
    || Boolean(health.value?.tokenResetRequired)
    || Boolean(health.value?.rebindRequired),
  )
  const needsActivationGate = computed(
    () => activationModalForced.value || manualActivationGateOpen.value,
  )
  const kioskBrowserSessionSyncNeeded = computed(() =>
    needsKioskBrowserSessionSync(health.value?.bound),
  )
  const activationGateReason = computed(() => {
    if (!health.value?.bound) return 'UNBOUND'
    if (health.value.rebindRequired) return 'REBIND_REQUIRED'
    if (health.value.tokenResetRequired) return 'TOKEN_RESET_REQUIRED'
    return 'NONE'
  })

  const activationTitle = computed(() => {
    const reason = activationGateReason.value
    if (reason === 'REBIND_REQUIRED') return '设备身份已变更，请重新激活'
    if (reason === 'TOKEN_RESET_REQUIRED') return '浏览器会话失效，请重新激活'
    return isDeviceBound.value ? '重新激活一体机' : '激活扫描一体机'
  })

  const deviceReadiness = computed(() => {
    if (!localAgentReachable.value) {
      if (health.value?.bound || hasMarkScannerKioskAuth()) {
        return {
          headline: '本地扫描服务暂时不可用',
          detail: `${LOCAL_AGENT_UNAVAILABLE_ERROR}；服务恢复后会自动重连。`,
        }
      }
      return {
        headline: '请先启动本机扫描服务',
        detail: LOCAL_AGENT_UNAVAILABLE_ERROR,
      }
    }
    if (needsActivationGate.value) {
      if (activationGateReason.value === 'REBIND_REQUIRED') {
        return {
          headline: '需要重新激活一体机',
          detail: '本机设备身份与平台记录不一致，请重新输入激活码（一次激活，三类采集共用）。',
        }
      }
      if (activationGateReason.value === 'TOKEN_RESET_REQUIRED') {
        return {
          headline: '需要重新激活一体机',
          detail: 'push_token 已变更，请重新输入激活码（一次激活，三类采集共用）。',
        }
      }
      if (manualActivationGateOpen.value && isDeviceBound.value) {
        return {
          headline: '重新激活本机工位',
          detail: '输入新的激活码将替换当前工位绑定；考试 / 归档 / 档案袋共用同一 push_token。',
        }
      }
      return {
        headline: '请先激活本机扫描工位',
        detail: '设备激活与业务类型无关：完成一次激活后，考试扫描、考后归档、档案袋采集共用同一 push_token。',
      }
    }
    if (kioskBrowserSessionSyncNeeded.value) {
      return {
        headline: '正在同步本机 Agent 会话',
        detail: KIOSK_BROWSER_SESSION_SYNC_MESSAGE,
      }
    }
    return {
      headline: '设备已激活',
      detail: '本机工位已绑定，考试扫描、考后归档、档案袋采集共用同一 push_token。',
    }
  })

  function hasActiveDeviceActivation(): boolean {
    return Boolean(health.value?.bound) || hasMarkScannerKioskAuth()
  }

  function isActivatedForMarkApis(): boolean {
    return hasActiveDeviceActivation()
      && !health.value?.tokenResetRequired
      && !health.value?.rebindRequired
  }

  function clearStaleKioskSessionWhenUnbound(): void {
    if (!localAgentReachable.value || health.value?.bound) {
      return
    }
    if (hasMarkScannerKioskAuth() || getKioskBindingProfile()) {
      clearKioskAuthSession()
    }
  }

  /** Agent 进程未监听时保留 bound 快照，避免误弹激活向导。 */
  function markLocalAgentDisconnected(): void {
    localAgentReachable.value = false
    if (health.value?.bound) {
      health.value = {
        ...health.value,
        scannerConnected: false,
        diagnosticStatus: 'WARNING',
        diagnosticMessage: LOCAL_AGENT_UNAVAILABLE_ERROR,
      }
    }
  }

  function resolveGatewayBaseUrl(setupContext?: AgentSetupContextResponse | null): string {
    const fromBinding = setupContext?.gatewayBaseUrl?.trim()
    if (fromBinding) return fromBinding.replace(/\/+$/, '')
    const fromSetup = setupContext?.defaultGatewayBaseUrl?.trim()
    if (fromSetup) return fromSetup.replace(/\/+$/, '')
    const fromForm = activationForm.value.gatewayBaseUrl.trim()
    if (fromForm) return fromForm.replace(/\/+$/, '')
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      if (origin && origin !== 'null' && /^https?:\/\//.test(origin)) {
        return origin.replace(/\/+$/, '')
      }
    }
    return defaultGatewayFromEnv.replace(/\/+$/, '')
  }

  function validateActivationForm(): {
    ok: true
    gatewayBaseUrl: string
    activationCode: string
    endpointName: string
  } | {
    ok: false
    errorMessage: string
  } {
    const gatewayBaseUrl = resolveGatewayBaseUrl(setup.value)
    const activationCode = activationForm.value.activationCode.trim()
    const endpointName = activationForm.value.endpointName.trim()
    if (!gatewayBaseUrl) {
      return { ok: false, errorMessage: '无法识别平台服务地址，请联系管理员检查一体机配置' }
    }
    try {
      const url = new URL(gatewayBaseUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { ok: false, errorMessage: '平台服务地址必须使用 HTTP 或 HTTPS 协议' }
      }
    }
    catch {
      return { ok: false, errorMessage: '平台服务地址格式不正确' }
    }
    if (!activationCode) {
      return { ok: false, errorMessage: '激活码不能为空' }
    }
    if (!/^\d{8}$/.test(activationCode)) {
      return { ok: false, errorMessage: '激活码必须为 8 位数字' }
    }
    if (!endpointName) {
      return { ok: false, errorMessage: '本机位置名称不能为空' }
    }
    activationForm.value.gatewayBaseUrl = gatewayBaseUrl
    return { ok: true, gatewayBaseUrl, activationCode, endpointName }
  }

  async function syncActivationFormFromAgent() {
    try {
      const setupContext = await getAgentSetupContext()
      setup.value = setupContext
      activationForm.value.gatewayBaseUrl = resolveGatewayBaseUrl(setupContext)
      const savedProfile = getKioskBindingProfile()
      if (setupContext.deviceName && !activationForm.value.endpointName) {
        activationForm.value.endpointName = setupContext.deviceName
      }
      else if (savedProfile?.endpointName && !activationForm.value.endpointName) {
        activationForm.value.endpointName = savedProfile.endpointName
      }
    }
    catch {
      activationForm.value.gatewayBaseUrl = resolveGatewayBaseUrl(null)
    }
  }

  async function refreshDeviceActivationState() {
    loading.value = true
    localAgentReachable.value = true
    try {
      health.value = await getAgentHealth()
      if (health.value.bound) {
        setup.value = await getAgentSetupContext()
        activationForm.value.gatewayBaseUrl = resolveGatewayBaseUrl(setup.value)
        if (setup.value?.deviceName && !activationForm.value.endpointName) {
          activationForm.value.endpointName = setup.value.deviceName
        }
        if (needsKioskBrowserSessionSync(health.value.bound)) {
          await recoverKioskBrowserSessionFromAgent()
        }
      }
      else {
        clearStaleKioskSessionWhenUnbound()
        await syncActivationFormFromAgent()
      }
    }
    catch (error) {
      if (error instanceof LocalAgentUnavailableError) {
        markLocalAgentDisconnected()
      }
      else {
        health.value = null
        setup.value = null
        localAgentReachable.value = false
      }
    }
    finally {
      loading.value = false
    }
  }

  function openManualActivation() {
    activationErrorMessage.value = ''
    manualActivationGateOpen.value = true
    void syncActivationFormFromAgent()
  }

  function closeManualActivation() {
    manualActivationGateOpen.value = false
    activationForm.value.activationCode = ''
  }

  async function activateDevice(options?: KioskDeviceActivateOptions): Promise<boolean> {
    if (options?.guard) {
      const blocked = options.guard()
      if (blocked) {
        activationErrorMessage.value = blocked
        return false
      }
    }
    loading.value = true
    activationErrorMessage.value = ''
    try {
      await syncActivationFormFromAgent()
      const request = validateActivationForm()
      if (!request.ok) {
        activationErrorMessage.value = request.errorMessage
        return false
      }
      const activation = await activateLocalAgent({
        gatewayBaseUrl: request.gatewayBaseUrl,
        activationCode: request.activationCode,
        endpointName: request.endpointName,
      })
      saveKioskAuthSession({
        ...activation,
        endpointName: request.endpointName,
      })
      activationForm.value.activationCode = ''
      manualActivationGateOpen.value = false
      await refreshDeviceActivationState()
      if (options?.onSuccess) {
        await options.onSuccess(activation)
      }
      return true
    }
    catch (error) {
      activationErrorMessage.value = getUserErrorMessage(error, '一体机激活失败')
      return false
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    health,
    setup,
    localAgentReachable,
    activationForm,
    activationErrorMessage,
    manualActivationGateOpen,
    isDeviceBound,
    activationModalForced,
    needsActivationGate,
    kioskBrowserSessionSyncNeeded,
    activationGateReason,
    activationTitle,
    deviceReadiness,
    hasActiveDeviceActivation,
    isActivatedForMarkApis,
    markLocalAgentDisconnected,
    refreshDeviceActivationState,
    activateDevice,
    syncActivationFormFromAgent,
    openManualActivation,
    closeManualActivation,
  }
}
