/** 考试工作台优先推进原因 - ExamWorkbenchPriorityReasonCode */
export enum ExamWorkbenchPriorityReasonCode {
  SCAN_ATTENTION = 'SCAN_ATTENTION',
  UNBOUND_CANDIDATE_INCIDENT = 'UNBOUND_CANDIDATE_INCIDENT',
  MISSING_CANDIDATE_ROSTER = 'MISSING_CANDIDATE_ROSTER',
  OPEN_PROCESSING_TASK = 'OPEN_PROCESSING_TASK',
  PENDING_REVIEW_TASK = 'PENDING_REVIEW_TASK',
  UNCONFIRMED_GRADE = 'UNCONFIRMED_GRADE',
  CONFIRMED_UNPUBLISHED_SCORE = 'CONFIRMED_UNPUBLISHED_SCORE',
}

export const ALL_EXAM_WORKBENCH_PRIORITY_REASON_CODES: readonly ExamWorkbenchPriorityReasonCode[] = [
  ExamWorkbenchPriorityReasonCode.SCAN_ATTENTION,
  ExamWorkbenchPriorityReasonCode.UNBOUND_CANDIDATE_INCIDENT,
  ExamWorkbenchPriorityReasonCode.MISSING_CANDIDATE_ROSTER,
  ExamWorkbenchPriorityReasonCode.OPEN_PROCESSING_TASK,
  ExamWorkbenchPriorityReasonCode.PENDING_REVIEW_TASK,
  ExamWorkbenchPriorityReasonCode.UNCONFIRMED_GRADE,
  ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE,
]

export const ExamWorkbenchPriorityReasonDescription: Record<ExamWorkbenchPriorityReasonCode, string> = {
  [ExamWorkbenchPriorityReasonCode.SCAN_ATTENTION]: '扫描异常待办',
  [ExamWorkbenchPriorityReasonCode.UNBOUND_CANDIDATE_INCIDENT]: '考生未绑定待处置',
  [ExamWorkbenchPriorityReasonCode.MISSING_CANDIDATE_ROSTER]: '考生名册缺失关注',
  [ExamWorkbenchPriorityReasonCode.OPEN_PROCESSING_TASK]: '识别处理任务未闭合',
  [ExamWorkbenchPriorityReasonCode.PENDING_REVIEW_TASK]: '待复核任务',
  [ExamWorkbenchPriorityReasonCode.UNCONFIRMED_GRADE]: '成绩待确认',
  [ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE]: '成绩待发布',
}

/**
 * 优先推进原因 → 工作台路由 name；与后端 ExamWorkbenchPriorityReasonCode.workspaceRouteName 逐值一致。
 * 原因筛选深链下的行入口必须走本表，不得改走主因 urgency 路由（禁双轨）。
 */
export const ExamWorkbenchPriorityReasonWorkspaceRoute: Record<ExamWorkbenchPriorityReasonCode, string> = {
  [ExamWorkbenchPriorityReasonCode.SCAN_ATTENTION]: 'TeacherExamWorkspaceScanMonitor',
  [ExamWorkbenchPriorityReasonCode.UNBOUND_CANDIDATE_INCIDENT]: 'TeacherExamWorkspaceScanBatches',
  [ExamWorkbenchPriorityReasonCode.MISSING_CANDIDATE_ROSTER]: 'TeacherExamWorkspaceCandidateRoster',
  [ExamWorkbenchPriorityReasonCode.OPEN_PROCESSING_TASK]: 'TeacherExamWorkspaceScanMonitor',
  [ExamWorkbenchPriorityReasonCode.PENDING_REVIEW_TASK]: 'TeacherExamWorkspaceReviewBatchConfirm',
  [ExamWorkbenchPriorityReasonCode.UNCONFIRMED_GRADE]: 'TeacherExamWorkspaceScoreSummary',
  [ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE]: 'TeacherExamWorkspaceScoreRelease',
}

/** 原因筛选下的行主动作文案；与 KPI 意图对齐。 */
export const ExamWorkbenchPriorityReasonEnterActionLabel: Record<ExamWorkbenchPriorityReasonCode, string> = {
  [ExamWorkbenchPriorityReasonCode.SCAN_ATTENTION]: '去处置',
  [ExamWorkbenchPriorityReasonCode.UNBOUND_CANDIDATE_INCIDENT]: '去处置',
  [ExamWorkbenchPriorityReasonCode.MISSING_CANDIDATE_ROSTER]: '去名册',
  [ExamWorkbenchPriorityReasonCode.OPEN_PROCESSING_TASK]: '去处置',
  [ExamWorkbenchPriorityReasonCode.PENDING_REVIEW_TASK]: '去复核',
  [ExamWorkbenchPriorityReasonCode.UNCONFIRMED_GRADE]: '去确认',
  [ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE]: '去发布',
}

