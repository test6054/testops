/** 教师阅卷概览待办类型 */
export enum MarkTeacherDashboardTodoTypeCode {
  SCAN_ATTENTION = 'SCAN_ATTENTION',
  PROCESSING_OPEN = 'PROCESSING_OPEN',
  GRADE_PENDING = 'GRADE_PENDING',
  REVIEW_PENDING = 'REVIEW_PENDING',
  SCORE_UNPUBLISHED = 'SCORE_UNPUBLISHED',
  CANDIDATE_UNBOUND = 'CANDIDATE_UNBOUND',
  ARBITRATION_PENDING = 'ARBITRATION_PENDING',
  SPOT_CHECK_PENDING = 'SPOT_CHECK_PENDING',
  EXPERIENCE_ASSIST_PENDING = 'EXPERIENCE_ASSIST_PENDING',
}

export const ALL_MARK_TEACHER_DASHBOARD_TODO_TYPE_CODES: readonly MarkTeacherDashboardTodoTypeCode[] = [
  MarkTeacherDashboardTodoTypeCode.SCAN_ATTENTION,
  MarkTeacherDashboardTodoTypeCode.PROCESSING_OPEN,
  MarkTeacherDashboardTodoTypeCode.GRADE_PENDING,
  MarkTeacherDashboardTodoTypeCode.REVIEW_PENDING,
  MarkTeacherDashboardTodoTypeCode.SCORE_UNPUBLISHED,
  MarkTeacherDashboardTodoTypeCode.CANDIDATE_UNBOUND,
  MarkTeacherDashboardTodoTypeCode.ARBITRATION_PENDING,
  MarkTeacherDashboardTodoTypeCode.SPOT_CHECK_PENDING,
  MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING,
]

export const MarkTeacherDashboardTodoTypeDescription: Record<MarkTeacherDashboardTodoTypeCode, string> = {
  [MarkTeacherDashboardTodoTypeCode.SCAN_ATTENTION]: '扫描需关注',
  [MarkTeacherDashboardTodoTypeCode.PROCESSING_OPEN]: '识别处理中',
  [MarkTeacherDashboardTodoTypeCode.GRADE_PENDING]: '待确认题目',
  [MarkTeacherDashboardTodoTypeCode.REVIEW_PENDING]: '待复核',
  [MarkTeacherDashboardTodoTypeCode.SCORE_UNPUBLISHED]: '成绩待发布',
  [MarkTeacherDashboardTodoTypeCode.CANDIDATE_UNBOUND]: '考生未绑定',
  [MarkTeacherDashboardTodoTypeCode.ARBITRATION_PENDING]: '仲裁待审核',
  [MarkTeacherDashboardTodoTypeCode.SPOT_CHECK_PENDING]: '抽检待处理',
  [MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING]: '经验定标待完成',
}
