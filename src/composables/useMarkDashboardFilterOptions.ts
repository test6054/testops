import type { MarkTeacherDashboardFilterOptionsVO } from '@/apis/mark/teacher-dashboard'
import { ref } from 'vue'
import { loadTeacherDashboardSignalSectionSilent } from '@/apis/mark/teacher-dashboard'
import { showUserError } from '@/utils/error-handler'

/**
 * 工作台 ContextBar 三筛选项真源：与 marking-overview signal 段 filterOptions 同源。
 */
export function useMarkDashboardFilterOptions() {
  const filterOptions = ref<MarkTeacherDashboardFilterOptionsVO | null>(null)
  const filterOptionsLoading = ref(false)
  const filterOptionsFailed = ref(false)

  async function loadFilterOptions(
    force = false,
  ): Promise<MarkTeacherDashboardFilterOptionsVO | null> {
    if (!force && filterOptions.value) {
      return filterOptions.value
    }
    filterOptionsLoading.value = true
    filterOptionsFailed.value = false
    try {
      const signal = await loadTeacherDashboardSignalSectionSilent({})
      filterOptions.value = signal.filterOptions
      return filterOptions.value
    } catch (error) {
      filterOptionsFailed.value = true
      showUserError(error, '工作台筛选条件加载失败')
      return filterOptions.value
    } finally {
      filterOptionsLoading.value = false
    }
  }

  return {
    filterOptions,
    filterOptionsLoading,
    filterOptionsFailed,
    loadFilterOptions,
  }
}
