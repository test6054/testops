/** 评价教师通知状态 - PortfolioEvaluationTeacherNoticeStatusEnum */
export enum PortfolioEvaluationTeacherNoticeStatusCode {
  MATERIAL_CONFIRM = 'MATERIAL_CONFIRM',
  RETURNED_SUPPLEMENT = 'RETURNED_SUPPLEMENT',
  CONFIRMED = 'CONFIRMED',
}

export const ALL_PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_CODES: readonly PortfolioEvaluationTeacherNoticeStatusCode[] = [
  PortfolioEvaluationTeacherNoticeStatusCode.MATERIAL_CONFIRM,
  PortfolioEvaluationTeacherNoticeStatusCode.RETURNED_SUPPLEMENT,
  PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED,
]

export const PortfolioEvaluationTeacherNoticeStatusDescription: Record<PortfolioEvaluationTeacherNoticeStatusCode, string> = {
  [PortfolioEvaluationTeacherNoticeStatusCode.MATERIAL_CONFIRM]: '材料待确认',
  [PortfolioEvaluationTeacherNoticeStatusCode.RETURNED_SUPPLEMENT]: '退回补充',
  [PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED]: '已确认',
}
