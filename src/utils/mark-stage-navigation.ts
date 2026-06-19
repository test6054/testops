import type { Router } from 'vue-router'
import type { MarkStageKey } from '@/stores/modules/markStage'

/** 阅卷九阶段 → 教师端路由名 */
const MARK_STAGE_ROUTE: Record<MarkStageKey, string> = {
  EXAM_PREP: 'TeacherExamPrepWorkbench',
  PAPER_TEMPLATE: 'TeacherPaperTemplate',
  SCAN: 'TeacherScanUpload',
  MARKING_ORG: 'TeacherMarkingOrganizationIndex',
  TRIAL_MARK: 'TeacherMarkingTaskPool',
  FORMAL_MARK: 'TeacherMarkingTaskPool',
  SCORE_PUBLISH: 'TeacherScoreFinalize',
  GRADE_REVIEW: 'TeacherAppealHandle',
  ARCHIVE: 'TeacherStatistics',
}

/**
 * 从 StageRail 点击跳转到对应阶段页面，并携带当前考试上下文。
 */
export function navigateToMarkStage(router: Router, stageKey: string, examId: string): void {
  const routeName = MARK_STAGE_ROUTE[stageKey as MarkStageKey]
  if (!routeName || !examId) {
    return
  }
  void router.push({ name: routeName, query: { examId } })
}
