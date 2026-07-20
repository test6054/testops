import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMarkExamContext } from '@/composables/useMarkExamContext'

/**
 * 成绩确认与发布单页导航：确认/发布已合并为 TeacherExamWorkspaceScoreSummary。
 * goScorePublish / goScoreConfirm 均进入该页，保留旧调用名避免业务入口散改。
 */
export function useScoreReleaseNavigation() {
  const router = useRouter()
  const { selectedExamId } = useMarkExamContext()

  /** 兼容历史「确认/发布」双步导航；单页后恒为 confirm。 */
  const currentStep = computed(() => 'confirm' as const)

  function goScoreWorkbench(): void {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    void router.push({ name: 'TeacherExamWorkspaceScoreSummary', params: { examId } })
  }

  function navigateToStep(_step: 'confirm' | 'publish'): void {
    goScoreWorkbench()
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

  function goScorePublish(): void {
    goScoreWorkbench()
  }

  function goScoreConfirm(): void {
    goScoreWorkbench()
  }

  return {
    currentStep,
    navigateToStep,
    goExportTasks,
    goScorePublish,
    goScoreConfirm,
  }
}
