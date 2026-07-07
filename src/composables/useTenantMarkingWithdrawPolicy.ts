import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import {
  formatMarkingWithdrawWindowLabel,
  resolveMarkingWithdrawWindowMs,
} from '@/apis/mark/marking-withdraw'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'

/**
 * 从工作台快照读取租户阅卷撤回窗口 / 延迟自动确认策略（后端真源）。
 */
export function useTenantMarkingWithdrawPolicy() {
  const { snapshot } = storeToRefs(useMarkStageStore())

  const manualFinalScoreConfirmRequired = computed(() => snapshot.value?.manualFinalScoreConfirmRequired)
  const delayedFinalScoreConfirmMinutes = computed(() => snapshot.value?.delayedFinalScoreConfirmMinutes)

  const withdrawWindowMinutes = computed(() => {
    const minutes = delayedFinalScoreConfirmMinutes.value
    if (minutes == null) {
      return null
    }
    return minutes
  })

  const withdrawWindowMs = computed(() => {
    const minutes = withdrawWindowMinutes.value
    if (minutes == null) {
      return null
    }
    return resolveMarkingWithdrawWindowMs(minutes)
  })

  const withdrawWindowLabel = computed(() => {
    const minutes = withdrawWindowMinutes.value
    if (minutes == null) {
      return null
    }
    return formatMarkingWithdrawWindowLabel(minutes)
  })

  const withdrawConfirmHint = computed(() => {
    const minutes = withdrawWindowMinutes.value
    if (minutes == null) {
      return null
    }
    return `提交后可在 ${minutes} 分钟内撤销`
  })

  function requireWithdrawWindowMinutes(): number | null {
    const minutes = withdrawWindowMinutes.value
    if (minutes == null) {
      showUserError(null, '工作台快照缺少租户撤回窗口配置，请刷新后重试')
      return null
    }
    return minutes
  }

  return {
    manualFinalScoreConfirmRequired,
    delayedFinalScoreConfirmMinutes,
    withdrawWindowMinutes,
    withdrawWindowMs,
    withdrawWindowLabel,
    withdrawConfirmHint,
    requireWithdrawWindowMinutes,
  }
}
