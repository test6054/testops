/** 考试工作台主链阶段键 */
export enum ExamWorkbenchStageKeyCode {
  EXAM_PREP = 'EXAM_PREP',
  PAPER_TEMPLATE = 'PAPER_TEMPLATE',
  CANDIDATE_ROSTER = 'CANDIDATE_ROSTER',
  SCAN = 'SCAN',
  MARKING_ORG = 'MARKING_ORG',
  TRIAL_MARKING = 'TRIAL_MARKING',
  FORMAL_MARKING = 'FORMAL_MARKING',
  SCORE_PUBLISH = 'SCORE_PUBLISH',
  ARCHIVE = 'ARCHIVE',
}

export const ALL_EXAM_WORKBENCH_STAGE_KEY_CODES: readonly ExamWorkbenchStageKeyCode[] = [
  ExamWorkbenchStageKeyCode.EXAM_PREP,
  ExamWorkbenchStageKeyCode.PAPER_TEMPLATE,
  ExamWorkbenchStageKeyCode.CANDIDATE_ROSTER,
  ExamWorkbenchStageKeyCode.SCAN,
  ExamWorkbenchStageKeyCode.MARKING_ORG,
  ExamWorkbenchStageKeyCode.TRIAL_MARKING,
  ExamWorkbenchStageKeyCode.FORMAL_MARKING,
  ExamWorkbenchStageKeyCode.SCORE_PUBLISH,
  ExamWorkbenchStageKeyCode.ARCHIVE,
]

export const ExamWorkbenchStageKeyDescription: Record<ExamWorkbenchStageKeyCode, string> = {
  [ExamWorkbenchStageKeyCode.EXAM_PREP]: '考试准备',
  [ExamWorkbenchStageKeyCode.PAPER_TEMPLATE]: '模板制卷',
  [ExamWorkbenchStageKeyCode.CANDIDATE_ROSTER]: '考生名册',
  [ExamWorkbenchStageKeyCode.SCAN]: '扫描识别',
  [ExamWorkbenchStageKeyCode.MARKING_ORG]: '阅卷组织',
  [ExamWorkbenchStageKeyCode.TRIAL_MARKING]: '试评',
  [ExamWorkbenchStageKeyCode.FORMAL_MARKING]: '正评',
  [ExamWorkbenchStageKeyCode.SCORE_PUBLISH]: '成绩发布',
  [ExamWorkbenchStageKeyCode.ARCHIVE]: '归档复盘',
}

