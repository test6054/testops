import type { ImprovementWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import { ref } from 'vue'
import { workbenchApi } from '@/apis/quality/workbench'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { toUserError } from '@/utils/error-handler'

/**
 * 改进工作台 SignalBand 数据源：调用后端 signal-summary 聚合接口，
 * 避免 readAllPages 拉四表全量后在客户端 filter/length 冒充租户级健康度统计。
 */
export function useImprovementWorkbenchSignalSources() {
  const qualityStore = useQualityStore()
  const signalSummary = ref<ImprovementWorkbenchSignalSummaryVO | null>(null)

  /** @returns 是否已将当前 scope 下的汇总写入 SignalBand */
  async function loadSignalSources(): Promise<boolean> {
    const scope = beginQualityScopeRequest()
    const trainingPlanId = qualityStore.currentTrainingPlanId
    const programId = qualityStore.currentProgramId || undefined

    try {
      const summary = await workbenchApi.improvementSignalSummary({
        trainingPlanId: trainingPlanId || undefined,
        programId,
      })
      if (scope.isStale()) {
        return false
      }
      signalSummary.value = summary
      return true
    } catch (error) {
      if (scope.isStale()) {
        return false
      }
      throw toUserError(error, '工作台指标加载失败')
    }
  }

  return {
    signalSummary,
    loadSignalSources,
  }
}
