import type { AccreditationCockpitVO } from '@/apis/quality/accreditation'
import { computed, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'

const cockpit = ref<AccreditationCockpitVO>()
const cockpitLoading = ref(false)
/** 按 scope key 缓存成功结果；禁止无 generation 的全局单槽覆盖 */
const cockpitByKey = new Map<string, AccreditationCockpitVO>()
let refreshGeneration = 0

/** 认证驾驶舱：programId + trainingPlanId 变更时失效，请求代际丢弃旧响应 */
export function useAccreditationCockpit() {
  const qualityStore = useQualityStore()

  const cacheKey = computed(
    () => `${qualityStore.currentProgramId}_${qualityStore.currentTrainingPlanId}`,
  )

  watch(cacheKey, (key) => {
    cockpit.value = cockpitByKey.get(key)
  })

  async function refresh(force = false): Promise<AccreditationCockpitVO | undefined> {
    const planId = qualityStore.currentTrainingPlanId
    const key = cacheKey.value
    if (!planId) {
      cockpit.value = undefined
      return undefined
    }
    if (!force) {
      const cached = cockpitByKey.get(key)
      if (cached) {
        cockpit.value = cached
        return cached
      }
    }
    const generation = ++refreshGeneration
    cockpitLoading.value = true
    try {
      const next = await accreditationApi.cockpit({ trainingPlanId: planId })
      if (generation !== refreshGeneration || key !== cacheKey.value) {
        return undefined
      }
      cockpitByKey.set(key, next)
      cockpit.value = next
      return next
    } catch (error) {
      if (generation !== refreshGeneration || key !== cacheKey.value) {
        return undefined
      }
      cockpitByKey.delete(key)
      cockpit.value = undefined
      showUserError(error, '加载认证驾驶舱失败')
      return undefined
    } finally {
      if (generation === refreshGeneration) {
        cockpitLoading.value = false
      }
    }
  }

  return {
    cockpit,
    cockpitLoading,
    cacheKey,
    refresh,
  }
}
