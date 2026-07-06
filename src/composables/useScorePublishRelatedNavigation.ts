import { useRouter } from 'vue-router'
import { useMarkExamContext } from '@/composables/useMarkExamContext'

/** 成绩发布旅程跨页路由跳转。 */
export function useScorePublishRelatedNavigation() {
  const router = useRouter()
  const { selectedExamId } = useMarkExamContext()

  function navigateToRoute(routeName: string): void {
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    void router.push({ name: routeName, params: { examId } })
  }

  return { navigateToRoute }
}
