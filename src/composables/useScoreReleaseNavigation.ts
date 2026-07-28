import { useRouter } from 'vue-router'
import { useMarkExamContext } from '@/composables/useMarkExamContext'

/**
 * 成绩确认与发布单页导航：唯一入口 TeacherExamWorkspaceScoreSummary。
 */
export function useScoreReleaseNavigation() {
  const router = useRouter()
  const { selectedExamId } = useMarkExamContext()

  function goScoreWorkbench(): void {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    void router.push({ name: 'TeacherExamWorkspaceScoreSummary', params: { examId } })
  }

  function goExportTasks(): void {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceArchiveExports',
      params: { examId },
    })
  }

  return {
    goScoreWorkbench,
    goExportTasks,
  }
}
