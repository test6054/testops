import type { Router } from 'vue-router'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { resolveJourneyDefaultRoute } from '@/constants/exam-journey'
import { MARK_STAGE_DEFAULT_ROUTE } from '@/constants/mark-workspace-nav'

/**
 * 从 StageRail 跳转到阶段结构默认子路由。
 * 智能入口（异常处置/复核/评阅）须走快照 workspaceRouteName / nextAction，禁止在此按进度启发分流。
 */
export function navigateToMarkStage(
  router: Router,
  stageKey: string,
  examId: string,
): void {
  if (!examId) {
    return
  }
  if (!isMarkStageKey(stageKey)) {
    return
  }
  const routeName = MARK_STAGE_DEFAULT_ROUTE[stageKey]
  if (!routeName) {
    return
  }
  void router.push({
    name: routeName,
    params: { examId },
  })
}

function isMarkStageKey(stageKey: string): stageKey is MarkStageKey {
  return stageKey === 'EXAM_PREP'
    || stageKey === 'PAPER_TEMPLATE'
    || stageKey === 'CANDIDATE_ROSTER'
    || stageKey === 'SCAN'
    || stageKey === 'MARKING_ORG'
    || stageKey === 'TRIAL_MARKING'
    || stageKey === 'FORMAL_MARKING'
    || stageKey === 'SCORE_PUBLISH'
    || stageKey === 'ARCHIVE'
}

/** 顶部六步旅程轨点击：进入旅程结构默认子路由 */
export function navigateToJourneyStep(
  router: Router,
  journeyKey: ExamJourneyKey,
  examId: string,
): void {
  if (!examId) {
    return
  }
  void router.push(resolveJourneyDefaultRoute(journeyKey, examId))
}
