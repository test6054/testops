/** 教师生命周期变更审批状态 - PortfolioTeacherLifecycleApprovalStatusEnum */
export enum PortfolioTeacherLifecycleApprovalStatusCode {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
}

export const PortfolioTeacherLifecycleApprovalStatusDescription: Record<
  PortfolioTeacherLifecycleApprovalStatusCode,
  string
> = {
  [PortfolioTeacherLifecycleApprovalStatusCode.PENDING]: '待审批',
  [PortfolioTeacherLifecycleApprovalStatusCode.APPROVED]: '已通过',
  [PortfolioTeacherLifecycleApprovalStatusCode.REJECTED]: '已驳回',
  [PortfolioTeacherLifecycleApprovalStatusCode.APPLIED]: '已生效',
}
