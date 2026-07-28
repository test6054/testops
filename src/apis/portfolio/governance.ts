import type { PortfolioAnalysisComplianceAlertVO } from '@/apis/portfolio/analysis'
import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import type { PortfolioAnalysisExportReportTypeCode } from '@/types/enums/portfolio-analysis-export-report-type-enum'
import type { PortfolioArchiveRecordStatusCode } from '@/types/enums/portfolio-archive-record-status-enum'
import type { PortfolioAuditActionTypeCode } from '@/types/enums/portfolio-audit-action-type-enum'
import type { PortfolioAuditResourceTypeCode } from '@/types/enums/portfolio-audit-resource-type-enum'
import type { PortfolioCompletenessLevelCode } from '@/types/enums/portfolio-completeness-level-enum'
import type { PortfolioDevelopmentPlanTypeCode } from '@/types/enums/portfolio-development-plan-type-enum'
import type { PortfolioDevelopmentRecordTypeCode } from '@/types/enums/portfolio-development-record-type-enum'
import type { PortfolioDoubleHighTaskStatusCode } from '@/types/enums/portfolio-double-high-task-status-enum'
import type { PortfolioEvaluationObjectionStatusCode } from '@/types/enums/portfolio-evaluation-objection-status-enum'
import type { PortfolioExportApprovalStatusCode } from '@/types/enums/portfolio-export-approval-status-enum'
import type { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import type { PortfolioExternalTeacherContractStatusCode } from '@/types/enums/portfolio-external-teacher-contract-status-enum'
import type { PortfolioExternalTeacherDataStatusCode } from '@/types/enums/portfolio-external-teacher-data-status-enum'
import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import type { PortfolioKeyTeacherRegistryTypeCode } from '@/types/enums/portfolio-key-teacher-registry-type-enum'
import type { PortfolioMajorGroupSectionCode } from '@/types/enums/portfolio-major-group-section-code-enum'
import type { PortfolioMaskExportScopeCode } from '@/types/enums/portfolio-mask-export-scope-enum'
import type { PortfolioMaskFieldTypeCode } from '@/types/enums/portfolio-mask-field-type-enum'
import type { PortfolioMaskStrategyCode } from '@/types/enums/portfolio-mask-strategy-enum'
import type { PortfolioMaterialStatusCode } from '@/types/enums/portfolio-material-status-enum'
import type { PortfolioMaterialTypeCode } from '@/types/enums/portfolio-material-type-enum'
import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

/** 对齐后端 PortfolioExportBusinessRef */
export interface PortfolioExportBusinessRef {
  teacherId?: string
  academicYear?: string
  semester?: SemesterCode
  departmentId?: string
  planYear?: string
  portfolioOrgId?: string
  teachingGroupId?: string
  completenessLevel?: PortfolioCompletenessLevelCode
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
  majorGroupName?: string
  reportType?: PortfolioAnalysisExportReportTypeCode
  doubleHighTaskId?: string
  /** 院系报告是否纳入双高监测口径 */
  includeDoubleHigh?: boolean
  keyTeacherRegistryType?: PortfolioKeyTeacherRegistryTypeCode
  salaryMonth?: string
  externalDataStatus?: PortfolioExternalTeacherDataStatusCode
  teachSubject?: string
  teacherSource?: string
  externalContractStatus?: PortfolioExternalTeacherContractStatusCode
  developmentRecordType?: PortfolioDevelopmentRecordTypeCode
  categoryCode?: string
  levelCode?: PortfolioHonorLevelCode
  nationalOnly?: boolean
  /** 授予单位（荣誉库筛选） */
  awardUnit?: string
  /** 记录日期起 yyyy-MM-dd */
  recordDateFrom?: string
  /** 记录日期止 yyyy-MM-dd */
  recordDateTo?: string
  /** 发展规划类型：TEACHER / DEPARTMENT */
  developmentPlanType?: PortfolioDevelopmentPlanTypeCode
  evaluationTaskId?: string
  evaluationTaskIds?: string[]
  evaluationWorkgroupId?: string
  objectionStatus?: PortfolioEvaluationObjectionStatusCode
  /** 教师 PK 会话 ID（唯一字段名，禁止再使用已废弃的 pkSessionId） */
  teacherPkSessionId?: string
  maskMode?: boolean
  /** 全国教师上报同步任务 ID */
  syncTaskId?: string
}

export interface PortfolioExportApprovalVO {
  id: string
  applicantUserId: string
  exportType: PortfolioExportTypeCode
  businessRef: PortfolioExportBusinessRef
  exportPurpose: string
  approvalStatus: PortfolioExportApprovalStatusCode
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
  /** edu-user 标的教师姓名 */
  subjectTeacherName?: string
  /** edu-user 标的教师工号 */
  subjectTeacherNumber?: string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  archiveWriteForbidden?: boolean
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  ownerMultiIdentityNote?: string
}

export interface PortfolioMajorGroupPortfolioSectionSummaryVO {
  sectionCode: PortfolioMajorGroupSectionCode
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
  categoryCode?: string
  /** ARCHIVE 分区档案类目业务名（非枚举标签） */
  categoryName?: string
  recordTitle: string
  periodLabel?: string
  /** ARCHIVE 分区档案记录状态 */
  archiveRecordStatus?: PortfolioArchiveRecordStatusCode
  /** TASK 分区双高任务状态 */
  taskStatus?: PortfolioDoubleHighTaskStatusCode
  /** MATERIAL_INDEX 分区材料类型 */
  materialType?: PortfolioMaterialTypeCode
  /** MATERIAL_INDEX 分区材料状态 */
  materialStatus?: PortfolioMaterialStatusCode
  contributionFactor?: number | string
  majorGroupMembershipCount?: number
  contributionNote?: string
  identityType?: PortfolioTeacherIdentityTypeCode
  externalIdentity?: boolean
  identityCompositeScore?: number | string
  workloadHours?: number | string
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
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
  fieldType: PortfolioMaskFieldTypeCode
  exportScope: PortfolioMaskExportScopeCode
  maskStrategy: PortfolioMaskStrategyCode
  enabled: boolean
  consumerSupported: boolean
  consumerDescription: string
  consumerApplied: boolean
  effective: boolean
  lastAppliedTime?: string
  updateTime: string
}

export interface PortfolioAuditLogVO {
  id: string
  operatorUserId: string
  actionType: PortfolioAuditActionTypeCode
  resourceType: PortfolioAuditResourceTypeCode
  resourceId?: string
  actionSummary: string
  detailJson?: string
  createTime: string
}

export const portfolioSecurityApi = {
  applyExport: (data: {
    exportType: PortfolioExportTypeCode
    businessRef: PortfolioExportBusinessRef
    exportPurpose: string
  }) => http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/apply', data),
  approveExport: (data: { id: string, approved: boolean, rejectReason?: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/approve', data),
  pageExport: (data: {
    pageNum: number
    pageSize: number
    id?: string
    approvalStatus?: PortfolioExportApprovalStatusCode
    applicantUserId?: string
  }) =>
    http.post<PageResult<PortfolioExportApprovalVO>>('/api/portfolio/security/export/page', data),
  downloadExport: (data: { id: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/download', data),
  confirmDownloadExport: (data: { id: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/download/confirm', data),
  revokeExport: (data: { id: string, revokeReason: string }) =>
    http.post<PortfolioExportApprovalVO>('/api/portfolio/security/export/revoke', data),
  saveMaskRule: (data: {
    fieldType: PortfolioMaskFieldTypeCode
    exportScope: PortfolioMaskExportScopeCode
    maskStrategy: PortfolioMaskStrategyCode
    enabled?: boolean
    /** 更新既有规则时必传，与列表行 updateTime 一致 */
    expectedUpdateTime?: string
  }) => http.post<PortfolioMaskRuleVO>('/api/portfolio/security/mask-rule/save', data),
  pageMaskRule: (data: {
    pageNum: number
    pageSize: number
    fieldType?: PortfolioMaskFieldTypeCode
    exportScope?: PortfolioMaskExportScopeCode
    enabled?: boolean
  }) => http.post<PageResult<PortfolioMaskRuleVO>>('/api/portfolio/security/mask-rule/page', data),
  pageAudit: (data: {
    pageNum: number
    pageSize: number
    actionType?: PortfolioAuditActionTypeCode
    resourceType?: PortfolioAuditResourceTypeCode
    resourceId?: string
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
    sectionCode: PortfolioMajorGroupSectionCode
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
