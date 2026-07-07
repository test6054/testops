import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkExamContext } from '@/composables/useMarkExamContext'

/** 成绩发布主链路由切换：确认页 ↔ 发布页。 */
export function useScoreReleaseNavigation() {
  const router = useRouter()
  const route = useRoute()
  const { selectedExamId } = useMarkExamContext()

  const currentStep = computed<'confirm' | 'publish'>(() =>
    route.name === 'TeacherExamWorkspaceScoreRelease' ? 'publish' : 'confirm',
  )

  function navigateToStep(step: 'confirm' | 'publish'): void {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    if (step === 'publish') {
      void router.push({ name: 'TeacherExamWorkspaceScoreRelease', params: { examId } })
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

  function goScorePublish(): void {
    navigateToStep('publish')
  }

  function goScoreConfirm(): void {
    navigateToStep('confirm')
  }

  return {
    currentStep,
    navigateToStep,
    goExportTasks,
    goScorePublish,
    goScoreConfirm,
  }
}
