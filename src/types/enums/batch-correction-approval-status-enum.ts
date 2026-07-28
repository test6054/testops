/** 批量成绩更正计划审批状态 */
export enum BatchCorrectionApprovalStatusCode {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  PARTIAL_FAILED = 'PARTIAL_FAILED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export const ALL_BATCH_CORRECTION_APPROVAL_STATUS_CODES: readonly BatchCorrectionApprovalStatusCode[] = [
  BatchCorrectionApprovalStatusCode.DRAFT,
  BatchCorrectionApprovalStatusCode.PENDING_APPROVAL,
  BatchCorrectionApprovalStatusCode.APPROVED,
  BatchCorrectionApprovalStatusCode.EXECUTING,
  BatchCorrectionApprovalStatusCode.PARTIAL_FAILED,
  BatchCorrectionApprovalStatusCode.COMPLETED,
  BatchCorrectionApprovalStatusCode.REJECTED,
]

export const BatchCorrectionApprovalStatusDescription: Record<BatchCorrectionApprovalStatusCode, string> = {
  [BatchCorrectionApprovalStatusCode.DRAFT]: '草稿',
  [BatchCorrectionApprovalStatusCode.PENDING_APPROVAL]: '待审批',
  [BatchCorrectionApprovalStatusCode.APPROVED]: '已通过',
  [BatchCorrectionApprovalStatusCode.EXECUTING]: '执行中',
  [BatchCorrectionApprovalStatusCode.PARTIAL_FAILED]: '部分失败',
  [BatchCorrectionApprovalStatusCode.COMPLETED]: '已完成',
  [BatchCorrectionApprovalStatusCode.REJECTED]: '已驳回',
}
