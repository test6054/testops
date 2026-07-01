import type { ObeJourneySummaryVO } from '@/apis/quality/workbench'
import { workbenchApi } from '@/apis/quality/workbench'
import { computed, ref, watch } from 'vue'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'

/** layout OBE journey strip 数据：随 scope 变更刷新 */
export function useObeJourneySummary() {
  const qualityStore = useQualityStore()
  const summary = ref<ObeJourneySummaryVO>()
  const loading = ref(false)

  const scopeKey = computed(() => [
    qualityStore.currentTrainingPlanId,
    qualityStore.currentSchoolYear,
    qualityStore.currentSemester,
    qualityStore.scopeChangeEpoch,
  ].join('|'))

  async function reload(): Promise<void> {
    const trainingPlanId = qualityStore.currentTrainingPlanId
    if (!trainingPlanId) {
      summary.value = undefined
      return
    }
    loading.value = true
    try {
      summary.value = await workbenchApi.obeJourneySummary({
        trainingPlanId,
        schoolYear: qualityStore.currentSchoolYear || undefined,
        semester: qualityStore.currentSemester || undefined,
      })
    } catch (error) {
      summary.value = undefined
      showUserError(error)
    } finally {
      loading.value = false
    }
  }

  watch(scopeKey, () => {
    void reload()
  }, { immediate: true })

  return {
    summary,
    loading,
    reload,
  }
}
