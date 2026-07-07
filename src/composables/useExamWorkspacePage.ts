import type { ComputedRef } from 'vue'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { isExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import { buildExamWorkspacePageMetrics } from '@/utils/exam-workspace-page-metrics'

/**
 * 考试工作台子页：从路由 meta 派生页标题与默认页级 KPI。
 */
export function useExamWorkspacePage(customMetrics?: ComputedRef<SignalMetric[]>) {
  const route = useRoute()
  const { snapshot } = useMarkWorkbenchContext()

  const pageTitle = computed(() => String(route.meta.title ?? ''))
  const markStageKey = computed<MarkStageKey | undefined>(() => {
    const key = route.meta.markStageKey
    if (key === undefined) {
      return undefined
    }
    if (isMarkStageKey(key)) {
      return key
    }
    throw new Error(`考试工作台路由阶段契约异常：${String(route.name ?? route.path)}`)
  })
  const journeyKey = computed<ExamJourneyKey | 'overview' | undefined>(() => {
    const key = route.meta.journeyKey
    if (key === undefined) {
      return undefined
    }
    if (isExamWorkspaceJourneyKey(key)) {
      return key
    }
    throw new Error(`考试工作台路由旅程契约异常：${String(route.name ?? route.path)}`)
  })

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

function isMarkStageKey(key: unknown): key is MarkStageKey {
  return key === 'EXAM_PREP'
    || key === 'PAPER_TEMPLATE'
    || key === 'CANDIDATE_ROSTER'
    || key === 'SCAN'
    || key === 'MARKING_ORG'
    || key === 'TRIAL_MARKING'
    || key === 'FORMAL_MARKING'
    || key === 'SCORE_PUBLISH'
    || key === 'ARCHIVE'
}
