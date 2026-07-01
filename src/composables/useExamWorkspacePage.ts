import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { SignalMetric } from '@/types/workbench'
import { useRoute } from 'vue-router'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { buildExamWorkspacePageMetrics } from '@/utils/exam-workspace-page-metrics'

/**
 * 考试工作台子页：从路由 meta 派生页标题与默认页级 KPI。
 */
export function useExamWorkspacePage(customMetrics?: ComputedRef<SignalMetric[]>) {
  const route = useRoute()
  const { snapshot } = useMarkWorkbenchContext()

  const pageTitle = computed(() => String(route.meta.title ?? ''))
  const markStageKey = computed(() => route.meta.markStageKey as MarkStageKey | undefined)
  const journeyKey = computed(() => route.meta.journeyKey as ExamJourneyKey | 'overview' | undefined)

  const defaultPageMetrics = computed(() =>
    buildExamWorkspacePageMetrics({
      markStageKey: markStageKey.value,
      snapshot: snapshot.value,
    }),
  )

  const pageSignalMetrics = computed(() => {
    if (customMetrics && customMetrics.value.length > 0) {
      return customMetrics.value
    }
    return defaultPageMetrics.value
  })

  return {
    pageTitle,
    pageSignalMetrics,
    markStageKey,
    journeyKey,
  }
}
