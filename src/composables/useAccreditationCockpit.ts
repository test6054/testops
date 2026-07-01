import type { AccreditationCockpitVO } from '@/apis/quality/accreditation'
import { computed, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'

const cockpit = ref<AccreditationCockpitVO>()
const cockpitLoading = ref(false)
let cachedKey = ''

/** 认证驾驶舱单例缓存：programId + trainingPlanId 变更时失效 */
export function useAccreditationCockpit() {
  const qualityStore = useQualityStore()

  const cacheKey = computed(
    () => `${qualityStore.currentProgramId}_${qualityStore.currentTrainingPlanId}`,
  )

  watch(cacheKey, () => {
    cockpit.value = undefined
    cachedKey = ''
  })

  async function refresh(force = false): Promise<AccreditationCockpitVO | undefined> {
    const planId = qualityStore.currentTrainingPlanId
    if (!planId) {
      cockpit.value = undefined
      cachedKey = ''
      return undefined
    }
    const key = cacheKey.value
    if (!force && cachedKey === key && cockpit.value) {
      return cockpit.value
    }
    cockpitLoading.value = true
    try {
      cockpit.value = await accreditationApi.cockpit(planId)
      cachedKey = key
      return cockpit.value
    } catch (error) {
      cockpit.value = undefined
      cachedKey = ''
      showUserError(error)
      return undefined
    } finally {
      cockpitLoading.value = false
    }
  }

  return {
    cockpit,
    cockpitLoading,
    cacheKey,
    refresh,
  }
}
