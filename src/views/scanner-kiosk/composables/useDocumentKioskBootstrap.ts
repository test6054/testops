import type { ScannerDeviceInfo } from '@/apis/mark/scanner-agent-local'
import { computed, ref } from 'vue'
import { listLocalScanners } from '@/apis/mark/scanner-agent-local'
import { isAgentWorkspaceBlocked, resolveActivationGuardMessage } from '../utils/kioskActivationGuard'
import { useKioskDeviceActivation } from './useKioskDeviceActivation'

/**
 * 归档 / 档案袋文档采集：设备激活（全局单例）+ 本机扫描仪枚举。
 */
export function useDocumentKioskBootstrap() {
  const activation = useKioskDeviceActivation()
  const scanners = ref<ScannerDeviceInfo[]>([])
  const selectedScannerId = ref('')
  const bootstrapReady = ref(false)

  const loading = computed(() => activation.loading.value)
  const health = computed(() => activation.health.value)
  const setup = computed(() => activation.setup.value)
  const canActivateAgent = computed(() => !isAgentWorkspaceBlocked(activation.health.value))

  async function refreshAgentState() {
    await activation.refreshDeviceActivationState()
    if (!activation.isDeviceBound.value) {
      scanners.value = []
      selectedScannerId.value = ''
      return
    }
    const setupContext = activation.setup.value
    if (setupContext?.preferredLocalScannerId) {
      selectedScannerId.value = setupContext.preferredLocalScannerId
    }
    const scannerList = await listLocalScanners()
    scanners.value = scannerList.devices.filter(device => device.available)
    if (!selectedScannerId.value && scanners.value.length > 0) {
      selectedScannerId.value = scanners.value[0].localScannerId
    }
  }

  async function initBootstrap(): Promise<void> {
    try {
      await refreshAgentState()
    }
    finally {
      bootstrapReady.value = true
    }
  }

  async function activateAgent() {
    const ok = await activation.activateDevice({
      guard: () => resolveActivationGuardMessage(activation.health.value),
    })
    if (ok) {
      await refreshAgentState()
    }
    return ok
  }

  return {
    loading,
    health,
    setup,
    scanners,
    selectedScannerId,
    bootstrapReady,
    activation,
    activationForm: activation.activationForm,
    activationErrorMessage: activation.activationErrorMessage,
    needsActivationGate: activation.needsActivationGate,
    canActivateAgent,
    activationGateReason: activation.activationGateReason,
    deviceReadiness: activation.deviceReadiness,
    refreshAgentState,
    initBootstrap,
    activateAgent,
  }
}
