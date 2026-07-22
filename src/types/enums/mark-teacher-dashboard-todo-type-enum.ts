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
  [MarkTeacherDashboardTodoTypeCode.SCAN_ATTENTION]: '扫描需关注 {n} 份',
  [MarkTeacherDashboardTodoTypeCode.PROCESSING_OPEN]: '识别处理中 {n} 项',
  [MarkTeacherDashboardTodoTypeCode.GRADE_PENDING]: '待确认题目 {n} 道',
  [MarkTeacherDashboardTodoTypeCode.REVIEW_PENDING]: '待复核 {n} 项',
  [MarkTeacherDashboardTodoTypeCode.SCORE_UNPUBLISHED]: '成绩待发布/待重发 {n} 份',
  [MarkTeacherDashboardTodoTypeCode.CANDIDATE_UNBOUND]: '考生未绑定 {n} 人',
  [MarkTeacherDashboardTodoTypeCode.ARBITRATION_PENDING]: '仲裁待审核 {n} 项',
  [MarkTeacherDashboardTodoTypeCode.SPOT_CHECK_PENDING]: '抽检待处理 {n} 项',
  [MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING]: '经验定标待完成 {n} 项',
}
