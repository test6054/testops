import type { PortfolioTeacherDetailVO, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { ref } from 'vue'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import {
  formatPortfolioTeacherDetailSelectLabel,
  toPortfolioTeacherSelectOption,
} from '@/utils/portfolio-teacher-display'

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

  function rememberTeacherDetailLabel(teacher: PortfolioTeacherDetailVO): void {
    const label = formatPortfolioTeacherDetailSelectLabel(teacher)
    if (!label) {
      return
    }
    teacherLabelById.value.set(teacher.userId, label)
  }

  async function searchTeachers(keyword: string) {
    const text = keyword.trim()
    if (!text) {
      return
    }
    try {
      const page = await portfolioTeacherApi.page({ pageNum: 1, pageSize: 20, searchText: text })
      teacherOptions.value = readPageList(page, '搜索教师失败').flatMap((teacher) => {
        rememberTeacherSummaryOption(teacher)
        const option = toPortfolioTeacherSelectOption(teacher)
        return option ? [option] : []
      })
    }
    catch (error) {
      showUserError(error)
    }
  }

  async function hydrateTeacherLabels(userIds: string[]) {
    for (const userId of userIds) {
      if (!userId || teacherLabelById.value.has(userId)) {
        continue
      }
      try {
        const detail = await portfolioTeacherApi.get(userId)
        rememberTeacherDetailLabel(detail)
      }
      catch {
        // 教师详情未加载成功时不写入姓名兜底
      }
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
      return '—'
    }
    return label
  }

  return {
    teacherOptions,
    searchTeachers,
    hydrateTeacherLabels,
    rememberTeacherSelectLabel,
    teacherLabel,
  }
}
