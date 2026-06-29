import { ref } from 'vue'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'

/**
 * portfolio 管理台教师远程搜索与姓名缓存；供成果库/荣誉库等表单绑定 teacherUserId。
 */
export function usePortfolioTeacherSearch() {
  const teacherOptions = ref<Array<{ value: string, label: string }>>([])
  const teacherLabelById = ref(new Map<string, string>())

  function formatTeacherLabel(userId: string, nickName?: string, teacherNumber?: string): string {
    return `${nickName ?? teacherNumber ?? userId}${teacherNumber ? ` · ${teacherNumber}` : ''}`
  }

  function rememberTeacherOption(userId: string, label: string) {
    teacherLabelById.value.set(userId, label)
  }

  async function searchTeachers(keyword: string) {
    const text = keyword.trim()
    if (!text) {
      return
    }
    try {
      const page = await portfolioTeacherApi.page({ pageNum: 1, pageSize: 20, searchText: text })
      teacherOptions.value = readPageList(page, '搜索教师失败').map((item) => {
        const label = formatTeacherLabel(item.userId, item.nickName, item.teacherNumber)
        rememberTeacherOption(item.userId, label)
        return { value: item.userId, label }
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
        rememberTeacherOption(userId, formatTeacherLabel(userId, detail.nickName, detail.teacherNumber))
      }
      catch {
        rememberTeacherOption(userId, userId)
      }
    }
  }

  function teacherLabel(userId?: string): string {
    if (!userId) {
      return '—'
    }
    return teacherLabelById.value.get(userId) ?? userId
  }

  return {
    teacherOptions,
    searchTeachers,
    hydrateTeacherLabels,
    teacherLabel,
  }
}
