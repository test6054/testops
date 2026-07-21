/** 评价教师通知状态 - 与后端 PortfolioEvaluationTeacherNoticeStatusEnum 逐值对齐 */
export enum PortfolioEvaluationTeacherNoticeStatusEnum {
  MATERIAL_CONFIRM = 'MATERIAL_CONFIRM',
  RETURNED_SUPPLEMENT = 'RETURNED_SUPPLEMENT',
  CONFIRMED = 'CONFIRMED',
  LIFECYCLE_INVALIDATED = 'LIFECYCLE_INVALIDATED',
}

export const ALL_PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_ENUMS: readonly PortfolioEvaluationTeacherNoticeStatusEnum[] = [
  PortfolioEvaluationTeacherNoticeStatusEnum.MATERIAL_CONFIRM,
  PortfolioEvaluationTeacherNoticeStatusEnum.RETURNED_SUPPLEMENT,
  PortfolioEvaluationTeacherNoticeStatusEnum.CONFIRMED,
  PortfolioEvaluationTeacherNoticeStatusEnum.LIFECYCLE_INVALIDATED,
]

export const PortfolioEvaluationTeacherNoticeStatusDescription: Record<
  PortfolioEvaluationTeacherNoticeStatusEnum,
  string
> = {
  [PortfolioEvaluationTeacherNoticeStatusEnum.MATERIAL_CONFIRM]: '材料待确认',
  [PortfolioEvaluationTeacherNoticeStatusEnum.RETURNED_SUPPLEMENT]: '退回补充',
  [PortfolioEvaluationTeacherNoticeStatusEnum.CONFIRMED]: '已确认',
  [PortfolioEvaluationTeacherNoticeStatusEnum.LIFECYCLE_INVALIDATED]: '生命周期失效',
}
