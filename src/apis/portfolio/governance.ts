import type { PortfolioAnalysisComplianceAlertVO } from '@/apis/portfolio/analysis'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

/** 对齐后端 PortfolioExportBusinessRef */
export interface PortfolioExportBusinessRef {
  teacherId?: string
  academicYear?: string
  semester?: string
  departmentId?: string
  planYear?: string
  portfolioOrgId?: string
  teachingGroupId?: string
  completenessLevel?: string
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
  majorGroupName?: string
  reportType?: string
}

export interface PortfolioExportApprovalVO {
  id: string
  applicantUserId: string
  exportType: string
  businessRef: PortfolioExportBusinessRef
  exportPurpose: string
  approvalStatus: string
  approverUserId?: string
  approvedTime?: string
  rejectReason?: string
  downloadTime?: string
  createTime: string
  fileNodeId?: string
  fileName?: string
  expireTime?: string
  revokeReason?: string
  revokeUserId?: string
  revokeTime?: string
  /** 导出标的教师用户 ID（业务引用 teacherId） */
  subjectTeacherUserId?: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  ownerMultiIdentityNote?: string
}

export interface PortfolioMajorGroupPortfolioSectionSummaryVO {
  sectionCode: string
  sectionTitle: string
  itemCount: number
}

export interface PortfolioMajorGroupPortfolioVO {
  portfolioOrgId: string
  majorGroupName: string
  majorGroupCode: string
  teacherCount: number
  portraitTeacherCount: number
  avgCompositeScore: string
  dualTeacherCount: number
  officialArchiveCount: number
  developmentPlanCount: number
  complianceAlerts: PortfolioAnalysisComplianceAlertVO[]
  sections: PortfolioMajorGroupPortfolioSectionSummaryVO[]
}

export interface PortfolioMajorGroupPortfolioSectionItemVO {
  businessId: string
  teacherId: string
  categoryCode: string
  categoryLabel: string
  recordTitle: string
  periodLabel: string
  statusLabel: string
  contributionFactor?: number | string
  majorGroupMembershipCount?: number
  contributionNote?: string
  identityType?: string
  identityTypeLabel?: string
  externalIdentity?: boolean
  identityCompositeScore?: number | string
  workloadHours?: number | string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string

}


export interface PortfolioMaskRuleVO {
  id: string
  fieldType: string
  exportScope: string
  maskStrategy: string
  enabled: boolean
  updateTime: string
}

export interface PortfolioAuditLogVO {
  id: string
  operatorUserId: string
  actionType: string
  resourceType: string
  resourceId?: string
  actionSummary: string
  detailJson?: string
  createTime: string
}

export const portfolioSecurityApi = {
  applyExport: (data: {
    exportType: string
    businessRef: PortfolioExportBusinessRef
    exportPurpose: string
  }) => http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/apply', data),
  approveExport: (data: { id: string, approved: boolean, rejectReason?: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/approve', data),
  pageExport: (data: {
    pageNum: number
    pageSize: number
    id?: string | number
    approvalStatus?: string
    applicantUserId?: string
  }) =>
    http.post<PageResult<PortfolioExportApprovalVO>>('/api/portfolio/security/export/page', data),
  downloadExport: (data: { id: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/download', data),
  revokeExport: (data: { id: string, revokeReason: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/revoke', data),
  saveMaskRule: (data: {
    fieldType: string
    exportScope: string
    maskStrategy: string
    enabled?: boolean
  }) => http.post<PortfolioMaskRuleVO>('/api/portfolio/security/mask-rule/save', data),
  pageMaskRule: (data: {
    pageNum: number
    pageSize: number
    fieldType?: string
    exportScope?: string
    enabled?: boolean
  }) => http.post<PageResult<PortfolioMaskRuleVO>>('/api/portfolio/security/mask-rule/page', data),
  pageAudit: (data: {
    pageNum: number
    pageSize: number
    actionType?: string
    resourceType?: string
    operatorUserId?: string
  }) => http.post<PageResult<PortfolioAuditLogVO>>('/api/portfolio/security/audit/page', data),
}

export interface PortfolioMajorGroupPeriodCompareVO {
  portfolioOrgId: string
  baselinePeriodYear: string
  comparePeriodYear: string
  baselineOfficialArchiveCount: number
  compareOfficialArchiveCount: number
  officialArchiveCountDelta: number
  baselineDevelopmentPlanCount: number
  compareDevelopmentPlanCount: number
  developmentPlanCountDelta: number
}

export const portfolioMajorGroupApi = {
  getPortfolio: (data: { portfolioOrgId: string }) =>
    http.post<PortfolioMajorGroupPortfolioVO>('/api/portfolio/major-group/portfolio/get', data),
  pageSection: (data: {
    portfolioOrgId: string
    sectionCode: string
    pageNum: number
    pageSize: number
  }) =>
    http.post<PageResult<PortfolioMajorGroupPortfolioSectionItemVO>>(
      '/api/portfolio/major-group/portfolio/section/page',
      data,
    ),
  exportPortfolio: (data: { portfolioOrgId: string, exportPurpose: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/major-group/portfolio/export', data),
  comparePeriods: (data: {
    portfolioOrgId: string
    baselinePeriodYear: string
    comparePeriodYear: string
  }) =>
    http.post<PortfolioMajorGroupPeriodCompareVO>(
      '/api/portfolio/major-group/portfolio/period/compare',
      data,
    ),
}
