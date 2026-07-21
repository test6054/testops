/** 影响分析审批状态 - PfImpactApprovalStatusEnum（§8.31.1） */
export enum PfImpactApprovalStatusCode {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_PF_IMPACT_APPROVAL_STATUS_CODES: readonly PfImpactApprovalStatusCode[] = [
  PfImpactApprovalStatusCode.NOT_REQUIRED,
  PfImpactApprovalStatusCode.PENDING_APPROVAL,
  PfImpactApprovalStatusCode.APPROVED,
  PfImpactApprovalStatusCode.REJECTED,
]

export const PfImpactApprovalStatusDescription: Record<PfImpactApprovalStatusCode, string> = {
  [PfImpactApprovalStatusCode.NOT_REQUIRED]: '无需审批',
  [PfImpactApprovalStatusCode.PENDING_APPROVAL]: '待审批',
  [PfImpactApprovalStatusCode.APPROVED]: '已审批',
  [PfImpactApprovalStatusCode.REJECTED]: '已驳回',
}

export function pfImpactApprovalAllowsPublish(status?: PfImpactApprovalStatusCode | null): boolean {
  return (
    status === PfImpactApprovalStatusCode.NOT_REQUIRED
    || status === PfImpactApprovalStatusCode.APPROVED
  )
}
