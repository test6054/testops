import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { ref } from 'vue'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { REMOTE_SEARCH_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { toPortfolioTeacherSelectOption } from '@/utils/portfolio-teacher-display'

/**
 * portfolio 管理台教师远程搜索与姓名缓存；供成果库/荣誉库等表单绑定 teacherUserId。
 */
export function usePortfolioTeacherSearch() {
  const teacherOptions = ref<Array<{ value: string, label: string }>>([])
  const teacherLabelById = ref(new Map<string, string>())

  function rememberTeacherSummaryOption(teacher: PortfolioTeacherSummaryVO): void {
    const option = toPortfolioTeacherSelectOption(teacher)
    if (!option) {
      return
    }
    teacherLabelById.value.set(option.value, option.label)
  }

  async function searchTeachers(keyword: string) {
    const text = keyword.trim()
    if (!text) {
      return
    }
    try {
      const page = await portfolioTeacherApi.page({ pageNum: 1, pageSize: REMOTE_SEARCH_PAGE_SIZE, searchText: text })
      teacherOptions.value = page.list.flatMap((teacher) => {
        rememberTeacherSummaryOption(teacher)
        const option = toPortfolioTeacherSelectOption(teacher)
        return option ? [option] : []
      })
    }
    catch (error) {
      showUserError(error, '搜索教师失败')
    }
  }

  function rememberTeacherSelectLabel(userId: string, label: string) {
    teacherLabelById.value.set(userId, label)
  }

  function teacherLabel(userId?: string): string {
    if (!userId) {
      return '—'
    }
    const label = teacherLabelById.value.get(userId)
    if (!label) {
      throw new Error(`教师 ${userId} 缺少已缓存的姓名标签，请先选中或搜索该教师`)
    }
    return label
  }

  return {
    teacherOptions,
    searchTeachers,
    rememberTeacherSelectLabel,
    teacherLabel,
  }
}
