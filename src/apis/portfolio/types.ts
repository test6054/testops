import type { SemesterCode } from '@/types/enums/semester-enum'
import type { PortfolioEvaluationTaskStatus } from '@/apis/portfolio/enums'
import type { AiTaskStatus } from '@/apis/quality/types'
/**
 * 教学档案袋 API 共享类型 - 对应 edu-quality 标准包（controller/model 扁平化后）
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { QueryDto } from '@/types'
import type { UserStatusEnum } from '@/types/enums/user-status'

/** 扩展组织类型 - PortfolioOrgUnitTypeEnum */
export type PortfolioOrgUnitType
  = | 'MAJOR_GROUP'
    | 'TEACHING_RESEARCH_OFFICE'
    | 'CAMPUS'

export const PORTFOLIO_ORG_UNIT_TYPE_LABEL: Record<PortfolioOrgUnitType, string> = {
  MAJOR_GROUP: '专业群',
  TEACHING_RESEARCH_OFFICE: '教研室',
  CAMPUS: '校区',
}

export const PORTFOLIO_ORG_UNIT_TYPE_OPTIONS = (Object.keys(PORTFOLIO_ORG_UNIT_TYPE_LABEL) as PortfolioOrgUnitType[])
  .map(value => ({ value, label: PORTFOLIO_ORG_UNIT_TYPE_LABEL[value] }))

/** alias 挂接目标 - PortfolioOrgAliasTargetTypeEnum */
export type PortfolioOrgAliasTargetType
  = | 'EDU_USER_DEPARTMENT'
    | 'EDU_USER_MAJOR'
    | 'PORTFOLIO_ORG_UNIT'

export const PORTFOLIO_ORG_ALIAS_TARGET_TYPE_LABEL: Record<PortfolioOrgAliasTargetType, string> = {
  EDU_USER_DEPARTMENT: '院系',
  EDU_USER_MAJOR: '专业',
  PORTFOLIO_ORG_UNIT: '扩展组织',
}

/** 教师身份类型 - PortfolioTeacherIdentityTypeEnum */
export type PortfolioTeacherIdentityType
  = | 'FULL_TIME'
    | 'PART_TIME'
    | 'DOUBLE_DUTY'
    | 'INDUSTRY_MENTOR'
    | 'ENTERPRISE_PART_TIME'
    | 'SKILL_MASTER'
    | 'CRAFTSMAN'
    | 'OTHER_EXTERNAL'

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL: Record<PortfolioTeacherIdentityType, string> = {
  FULL_TIME: '专任教师',
  PART_TIME: '兼职教师',
  DOUBLE_DUTY: '双肩挑教师',
  INDUSTRY_MENTOR: '产业导师',
  ENTERPRISE_PART_TIME: '企业兼职教师',
  SKILL_MASTER: '技能大师',
  CRAFTSMAN: '大国工匠',
  OTHER_EXTERNAL: '其他外部身份',
}

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS
  = (Object.keys(PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL) as PortfolioTeacherIdentityType[])
    .map(value => ({ value, label: PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL[value] }))

/** 教师身份状态 - PortfolioTeacherIdentityStatusEnum */
export type PortfolioTeacherIdentityStatus = 'ACTIVE' | 'INACTIVE'

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL: Record<PortfolioTeacherIdentityStatus, string> = {
  ACTIVE: '有效',
  INACTIVE: '停用',
}

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS
  = (Object.keys(PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL) as PortfolioTeacherIdentityStatus[])
    .map(value => ({ value, label: PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL[value] }))

/** edu-user 组织主数据树节点 - PortfolioOrgTreeNodeTypeConstants */
export type PortfolioEduUserOrgTreeNodeType
  = | 'SCHOOL'
    | 'DEPARTMENT'
    | 'MAJOR'
    | 'CLASS'

export const PORTFOLIO_EDU_USER_ORG_TREE_NODE_TYPE_LABEL: Record<PortfolioEduUserOrgTreeNodeType, string> = {
  SCHOOL: '学校',
  DEPARTMENT: '院系',
  MAJOR: '专业',
  CLASS: '班级',
}

/** 合并组织树节点类型 = edu-user 主数据 + PortfolioOrgUnitTypeEnum */
export type PortfolioOrgTreeNodeType = PortfolioEduUserOrgTreeNodeType | PortfolioOrgUnitType

export const PORTFOLIO_ORG_TREE_NODE_TYPE_LABEL: Record<PortfolioOrgTreeNodeType, string> = {
  ...PORTFOLIO_EDU_USER_ORG_TREE_NODE_TYPE_LABEL,
  ...PORTFOLIO_ORG_UNIT_TYPE_LABEL,
}

/** 扩展组织 nodeType 列表，真源与 PortfolioOrgUnitType 一致 */
export const PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES: PortfolioOrgUnitType[]
  = Object.keys(PORTFOLIO_ORG_UNIT_TYPE_LABEL) as PortfolioOrgUnitType[]

export interface PortfolioOrgAliasVO {
  id: string
  aliasName: string
  effectiveFrom?: string
  effectiveTo?: string
  remark?: string
}

export interface PortfolioOrgTreeNodeVO {
  id: string
  nodeType: string
  parentId?: string
  parentNodeType?: string
  name: string
  code?: string
  anchorDepartmentId?: string
  anchorMajorId?: string
  portfolioOrgId?: string
  leaderUserId?: string
  leaderUserName?: string
  leaderTeacherNo?: string
  aliases?: PortfolioOrgAliasVO[]
  children?: PortfolioOrgTreeNodeVO[]
}

export interface PortfolioOrgTreeRequest {
  includeClasses?: boolean
  rootDepartmentId?: string
}

export interface PortfolioOrgUnitSaveRequest {
  id?: string
  orgType: PortfolioOrgUnitType
  orgCode?: string
  orgName: string
  parentPortfolioOrgId?: string
  anchorDepartmentId?: string
  anchorMajorId?: string
  sortOrder?: number
  status?: string
  leaderUserId?: string
}

export interface PortfolioOrgAliasSaveRequest {
  id?: string
  targetType: PortfolioOrgAliasTargetType
  targetId: string
  aliasName: string
  effectiveFrom?: string
  effectiveTo?: string
  remark?: string
}

export interface PortfolioOrgSyncInvalidUnitVO {
  id: string
  orgName: string
  orgCode?: string
}

export interface PortfolioOrgSyncResultVO {
  syncedTime: string
  departmentCount: number
  majorCount: number
  classCount: number
  invalidPortfolioOrgUnitIds: string[]
  invalidPortfolioOrgUnits: PortfolioOrgSyncInvalidUnitVO[]
}

export interface PortfolioOrgSyncLogVO {
  id: string
  syncedTime: string
  departmentCount: number
  majorCount: number
  classCount: number
  invalidUnitCount: number
}

export interface PortfolioTeacherPageRequest extends QueryDto {
  departmentId?: string
  portfolioOrgId?: string
  title?: string
  identityType?: PortfolioTeacherIdentityType
  searchText?: string
  status?: UserStatusEnum
}

export interface PortfolioTeacherSummaryVO {
  userId: string
  userName?: string
  nickName?: string
  teacherNumber?: string
  departmentId?: string
  departmentName?: string
  title?: string
  status?: string
  primaryIdentityType?: PortfolioTeacherIdentityType
  identityTags?: string[]
}

export interface PortfolioTeacherIdentityVO {
  id: string
  teacherUserId?: string
  identityType: PortfolioTeacherIdentityType
  identityStatus: PortfolioTeacherIdentityStatus
  appointmentNo?: string
  displayName?: string
  enterpriseName?: string
  anchorDepartmentId?: string
  anchorPortfolioOrgId?: string
  titleAtIdentity?: string
  validFrom?: string
  validTo?: string
}

export interface PortfolioTeacherDetailVO {
  userId: string
  userName?: string
  nickName?: string
  teacherNumber?: string
  email?: string
  mobile?: string
  departmentId?: string
  departmentName?: string
  /** 专业 ID（后端由学术档案 majorId 归并，档案袋 AI 提交 programId 同源） */
  programId?: string
  title?: string
  schoolId?: string
  schoolName?: string
  status?: string
  createTime?: string
  identities: PortfolioTeacherIdentityVO[]
}

export interface PortfolioTeacherIdentitySaveRequest {
  id?: string
  teacherUserId?: string
  identityType: PortfolioTeacherIdentityType
  identityStatus: PortfolioTeacherIdentityStatus
  appointmentNo?: string
  displayName?: string
  enterpriseName?: string
  anchorDepartmentId?: string
  anchorPortfolioOrgId?: string
  titleAtIdentity?: string
  validFrom?: string
  validTo?: string
}

/** 档案分类适用范围 */
export type PortfolioArchiveCategoryScope = 'SCHOOL' | 'DEPARTMENT'

export const PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_LABEL: Record<PortfolioArchiveCategoryScope, string> = {
  SCHOOL: '全校',
  DEPARTMENT: '院系',
}

/** 档案分类状态 */
export type PortfolioArchiveCategoryStatus = 'ACTIVE' | 'INACTIVE'

export const PORTFOLIO_ARCHIVE_CATEGORY_STATUS_LABEL: Record<PortfolioArchiveCategoryStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
}

/** 模板版本状态 */
export type PortfolioArchiveTemplateVersionStatus = 'DRAFT' | 'TRIAL' | 'PUBLISHED' | 'DEPRECATED'

export const PORTFOLIO_ARCHIVE_TEMPLATE_VERSION_STATUS_LABEL: Record<PortfolioArchiveTemplateVersionStatus, string> = {
  DRAFT: '草稿',
  TRIAL: '试算中',
  PUBLISHED: '已发布',
  DEPRECATED: '已停用',
}

export type PortfolioArchiveFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'ENUM' | 'SEMESTER'

export const PORTFOLIO_ARCHIVE_FIELD_TYPE_LABEL: Record<PortfolioArchiveFieldType, string> = {
  TEXT: '文本',
  NUMBER: '数值',
  DATE: '日期',
  ENUM: '枚举',
  SEMESTER: '学期',
}

export const PORTFOLIO_ARCHIVE_FIELD_TYPE_OPTIONS = (Object.keys(PORTFOLIO_ARCHIVE_FIELD_TYPE_LABEL) as PortfolioArchiveFieldType[])
  .map(value => ({ value, label: PORTFOLIO_ARCHIVE_FIELD_TYPE_LABEL[value] }))

export type PortfolioArchiveFieldSourceType = 'S1' | 'S2' | 'MANUAL'

export const PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_LABEL: Record<PortfolioArchiveFieldSourceType, string> = {
  S1: '权威源 S1',
  S2: '权威源 S2',
  MANUAL: '手工填报',
}

export const PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_OPTIONS = (Object.keys(PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_LABEL) as PortfolioArchiveFieldSourceType[])
  .map(value => ({ value, label: PORTFOLIO_ARCHIVE_FIELD_SOURCE_TYPE_LABEL[value] }))

export const PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_OPTIONS = (Object.keys(PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_LABEL) as PortfolioArchiveCategoryScope[])
  .map(value => ({ value, label: PORTFOLIO_ARCHIVE_CATEGORY_SCOPE_LABEL[value] }))

export const PORTFOLIO_ARCHIVE_CATEGORY_STATUS_OPTIONS = (Object.keys(PORTFOLIO_ARCHIVE_CATEGORY_STATUS_LABEL) as PortfolioArchiveCategoryStatus[])
  .map(value => ({ value, label: PORTFOLIO_ARCHIVE_CATEGORY_STATUS_LABEL[value] }))

export interface PortfolioArchiveTemplateDiffSummary {
  added: string[]
  removed: string[]
  changed: string[]
}

export interface PortfolioArchiveTemplateSeedResultVO {
  createdCategoryCodes: string[]
  skippedCategoryCodes: string[]
}

export interface PortfolioTargetFieldDefinition {
  fieldDefId?: string
  fieldCode: string
  fieldLabel: string
  fieldType?: PortfolioArchiveFieldType
  readonly?: boolean
  required?: boolean
}

export interface PortfolioArchiveAuditFlowBindRequest {
  categoryId: string
  auditFlowCode: string
}

export interface PortfolioArchiveAuditFlowBindingVO {
  categoryId: string
  auditFlowCode: string
}

export interface PortfolioAiAskRequest {
  teacherId: string
  fileNodeId: string
  userQuestion: string
  materialId: string
  materialType: PortfolioMaterialType
  programId?: string
}

export interface PortfolioAiPolicyCheckRequest {
  teacherId: string
  policyClauseText: string
  materialType: PortfolioMaterialType
  fileNodeId?: string
  /** 带 fileNodeId 的政策核验须传已登记材料 materialId */
  materialId?: string
  templateCode?: string
  categoryId?: string
  programId?: string
  teacherProfileSummary?: string
}

/** 驾驶舱指标问数 - PortfolioAiCockpitAskRequest */
export interface PortfolioAiCockpitAskRequest {
  departmentId?: string
  userQuestion: string
}

/** 教学档案袋 AI 分析类型 - PortfolioAiAnalysisTypeEnum */
export type PortfolioAiAnalysisType = 'POLICY_MATCH' | 'MATERIAL_QA' | 'COCKPIT_ASK' | 'REPORT_GENERATE'

export const PORTFOLIO_AI_ANALYSIS_TYPE_LABEL: Record<PortfolioAiAnalysisType, string> = {
  POLICY_MATCH: '政策条款匹配',
  MATERIAL_QA: '材料智能问数',
  COCKPIT_ASK: '驾驶舱指标问数',
  REPORT_GENERATE: '报告初稿生成',
}

/** AI 分析审核状态 - PortfolioAiAnalysisReviewStatusEnum */
export type PortfolioAiAnalysisReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export const PORTFOLIO_AI_ANALYSIS_REVIEW_STATUS_LABEL: Record<PortfolioAiAnalysisReviewStatus, string> = {
  PENDING_REVIEW: '待复核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

/** AI 分析问题条目 - PortfolioAiAnalysisIssueVO */
export interface PortfolioAiAnalysisIssueItem {
  issueTitle: string
  issueDescription?: string
  severity?: string
}

/** AI 分析证据条目 - PortfolioAiAnalysisEvidenceVO */
export interface PortfolioAiAnalysisEvidenceItem {
  evidenceTitle: string
  evidenceSource?: string
  evidenceContent: string
}

/** AI 分析建议条目 - PortfolioAiAnalysisSuggestionVO */
export interface PortfolioAiAnalysisSuggestionItem {
  suggestionTitle: string
  suggestionContent: string
  priority?: string
}

/** 政策匹配结论 - PortfolioPolicyMatchConclusionEnum */
export type PortfolioPolicyMatchConclusion = 'MATCHED' | 'PARTIAL' | 'NOT_MATCHED' | 'INSUFFICIENT_EVIDENCE'

export const PORTFOLIO_POLICY_MATCH_CONCLUSION_LABEL: Record<PortfolioPolicyMatchConclusion, string> = {
  MATCHED: '已匹配',
  PARTIAL: '部分匹配',
  NOT_MATCHED: '不匹配',
  INSUFFICIENT_EVIDENCE: '证据不足',
}

export const PORTFOLIO_POLICY_MATCH_CONCLUSION_TONE: Record<PortfolioPolicyMatchConclusion, BadgeTone> = {
  MATCHED: 'green',
  PARTIAL: 'blue',
  NOT_MATCHED: 'orange',
  INSUFFICIENT_EVIDENCE: 'gray',
}

/** 驾驶舱 KPI 汇总 - PortfolioCockpitSummaryVO */
export interface PortfolioCockpitSummaryVO {
  departmentId?: string
  departmentName?: string
  teacherCount?: number
  dualTeacherCount?: number
  keyTeacherCount?: number
  achievementTotalCount?: number
  honorTotalCount?: number
  tenantEnabledIndicatorCount?: number
}

/** 驾驶舱问数教师行 - PortfolioCockpitAskTeacherRow */
export interface PortfolioCockpitAskTeacherRow {
  teacherUserId?: string
  teacherNumber?: string
  nickName?: string
  departmentName?: string
  metricValue?: string
  metricCode?: string
}

/** 驾驶舱问数结构化结果 - PortfolioCockpitAskResultPayload */
export interface PortfolioCockpitAskResultPayload {
  queryPlan?: {
    planType?: string
    indicatorCode?: string
    operator?: string
    threshold?: number
    refusalReason?: string
    narrativeSummary?: string
  }
  teacherRows?: PortfolioCockpitAskTeacherRow[]
  indicatorRefs?: string[]
  drillLinks?: string[]
}

export interface PortfolioArchiveCategoryListRequest {
  scope?: PortfolioArchiveCategoryScope
}

export interface PortfolioArchiveCategoryDeleteRequest {
  categoryId: string
}

export interface PortfolioArchiveCategoryTreeNodeVO {
  id: string
  categoryCode: string
  categoryName: string
  parentId?: string
  scope: PortfolioArchiveCategoryScope
  sortOrder?: number
  status: PortfolioArchiveCategoryStatus
  draftVersionId?: string
  publishedVersionId?: string
  children?: PortfolioArchiveCategoryTreeNodeVO[]
}

export interface PortfolioArchiveCategorySaveRequest {
  id?: string
  categoryCode: string
  categoryName: string
  parentId?: string
  scope?: PortfolioArchiveCategoryScope
  sortOrder?: number
  status?: PortfolioArchiveCategoryStatus
}

export interface PortfolioArchiveFieldDefVO {
  id: string
  templateVersionId: string
  fieldCode: string
  fieldLabel: string
  fieldType: PortfolioArchiveFieldType
  required?: boolean
  readonly?: boolean
  enumRef?: string
  sourceType: PortfolioArchiveFieldSourceType
  sortOrder?: number
}

export interface PortfolioArchiveFieldDefSaveRequest {
  id?: string
  templateVersionId: string
  fieldCode: string
  fieldLabel: string
  fieldType?: PortfolioArchiveFieldType
  required?: boolean
  readonly?: boolean
  enumRef?: string
  sourceType?: PortfolioArchiveFieldSourceType
  sortOrder?: number
}

export interface PortfolioArchiveFieldListRequest {
  templateVersionId: string
}

export interface PortfolioArchiveVersionActionRequest {
  categoryId: string
  changeSummary?: string
}

export interface PortfolioArchiveVersionMutationRequest {
  categoryId: string
  templateVersionId: string
  changeSummary?: string
}

export interface PortfolioArchiveFieldDeleteRequest {
  fieldId: string
  templateVersionId: string
}

export interface PortfolioArchiveTemplateVersionVO {
  id: string
  categoryId: string
  templateCode: string
  versionNo: string
  status: PortfolioArchiveTemplateVersionStatus
  publishedTime?: string
  changeSummary?: string
}

export interface PortfolioArchiveTemplateChangeLogVO {
  id: string
  categoryId: string
  fromVersionId?: string
  toVersionId: string
  diffSummaryJson?: string
  createTime?: string
}

export interface PortfolioArchivePublishedFieldsRequest {
  categoryId?: string
  templateCode?: string
}

export interface PortfolioPublishedTemplateSnapshot {
  categoryId: string
  templateCode: string
  templateVersionId: string
  versionNo: string
  targetFields: PortfolioTargetFieldDefinition[]
}

/** 档案袋 AI 任务类型 - 对齐 AiTaskTypeEnum 档案袋材料类 */
export type PortfolioAiTaskType
  = | 'PORTFOLIO_CERTIFICATE_OCR'
    | 'PORTFOLIO_DOCUMENT_PARSE'
    | 'PORTFOLIO_POLICY_MATCH'
    | 'PORTFOLIO_MATERIAL_QA'
    | 'PORTFOLIO_COCKPIT_ASK'
    | 'PORTFOLIO_REPORT_GENERATE'
    | 'PORTFOLIO_TEACHER_RECOMMEND_EXPLAIN'

export const PORTFOLIO_AI_TASK_TYPE_LABEL: Record<PortfolioAiTaskType, string> = {
  PORTFOLIO_CERTIFICATE_OCR: '证书证明 OCR 抽取',
  PORTFOLIO_DOCUMENT_PARSE: '文档结构化抽取',
  PORTFOLIO_POLICY_MATCH: '政策条款匹配',
  PORTFOLIO_MATERIAL_QA: '材料智能问数',
  PORTFOLIO_COCKPIT_ASK: '驾驶舱指标问数',
  PORTFOLIO_REPORT_GENERATE: '报告初稿生成',
  PORTFOLIO_TEACHER_RECOMMEND_EXPLAIN: '优秀教师推荐 AI 解释',
}

/** 候选确认链可提交的任务类型 */
export type PortfolioAiExtractTaskType = 'PORTFOLIO_CERTIFICATE_OCR' | 'PORTFOLIO_DOCUMENT_PARSE'

export const PORTFOLIO_AI_EXTRACT_TASK_TYPE_OPTIONS = (
  ['PORTFOLIO_CERTIFICATE_OCR', 'PORTFOLIO_DOCUMENT_PARSE'] as PortfolioAiExtractTaskType[]
).map(value => ({ value, label: PORTFOLIO_AI_TASK_TYPE_LABEL[value] }))

/** 档案袋材料类型 - PortfolioMaterialTypeEnum */
export type PortfolioMaterialType = 'CERTIFICATE' | 'DOCUMENT' | 'POLICY' | 'REPORT'

export const PORTFOLIO_MATERIAL_TYPE_LABEL: Record<PortfolioMaterialType, string> = {
  CERTIFICATE: '证书证明',
  DOCUMENT: '通用文档',
  POLICY: '政策材料',
  REPORT: '报告材料',
}

/** 档案袋 AI 候选字段确认状态 */
export type PortfolioCandidateConfirmStatus
  = | 'PENDING_CONFIRM'
    | 'CONFIRMED'
    | 'REJECTED'
    | 'NEEDS_MANUAL_FILL'

export const PORTFOLIO_CANDIDATE_CONFIRM_STATUS_LABEL: Record<PortfolioCandidateConfirmStatus, string> = {
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
  NEEDS_MANUAL_FILL: '需人工补全',
}

export const PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE: Record<PortfolioCandidateConfirmStatus, BadgeTone> = {
  PENDING_CONFIRM: 'blue',
  CONFIRMED: 'green',
  REJECTED: 'red',
  NEEDS_MANUAL_FILL: 'orange',
}

/** 系统预置档案分类编码（与后端种子一致） */
export const PORTFOLIO_TEMPLATE_CODE_CERTIFICATE = 'CERTIFICATE'
export const PORTFOLIO_TEMPLATE_CODE_DOCUMENT = 'DOCUMENT'

/** 系统预置默认审核流编码 */
export const PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE = 'PORTFOLIO_DEFAULT_REVIEW'

/** 学校复审审核流编码（敏感材料） */
export const PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE = 'PORTFOLIO_SCHOOL_REVIEW'

/** 档案袋 AI 任务提交 - 含报告生成；OCR/文档抽取须先登记材料库并传 materialId */
export interface PortfolioAiJobSubmitRequest {
  taskType: PortfolioAiTaskType
  teacherId: string
  materialId?: string
  fileNodeId?: string
  materialType: PortfolioMaterialType
  templateCode?: string
  categoryId?: string
  programId?: string
  context?: PortfolioAiJobContext
}

/** 报告生成任务上下文 */
export interface PortfolioAiJobContext {
  reportScene?: string
  reportPeriodLabel?: string
  teacherName?: string
  teacherProfileSummary?: string
}

/** 文本分析报告场景 */
export type PortfolioReportScene = 'PORTRAIT' | 'DEVELOPMENT_PLAN' | 'EVALUATION' | 'ANNUAL_SUMMARY'

export const PORTFOLIO_REPORT_SCENE_LABEL: Record<PortfolioReportScene, string> = {
  PORTRAIT: '教师画像分析',
  DEVELOPMENT_PLAN: '年度规划分析',
  EVALUATION: '多元评价分析',
  ANNUAL_SUMMARY: '年度综合报告',
}

export const PORTFOLIO_REPORT_SCENE_OPTIONS = (Object.keys(PORTFOLIO_REPORT_SCENE_LABEL) as PortfolioReportScene[])
  .map(value => ({ value, label: PORTFOLIO_REPORT_SCENE_LABEL[value] }))

export interface PortfolioAiJobSubmitVO {
  taskId: string
  portfolioAiJobId?: string
  status: AiTaskStatus
}

/** 档案袋材料 AI 任务列表项 - 对齐后端 AiTaskVO 在 portfolio 页使用的字段 */
export interface PortfolioAiJobTaskVO {
  id: string
  taskType: PortfolioAiTaskType
  status: AiTaskStatus
  createTime?: string
}

export interface PortfolioAiJobPageRequest extends QueryDto {
  teacherId?: string
  taskType?: PortfolioAiTaskType
  status?: AiTaskStatus
  /** 仅候选确认链（OCR / 文档抽取） */
  candidateExtractOnly?: boolean
}

export interface PortfolioCandidateFieldVO {
  id: string
  aiTaskId: string
  aiJobId: string
  teacherId: string
  fileNodeId?: string
  fieldCode: string
  fieldLabel: string
  candidateValue: string
  evidenceRef: string
  confirmStatus: PortfolioCandidateConfirmStatus
  manualFillRequired?: boolean
}

export interface PortfolioCandidateConfirmRequest {
  candidateFieldId: string
  aiTaskId: string
  confirmStatus: 'CONFIRMED' | 'REJECTED'
  correctedCandidateValue?: string
}

/** 审核任务状态 - PortfolioReviewTaskStatusEnum */
export type PortfolioReviewTaskStatus = 'PENDING' | 'SECOND_REVIEW' | 'APPROVED' | 'RETURNED' | 'DISMISSED' | 'CLOSED'

export const PORTFOLIO_REVIEW_TASK_STATUS_LABEL: Record<PortfolioReviewTaskStatus, string> = {
  PENDING: '待审',
  SECOND_REVIEW: '转复审',
  APPROVED: '通过',
  RETURNED: '退回',
  DISMISSED: '驳回',
  CLOSED: '已关闭',
}

export const PORTFOLIO_REVIEW_TASK_STATUS_TONE: Record<PortfolioReviewTaskStatus, BadgeTone> = {
  PENDING: 'blue',
  SECOND_REVIEW: 'purple',
  APPROVED: 'green',
  RETURNED: 'orange',
  DISMISSED: 'red',
  CLOSED: 'gray',
}

/** 材料风险等级 - PortfolioMaterialRiskLevelEnum */
export type PortfolioMaterialRiskLevel = 'LOW' | 'SENSITIVE'

export const PORTFOLIO_MATERIAL_RISK_LEVEL_LABEL: Record<PortfolioMaterialRiskLevel, string> = {
  LOW: '低风险',
  SENSITIVE: '敏感',
}

export const PORTFOLIO_MATERIAL_RISK_LEVEL_TONE: Record<PortfolioMaterialRiskLevel, BadgeTone> = {
  LOW: 'green',
  SENSITIVE: 'red',
}

/** 档案记录状态 - PortfolioArchiveRecordStatusEnum */
export type PortfolioArchiveRecordStatus
  = | 'DRAFT'
    | 'PENDING_CONFIRM'
    | 'PENDING_REVIEW'
    | 'OFFICIAL'
    | 'RETURNED'
    | 'VOID'

export const PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL: Record<PortfolioArchiveRecordStatus, string> = {
  DRAFT: '草稿',
  PENDING_CONFIRM: '待确认',
  PENDING_REVIEW: '待审核',
  OFFICIAL: '正式',
  RETURNED: '退回',
  VOID: '作废',
}

export const PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE: Record<PortfolioArchiveRecordStatus, BadgeTone> = {
  DRAFT: 'gray',
  PENDING_CONFIRM: 'blue',
  PENDING_REVIEW: 'blue',
  OFFICIAL: 'green',
  RETURNED: 'orange',
  VOID: 'gray',
}

/** 档案来源 - PortfolioArchiveRecordSourceTypeEnum */
export type PortfolioArchiveRecordSourceType = 'AI_EXTRACT' | 'MANUAL' | 'IMPORT' | 'SYNC'

export const PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL: Record<PortfolioArchiveRecordSourceType, string> = {
  AI_EXTRACT: 'AI 抽取',
  MANUAL: '手工填报',
  IMPORT: '批量导入',
  SYNC: '外部同步',
}

/** 审核操作类型 - PortfolioReviewActionTypeEnum */
export type PortfolioReviewActionType = 'APPROVE' | 'BATCH_APPROVE' | 'RETURN' | 'DISMISS' | 'ESCALATE'

export const PORTFOLIO_REVIEW_ACTION_TYPE_LABEL: Record<PortfolioReviewActionType, string> = {
  APPROVE: '通过',
  BATCH_APPROVE: '批量通过',
  RETURN: '退回',
  DISMISS: '驳回',
  ESCALATE: '转复审',
}

/** AI 初审分析摘要 - PortfolioAiAnalysisSummaryVO */
export interface PortfolioAiAnalysisSummaryVO {
  id: string
  aiTaskId: string
  aiJobId?: string
  teacherId?: string
  fileNodeId?: string
  analysisType: PortfolioAiAnalysisType
  resultTitle: string
  summary: string
  conclusionCode?: string
  reportScene?: string
  reportPeriodLabel?: string
  reviewStatus: PortfolioAiAnalysisReviewStatus
  taskStatus?: AiTaskStatus
  taskFailurePhase?: string
  taskFailureReason?: string
  modelName?: string
  promptTokenCount?: number
  completionTokenCount?: number
  generatedTime?: string
  createTime?: string
}

/** AI 初审分析详情 - PortfolioAiAnalysisDetailVO */
export interface PortfolioAiAnalysisDetailVO extends PortfolioAiAnalysisSummaryVO {
  policyClauseDigest?: string
  draftMarkdown?: string
  issueItems: PortfolioAiAnalysisIssueItem[]
  evidenceItems: PortfolioAiAnalysisEvidenceItem[]
  suggestionItems: PortfolioAiAnalysisSuggestionItem[]
}

/** 教学档案袋 AI 分析结果分页 - PortfolioAiAnalysisPageRequest */
export interface PortfolioAiAnalysisPageRequest extends QueryDto {
  teacherId?: string
  analysisType?: PortfolioAiAnalysisType
  reviewStatus?: PortfolioAiAnalysisReviewStatus
  taskStatus?: AiTaskStatus
  searchText?: string
  /** 驾驶舱问数院系 scope；仅 COCKPIT_ASK 时生效 */
  departmentId?: string
}

export interface PortfolioReviewTaskPageRequest extends QueryDto {
  reviewStatus?: PortfolioReviewTaskStatus
  teacherId?: string
  categoryId?: string
  departmentId?: string
  auditFlowCode?: string
}

export interface PortfolioReviewTaskSummaryVO {
  id: string
  archiveRecordId: string
  teacherId: string
  teacherName?: string
  teacherNumber?: string
  departmentName?: string
  categoryId: string
  categoryName?: string
  reviewStatus: PortfolioReviewTaskStatus
  recordStatus?: PortfolioArchiveRecordStatus
  sourceType?: PortfolioArchiveRecordSourceType
  auditFlowCode?: string
  batchApproveAllowed?: boolean
  aiPreReviewSummary?: string
  riskLevel?: PortfolioMaterialRiskLevel
  referenceAiTaskId?: string
  singleReviewRequired?: boolean
  escalateAllowed?: boolean
  reviewActionAllowed?: boolean
  createTime?: string
}

export interface PortfolioReviewTaskEscalateRequest {
  reviewTaskId: string
  reason: string
}

export interface PortfolioReviewTaskApproveRequest {
  reviewTaskId: string
  opinion?: string
}

export interface PortfolioReviewTaskRejectRequest {
  reviewTaskId: string
  reason: string
  returnDeadline: string
}

export interface PortfolioReviewTaskDismissRequest {
  reviewTaskId: string
  reason: string
}

export interface PortfolioReviewTaskBatchApproveRequest {
  reviewTaskIds: string[]
  opinion?: string
}

export interface PortfolioReviewTaskBatchRejectRequest {
  reviewTaskIds: string[]
  reason: string
  returnDeadline: string
}

export interface PortfolioReviewLogVO {
  id: string
  reviewTaskId: string
  archiveRecordId: string
  actionType: PortfolioReviewActionType
  opinion?: string
  returnDeadline?: string
  reviewerId: string
  createTime?: string
}

export interface PortfolioRecordFieldCore {
  fieldCode: string
  fieldLabel?: string
  fieldValue: string
  evidenceRef?: string
}

export interface PortfolioReviewArchiveRecordDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatus
  sourceType: PortfolioArchiveRecordSourceType
  aiTaskId?: string
  fields: PortfolioRecordFieldCore[]
}

/** 档案完整度分级 - PortfolioCompletenessLevelEnum */
export type PortfolioCompletenessLevel = 'COMPLETE' | 'BASIC' | 'PENDING' | 'SEVERE'

export const PORTFOLIO_COMPLETENESS_LEVEL_LABEL: Record<PortfolioCompletenessLevel, string> = {
  COMPLETE: '完整',
  BASIC: '基本完整',
  PENDING: '待补充',
  SEVERE: '严重缺失',
}

export const PORTFOLIO_COMPLETENESS_LEVEL_TONE: Record<PortfolioCompletenessLevel, BadgeTone> = {
  COMPLETE: 'green',
  BASIC: 'blue',
  PENDING: 'orange',
  SEVERE: 'red',
}

export interface PortfolioTeacherCompletenessGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherWorkbenchSummaryVO {
  teacherUserId: string
  pendingTodoCount: number
  currentAcademicYear?: string
  completenessPercent: number
  completenessLevel?: PortfolioCompletenessLevel
  requiredCategoryTotal?: number
  requiredCategoryDone?: number
  compositeScore: number
  pendingReviewCount?: number
  returnedCount?: number
  openGapCount?: number
}

/** 材料采集阶段 - PortfolioMaterialIntakeStageEnum */
export type PortfolioMaterialIntakeStage
  = | 'EMPTY'
    | 'UPLOADED'
    | 'OCR_PENDING'
    | 'AI_PROCESSING'
    | 'CATEGORY_PENDING'
    | 'FIELDS_INCOMPLETE'
    | 'READY_TO_SUBMIT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'RETURNED'

export const PORTFOLIO_MATERIAL_INTAKE_STAGE_LABEL: Record<PortfolioMaterialIntakeStage, string> = {
  EMPTY: '待上传',
  UPLOADED: '已上传',
  OCR_PENDING: 'OCR 处理中',
  AI_PROCESSING: 'AI 抽取中',
  CATEGORY_PENDING: '待确认分类',
  FIELDS_INCOMPLETE: '字段待补全',
  READY_TO_SUBMIT: '可提交审核',
  SUBMITTED: '已提交',
  UNDER_REVIEW: '审核中',
  RETURNED: '已退回',
}

export const PORTFOLIO_MATERIAL_INTAKE_STAGE_TONE: Record<PortfolioMaterialIntakeStage, BadgeTone> = {
  EMPTY: 'gray',
  UPLOADED: 'blue',
  OCR_PENDING: 'blue',
  AI_PROCESSING: 'blue',
  CATEGORY_PENDING: 'orange',
  FIELDS_INCOMPLETE: 'orange',
  READY_TO_SUBMIT: 'green',
  SUBMITTED: 'green',
  UNDER_REVIEW: 'blue',
  RETURNED: 'orange',
}

export interface PortfolioTeacherOnboardingStateVO {
  teacherId: string
  currentStep: number
  completed: boolean
  dismissedUntil?: string
  templateReady?: boolean
}

export interface PortfolioOnboardingFieldSpecSummaryVO {
  categoryId: string
  categoryName: string
  fieldLabels: string[]
}

export interface PortfolioTeacherOnboardingReviewContentVO {
  categoryTree: PortfolioArchiveCategoryTreeNodeVO[]
  fieldSpecSummaries: PortfolioOnboardingFieldSpecSummaryVO[]
}

export interface PortfolioArchiveTeacherReadinessVO {
  templatePublished: boolean
  categoryCount: number
  blockingReason?: string
  adminContactHint?: string
}

export interface PortfolioMaterialIntakeValidationDiagnosticVO {
  code?: string
  fieldCode: string
  fieldLabel?: string
  message: string
}

export interface PortfolioMaterialIntakeStatusVO {
  intakeSessionId: string
  materialId: string
  teacherId?: string
  materialTitle?: string
  fileNodeId?: string
  archiveRecordId?: string
  aiTaskId?: string
  stage: PortfolioMaterialIntakeStage
  categoryId?: string
  categoryName?: string
  ocrStatus?: string
  aiTaskStatus?: AiTaskStatus
  pendingCandidateCount?: number
  missingFieldCount?: number
  diagnostics?: PortfolioMaterialIntakeValidationDiagnosticVO[]
  demoMode?: boolean
  recordStatus?: PortfolioArchiveRecordStatus
  latestRejectReason?: string
  fieldValues?: PortfolioRecordFieldCore[]
  targetFields?: PortfolioTargetFieldDefinition[]
}

export interface PortfolioMaterialIntakeStartResultVO {
  intakeSessionId: string
  materialId: string
  aiTaskId?: string
}

export interface PortfolioTeacherProgressPeriodRowVO {
  academicYear: string
  completenessPercent: number
  pendingReviewCount?: number
  returnedCount?: number
  openGapCount?: number
  topGapCategoryNames: string[]
}

export interface PortfolioTeacherProgressCockpitVO {
  teacherId: string
  currentAcademicYear: string
  completenessPercent: number
  pendingReviewCount: number
  returnedCount: number
  openGapCount: number
  completenessDeltaVsPreviousYear?: number
  periodRows: PortfolioTeacherProgressPeriodRowVO[]
}

export interface PortfolioTeacherReviewStatusPageRequest extends QueryDto {
  teacherId?: string
  academicYear?: string
  recordStatus?: PortfolioArchiveRecordStatus
}

export interface PortfolioTeacherReviewStatusRowVO {
  archiveRecordId: string
  categoryId: string
  categoryName: string
  recordStatus: PortfolioArchiveRecordStatus
  academicYear?: string
  reviewTaskId?: string
  reviewTaskStatus?: PortfolioReviewTaskStatus
  updateTime?: string
  latestRejectReason?: string
}

export interface PortfolioMaterialReassignCategoryResultVO {
  archiveRecordId: string
  reusedFieldCount: number
  clearedFieldCount: number
  stageAfterReassign: PortfolioMaterialIntakeStage
}

export interface PortfolioTeacherCompletenessVO {
  teacherId: string
  completenessPercent: number
  completenessLevel: PortfolioCompletenessLevel
  requiredCategoryTotal: number
  requiredCategoryDone: number
  computedTime?: string
}

export interface PortfolioTeacherPortraitGetRequest {
  teacherId?: string
}

/** 一核心四能力维度 - PortfolioPortraitDimensionEnum */
export type PortfolioPortraitDimension
  = | 'DEVELOPMENT_CORE'
    | 'TEACHING'
    | 'RESEARCH'
    | 'TRAINING'
    | 'PRACTICE'

export const PORTFOLIO_PORTRAIT_DIMENSION_LABEL: Record<PortfolioPortraitDimension, string> = {
  DEVELOPMENT_CORE: '职业发展核心',
  TEACHING: '教学能力',
  RESEARCH: '科研教研',
  TRAINING: '培训发展',
  PRACTICE: '企业实践',
}

/** 画像维度就绪状态 - PortfolioPortraitDimensionReadinessEnum */
export type PortfolioPortraitDimensionReadiness = 'READY' | 'PENDING'

export const PORTFOLIO_PORTRAIT_DIMENSION_READINESS_LABEL: Record<PortfolioPortraitDimensionReadiness, string> = {
  READY: '已就绪',
  PENDING: '待补充',
}

export const PORTFOLIO_PORTRAIT_DIMENSION_READINESS_TONE: Record<PortfolioPortraitDimensionReadiness, BadgeTone> = {
  READY: 'green',
  PENDING: 'orange',
}

export interface PortfolioTeacherPortraitDimensionVO {
  dimensionCode: PortfolioPortraitDimension
  dimensionLabel: string
  score: number
  weightPercent: number
  dataSource: string
  readiness: PortfolioPortraitDimensionReadiness
}

export interface PortfolioTeacherPortraitVO {
  teacherId: string
  compositeScore: number
  developmentCoreScore: number
  teachingScore: number
  researchScore: number
  trainingScore: number
  practiceScore: number
  officialRecordCount: number
  lastArchiveRecordId?: string
  computedTime?: string
  dimensions: PortfolioTeacherPortraitDimensionVO[]
}

export interface PortfolioTeacherPortraitTrendGetRequest extends PortfolioTeacherPortraitGetRequest {
  /** 返回最近快照条数，默认 12，范围 1–36 */
  limit?: number
}

export interface PortfolioTeacherPortraitTrendPointVO {
  computedTime: string
  compositeScore: number
  developmentCoreScore: number
  teachingScore: number
  researchScore: number
  trainingScore: number
  practiceScore: number
}

export interface PortfolioTeacherPortraitTrendVO {
  teacherId: string
  points: PortfolioTeacherPortraitTrendPointVO[]
}

/** 同群体对比展示模式 - PortfolioPortraitCohortDisplayModeEnum */
export type PortfolioPortraitCohortDisplayMode = 'INSUFFICIENT' | 'LIMITED' | 'FULL'

export const PORTFOLIO_PORTRAIT_COHORT_DISPLAY_MODE_LABEL: Record<PortfolioPortraitCohortDisplayMode, string> = {
  INSUFFICIENT: '样本不足',
  LIMITED: '样本量有限',
  FULL: '正常展示',
}

export interface PortfolioTeacherPortraitCohortDimensionVO {
  dimensionCode: PortfolioPortraitDimension
  dimensionLabel: string
  personalScore: number
  cohortAverage?: number
  cohortMedian?: number
  cohortPercentileLow?: number
  cohortPercentileHigh?: number
}

export interface PortfolioTeacherPortraitCohortCompareVO {
  teacherId: string
  cohortLabel?: string
  /** 已有画像快照的同院系教师数，非院系名册总人数 */
  sampleSize: number
  displayMode: PortfolioPortraitCohortDisplayMode
  dimensions: PortfolioTeacherPortraitCohortDimensionVO[]
}

export interface PortfolioTeacherPortraitIndicatorDetailRequest {
  teacherId?: string
  dimensionCode: PortfolioPortraitDimension
}

/** 画像指标下钻依据类型 - PortfolioPortraitIndicatorEvidenceTypeEnum */
export type PortfolioPortraitIndicatorEvidenceType = 'OFFICIAL_ARCHIVE' | 'HR_MASTER'

export const PORTFOLIO_PORTRAIT_INDICATOR_EVIDENCE_TYPE_LABEL: Record<PortfolioPortraitIndicatorEvidenceType, string> = {
  OFFICIAL_ARCHIVE: '正式档案',
  HR_MASTER: '人事主数据',
}

export interface PortfolioTeacherPortraitIndicatorEvidenceVO {
  evidenceType: PortfolioPortraitIndicatorEvidenceType
  archiveRecordId?: string
  categoryName?: string
  categoryCode?: string
  recordStatus?: PortfolioArchiveRecordStatus
  scoreContribution?: number
  summary?: string
  updateTime?: string
}

export interface PortfolioTeacherPortraitIndicatorDetailVO {
  teacherId: string
  dimensionCode: PortfolioPortraitDimension
  dimensionLabel: string
  dimensionScore: number
  dataSource: string
  computedTime?: string
  evidences: PortfolioTeacherPortraitIndicatorEvidenceVO[]
}

export interface PortfolioArchiveRecordPageRequest extends QueryDto {
  teacherId?: string
  categoryId?: string
  recordStatus?: PortfolioArchiveRecordStatus
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
  materialType?: string
}

export interface PortfolioArchiveRecordSummaryVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatus
  sourceType: PortfolioArchiveRecordSourceType
  updateTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
  createTime?: string
}

export interface PortfolioArchiveRecordFieldVO extends PortfolioRecordFieldCore {
  referenceCandidateFieldId?: string
  updateTime?: string
  fieldCorrecting?: boolean
}

export interface PortfolioArchiveRecordDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatus
  sourceType: PortfolioArchiveRecordSourceType
  updateTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
  latestRejectReason?: string
  fields: PortfolioArchiveRecordFieldVO[]
}

export interface PortfolioArchiveTimelineRequest {
  teacherId?: string
  limit?: number
}

export interface PortfolioArchiveTimelineItemVO {
  archiveRecordId: string
  categoryId: string
  categoryName?: string
  recordStatus: PortfolioArchiveRecordStatus
  sourceType: PortfolioArchiveRecordSourceType
  eventTime?: string
  evaluationIncluded: boolean
  referenceAiTaskId?: string
}

export interface PortfolioTeacherOneTableGetRequest {
  teacherId?: string
}

export interface PortfolioTeacherOneTableCategoryVO {
  categoryId: string
  categoryName: string
  parentId?: string
  recordCount: number
  officialRecordId?: string
  latestRecordStatus?: PortfolioArchiveRecordStatus
  latestUpdateTime?: string
}

export interface PortfolioTeacherOneTableVO {
  teacherId: string
  categories: PortfolioTeacherOneTableCategoryVO[]
}

export interface PortfolioArchiveRecordFieldInput {
  fieldCode: string
  fieldValue?: string
  evidenceRef?: string
}

export interface PortfolioArchiveRecordSaveDraftRequest {
  teacherId?: string
  recordId?: string
  categoryId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioArchiveRecordSubmitRequest {
  teacherId?: string
  recordId?: string
  categoryId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioArchiveRecordWriteResultVO {
  recordId: string
  recordStatus: PortfolioArchiveRecordStatus
}

/** 待办类型 - PortfolioTodoTypeEnum */
export type PortfolioTodoType
  = | 'ARCHIVE_RETURNED'
    | 'ARCHIVE_PENDING_CONFIRM'
    | 'ARCHIVE_DRAFT'
    | 'CORRECTION_REJECTED'
    | 'CORRECTION_IN_PROGRESS'
    | 'GAP_PENDING'
    | 'GAP_RETURNED'
    | 'EVALUATION_MATERIAL_CONFIRM'
    | 'EVALUATION_RETURNED_SUPPLEMENT'
    | 'DEVELOPMENT_PLAN_PENDING'
    | 'DEVELOPMENT_PLAN_REVIEW'
    | 'DUAL_TEACHER_DRAFT'
    | 'DUAL_TEACHER_RETURNED'

export const PORTFOLIO_TODO_TYPE_LABEL: Record<PortfolioTodoType, string> = {
  ARCHIVE_RETURNED: '审核退回',
  ARCHIVE_PENDING_CONFIRM: '待确认档案',
  ARCHIVE_DRAFT: '草稿待提交',
  CORRECTION_REJECTED: '纠错驳回',
  CORRECTION_IN_PROGRESS: '纠错处理中',
  GAP_PENDING: '补采待处理',
  GAP_RETURNED: '补采退回',
  EVALUATION_MATERIAL_CONFIRM: '评价材料确认',
  EVALUATION_RETURNED_SUPPLEMENT: '评价退回补充',
  DEVELOPMENT_PLAN_PENDING: '年度规划待提交',
  DEVELOPMENT_PLAN_REVIEW: '年度规划待审核',
  DUAL_TEACHER_DRAFT: '双师认定草稿',
  DUAL_TEACHER_RETURNED: '双师认定退回',
}

export interface PortfolioTodoPageRequest extends QueryDto {
  teacherId?: string
  todoType?: PortfolioTodoType
}

export interface PortfolioTodoCompleteRequest {
  todoType: PortfolioTodoType
  refId: string
}

export interface PortfolioTodoSummaryVO {
  todoType: PortfolioTodoType
  refId: string
  title: string
  summary?: string
  dueTime?: string
  categoryId?: string
  categoryName?: string
  archiveRecordId?: string
  referenceAiTaskId?: string
  updateTime?: string
}

/** 纠错工单状态 - PortfolioCorrectionRequestStatusEnum */
export type PortfolioCorrectionRequestStatus
  = | 'SUBMITTED'
    | 'ACCEPTING'
    | 'ARCHIVE_CORRECTING'
    | 'SOURCE_FIXING'
    | 'PENDING_VERIFY'
    | 'CLOSED'
    | 'REJECTED'

export const PORTFOLIO_CORRECTION_REQUEST_STATUS_LABEL: Record<PortfolioCorrectionRequestStatus, string> = {
  SUBMITTED: '已提交',
  ACCEPTING: '受理中',
  ARCHIVE_CORRECTING: '档案更正',
  SOURCE_FIXING: '源系统整改',
  PENDING_VERIFY: '待验证',
  CLOSED: '已关闭',
  REJECTED: '驳回',
}

export const PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE: Record<PortfolioCorrectionRequestStatus, BadgeTone> = {
  SUBMITTED: 'blue',
  ACCEPTING: 'orange',
  ARCHIVE_CORRECTING: 'orange',
  SOURCE_FIXING: 'orange',
  PENDING_VERIFY: 'blue',
  CLOSED: 'green',
  REJECTED: 'red',
}

export interface PortfolioCorrectionSubmitRequest {
  teacherId?: string
  archiveRecordId?: string
  categoryId: string
  fieldCode: string
  fieldLabel?: string
  wrongValue?: string
  expectedValue?: string
  reason: string
  evidenceRef?: string
}

export interface PortfolioCorrectionPageRequest extends QueryDto {
  teacherId?: string
  requestStatus?: PortfolioCorrectionRequestStatus
}

export interface PortfolioCorrectionSummaryVO {
  id: string
  teacherId: string
  teacherName?: string
  archiveRecordId?: string
  categoryId: string
  categoryName?: string
  fieldCode: string
  fieldLabel?: string
  requestStatus: PortfolioCorrectionRequestStatus
  reason: string
  handleOpinion?: string
  createTime?: string
  updateTime?: string
}

export interface PortfolioCorrectionDetailVO extends PortfolioCorrectionSummaryVO {
  wrongValue?: string
  expectedValue?: string
  evidenceRef?: string
  sourceType?: PortfolioArchiveRecordSourceType
  handledTime?: string
}

/** 补采任务状态 - PortfolioGapTaskStatusEnum */
export type PortfolioGapTaskStatus
  = | 'PENDING'
    | 'RETURNED'
    | 'OVERDUE'
    | 'SUBMITTED'
    | 'REVIEWING'
    | 'CLOSED'

export const PORTFOLIO_GAP_TASK_STATUS_LABEL: Record<PortfolioGapTaskStatus, string> = {
  PENDING: '待处理',
  RETURNED: '已退回',
  OVERDUE: '已逾期',
  SUBMITTED: '已提交',
  REVIEWING: '审核中',
  CLOSED: '已关闭',
}

export interface PortfolioGapMissingFieldVO {
  fieldCode: string
  fieldLabel?: string
  required?: boolean
  readonly?: boolean
  currentValue?: string
  missing?: boolean
}

export interface PortfolioGapTaskDetailVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  taskTitle?: string
  taskStatus: PortfolioGapTaskStatus
  dueTime?: string
  returnReason?: string
  archiveRecordId?: string
  officialRecordId?: string
  missingFields: PortfolioGapMissingFieldVO[]
}

export interface PortfolioGapTaskSubmitRequest {
  gapTaskId: string
  teacherId?: string
  fileNodeId?: string
  fields: PortfolioArchiveRecordFieldInput[]
}

export interface PortfolioGapTaskSummaryVO {
  id: string
  teacherId: string
  categoryId: string
  categoryName?: string
  taskTitle?: string
  taskStatus: PortfolioGapTaskStatus
  returnReason?: string
  dueTime?: string
  updateTime?: string
}

export interface PortfolioGapTaskPageRequest extends QueryDto {
  teacherId?: string
  departmentId?: string
  taskStatus?: PortfolioGapTaskStatus
  openOnly?: boolean
}

export interface PortfolioGapUrgeRequest {
  gapTaskId: string
}

/** 纠错管理动作 - PortfolioCorrectionHandleActionEnum */
export type PortfolioCorrectionHandleAction
  = | 'ACCEPT'
    | 'REJECT'
    | 'MARK_ARCHIVE_CORRECTING'
    | 'MARK_SOURCE_FIXING'
    | 'MARK_PENDING_VERIFY'
    | 'CLOSE'

export interface PortfolioCorrectionHandleRequest {
  correctionRequestId: string
  action: PortfolioCorrectionHandleAction
  handleOpinion?: string
}

/** 评价教师通知状态 - PortfolioEvaluationTeacherNoticeStatusEnum */
export type PortfolioEvaluationTeacherNoticeStatus
  = | 'MATERIAL_CONFIRM'
    | 'RETURNED_SUPPLEMENT'
    | 'CONFIRMED'

export const PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_LABEL: Record<PortfolioEvaluationTeacherNoticeStatus, string> = {
  MATERIAL_CONFIRM: '材料待确认',
  RETURNED_SUPPLEMENT: '退回补充',
  CONFIRMED: '已确认',
}

export const PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE: Record<PortfolioEvaluationTeacherNoticeStatus, BadgeTone> = {
  MATERIAL_CONFIRM: 'blue',
  RETURNED_SUPPLEMENT: 'orange',
  CONFIRMED: 'green',
}

export interface PortfolioEvaluationTeacherNoticeVO {
  id: string
  teacherId: string
  evaluationTaskId: string
  taskTitle?: string
  noticeStatus: PortfolioEvaluationTeacherNoticeStatus
  returnReason?: string
  dueTime?: string
  updateTime?: string
}

export interface PortfolioEvaluationTeacherNoticePageRequest extends QueryDto {
  teacherId?: string
  noticeStatus?: PortfolioEvaluationTeacherNoticeStatus
}

export interface PortfolioEvaluationTeacherNoticeConfirmRequest {
  noticeId: string
}

export interface PortfolioEvaluationTeacherNoticeReturnRequest {
  noticeId: string
  returnReason: string
  dueTime?: string
}

export interface PortfolioEvaluationMaterialPreviewRequest {
  evaluationTaskId: string
  teacherId?: string
}

export interface PortfolioEvaluationMaterialCategoryItemVO {
  categoryId: string
  categoryName?: string
  completed?: boolean
}

export interface PortfolioEvaluationMaterialPreviewVO {
  evaluationTaskId: string
  taskName?: string
  taskStatus?: string
  startTime?: string
  endTime?: string
  noticeId?: string
  completenessPercent?: string
  requiredCategoryDone?: number
  requiredCategoryTotal?: number
  categories?: PortfolioEvaluationMaterialCategoryItemVO[]
}

/** 评价公示状态 - PortfolioEvaluationPublicityStatusEnum */
export type PortfolioEvaluationPublicityStatus = 'OPEN' | 'CLOSED'

export const PORTFOLIO_EVALUATION_PUBLICITY_STATUS_LABEL: Record<PortfolioEvaluationPublicityStatus, string> = {
  OPEN: '公示中',
  CLOSED: '已结束',
}

export const PORTFOLIO_EVALUATION_PUBLICITY_STATUS_TONE: Record<PortfolioEvaluationPublicityStatus, BadgeTone> = {
  OPEN: 'blue',
  CLOSED: 'gray',
}

/** 评价异议状态 - PortfolioEvaluationObjectionStatusEnum */
export type PortfolioEvaluationObjectionStatus = 'SUBMITTED' | 'UPHELD' | 'REJECTED' | 'CLOSED'

export const PORTFOLIO_EVALUATION_OBJECTION_STATUS_LABEL: Record<PortfolioEvaluationObjectionStatus, string> = {
  SUBMITTED: '已提交',
  UPHELD: '异议成立',
  REJECTED: '异议驳回',
  CLOSED: '已关闭',
}

export const PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE: Record<PortfolioEvaluationObjectionStatus, BadgeTone> = {
  SUBMITTED: 'blue',
  UPHELD: 'green',
  REJECTED: 'red',
  CLOSED: 'gray',
}

export interface PortfolioEvaluationPublicityListRequest {
  evaluationTaskId?: string
  teacherId?: string
}

export interface PortfolioEvaluationPublicityListItemVO {
  publicityId: string
  evaluationTaskId: string
  taskName?: string
  taskStatus?: PortfolioEvaluationTaskStatus
  publicityTitle?: string
  publicityStatus: PortfolioEvaluationPublicityStatus
  startTime?: string
  endTime?: string
  teacherId?: string
  teacherName?: string
  canSubmitObjection?: boolean
  objectionStatus?: PortfolioEvaluationObjectionStatus
  objectionId?: string
  objectionType?: PortfolioEvaluationObjectionType
  objectionReason?: string
  evidenceRef?: string
  handleOpinion?: string
  handleAction?: PortfolioEvaluationObjectionHandleAction
}

/** 评价异议类型 - PortfolioEvaluationObjectionTypeEnum */
export type PortfolioEvaluationObjectionType
  = | 'RESULT_DISPUTE'
    | 'SCORE_DISPUTE'
    | 'MATERIAL_DISPUTE'
    | 'OTHER'

export const PORTFOLIO_EVALUATION_OBJECTION_TYPE_LABEL: Record<PortfolioEvaluationObjectionType, string> = {
  RESULT_DISPUTE: '结果争议',
  SCORE_DISPUTE: '分值争议',
  MATERIAL_DISPUTE: '材料依据争议',
  OTHER: '其他',
}

/** 评价异议复核动作 - PortfolioEvaluationObjectionHandleActionEnum */
export type PortfolioEvaluationObjectionHandleAction = 'MAINTAIN' | 'CORRECT' | 'REVOKE' | 'RE_REVIEW'

export const PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_LABEL: Record<
  PortfolioEvaluationObjectionHandleAction,
  string
> = {
  MAINTAIN: '维持原结果',
  CORRECT: '修正评价结果',
  REVOKE: '撤销评价结论',
  RE_REVIEW: '重新评审',
}

export const PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE: Record<
  PortfolioEvaluationObjectionHandleAction,
  BadgeTone
> = {
  MAINTAIN: 'gray',
  CORRECT: 'green',
  REVOKE: 'orange',
  RE_REVIEW: 'blue',
}

export interface PortfolioEvaluationObjectionPageRequest extends QueryDto {
  evaluationTaskId?: string
  teacherId?: string
  objectionStatus?: PortfolioEvaluationObjectionStatus
}

export interface PortfolioEvaluationObjectionSummaryVO {
  objectionId: string
  evaluationTaskId: string
  taskName?: string
  publicityId: string
  publicityTitle?: string
  teacherId: string
  teacherName?: string
  objectionType: PortfolioEvaluationObjectionType
  objectionReason?: string
  evidenceRef?: string
  objectionStatus: PortfolioEvaluationObjectionStatus
  handleAction?: PortfolioEvaluationObjectionHandleAction
  handleOpinion?: string
  handlerUserId?: string
  handledTime?: string
  createTime?: string
}

export interface PortfolioEvaluationObjectionHandleRequest {
  objectionId: string
  action: PortfolioEvaluationObjectionHandleAction
  handleOpinion?: string
  correctedScore?: number
}

export interface PortfolioEvaluationResultSummaryRequest {
  evaluationTaskId: string
  teacherId?: string
}

export interface PortfolioEvaluationTeacherResultEntryVO {
  indicatorCode?: string
  score?: number
  commentText?: string
  evaluatorUserId?: string
}

export interface PortfolioEvaluationTeacherResultSummaryVO {
  evaluationTaskId: string
  taskName?: string
  teacherId: string
  teacherName?: string
  entryCount?: number
  averageScore?: number
  completenessPercent?: number
  requiredCategoryDone?: number
  requiredCategoryTotal?: number
  materialCategories?: PortfolioEvaluationMaterialCategoryItemVO[]
  entries?: PortfolioEvaluationTeacherResultEntryVO[]
}

export interface PortfolioEvaluationPublicityPublishRequest {
  evaluationTaskId: string
  publicityTitle: string
  startTime: string
  endTime: string
}

export interface PortfolioEvaluationObjectionSubmitRequest {
  evaluationTaskId: string
  publicityId: string
  objectionType: PortfolioEvaluationObjectionType
  objectionReason: string
  evidenceRef?: string
}

/** 评价任务推进动作 - PortfolioEvaluationTaskAdvanceActionEnum */
export type PortfolioEvaluationTaskAdvanceAction
  = | 'START_PRELIMINARY_REVIEW'
    | 'START_SCHOOL_REVIEW'
    | 'START_EXPERT_REVIEW'
    | 'START_RESULT_SUMMARY'
    | 'START_PUBLICITY'
    | 'START_OBJECTION_HANDLING'
    | 'ARCHIVE'
    | 'SUSPEND'
    | 'RESUME'
    | 'VOID'
    | 'CLOSE'

export interface PortfolioEvaluationTaskAdvanceRequest {
  taskId: string
  action: PortfolioEvaluationTaskAdvanceAction
}

/** 材料库条目状态 */
export type PortfolioMaterialStatus = 'ACTIVE'

export const PORTFOLIO_MATERIAL_STATUS_LABEL: Record<PortfolioMaterialStatus, string> = {
  ACTIVE: '有效',
}

export const PORTFOLIO_MATERIAL_STATUS_TONE: Record<PortfolioMaterialStatus, BadgeTone> = {
  ACTIVE: 'green',
}

export interface PortfolioMaterialVO {
  id: string
  teacherId: string
  materialType: PortfolioMaterialType
  materialTitle?: string
  fileNodeId?: string
  categoryCode?: string
  status?: PortfolioMaterialStatus
  ocrStatus?: string
  ocrFinishedTime?: string
  ocrFailureReason?: string
  providerChain?: string
}

export interface PortfolioMaterialSearchRequest extends QueryDto {
  keyword: string
  teacherId?: string
  materialType?: PortfolioMaterialType
}

export interface PortfolioMaterialSearchResponse {
  materialId: string
  teacherId: string
  materialType: PortfolioMaterialType
  materialTitle?: string
  fileNodeId?: string
  snippet?: string
}

export interface PortfolioMaterialPageRequest extends QueryDto {
  teacherId?: string
  materialType?: PortfolioMaterialType
  status?: PortfolioMaterialStatus
}

export interface PortfolioMaterialSaveRequest {
  id?: string
  teacherId?: string
  materialType: PortfolioMaterialType
  materialTitle: string
  fileNodeId: string
  categoryCode?: string
}
