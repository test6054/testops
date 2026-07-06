/**
 * 审核评估证据条目载荷。
 *
 * 后端整改任务与督导复查都使用该结构承载归档、文件、报告等证据引用。
 */
export interface AuditEvidenceItemRequest {
  evidenceType?: string
  evidenceTitle?: string
  evidenceCode?: string
  archiveId?: string
  fileNodeId?: string
  reportId?: string
  remark?: string
}

export interface AuditEvidenceItemVO {
  id?: string
  evidenceType?: string
  evidenceTitle?: string
  evidenceCode?: string
  archiveId?: string
  fileNodeId?: string
  reportId?: string
  remark?: string
}
