import type { ArchiveTenantSetupReadinessResponse } from '@/apis/mark/archive-platform-template'
import { ref } from 'vue'
import { getArchiveTenantSetupReadiness } from '@/apis/mark/archive-platform-template'
import { showUserError } from '@/utils/error-handler'

export function useArchiveTenantSetupReadiness() {
  const readinessLoading = ref(false)
  const readiness = ref<ArchiveTenantSetupReadinessResponse | null>(null)
  const readinessLoadFailed = ref(false)

  async function loadReadiness() {
    readinessLoading.value = true
    readinessLoadFailed.value = false
    try {
      readiness.value = await getArchiveTenantSetupReadiness()
    } catch (error) {
      readiness.value = null
      readinessLoadFailed.value = true
      showUserError(error, '加载归档启用就绪状态失败')
    } finally {
      readinessLoading.value = false
    }
  }

  const overallReady = () => readiness.value?.overallReady === true

  return {
    readinessLoading,
    readiness,
    readinessLoadFailed,
    loadReadiness,
    overallReady,
  }
}
