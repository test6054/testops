/**
 * 教学档案袋 API 共享类型 - 对应 edu-quality portfolio 包
 */
import type { QueryDto } from '@/types'

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
    | 'INDUSTRY_MENTOR'
    | 'ENTERPRISE_PART_TIME'
    | 'SKILL_MASTER'
    | 'CRAFTSMAN'
    | 'OTHER_EXTERNAL'

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL: Record<PortfolioTeacherIdentityType, string> = {
  FULL_TIME: '专任教师',
  PART_TIME: '兼职教师',
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
  syncedAt: string
  departmentCount: number
  majorCount: number
  classCount: number
  invalidPortfolioOrgUnitIds: string[]
  invalidPortfolioOrgUnits: PortfolioOrgSyncInvalidUnitVO[]
}

export interface PortfolioOrgSyncLogVO {
  id: string
  syncedAt: string
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
  status?: 'ACTIVE' | 'INACTIVE'
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

export type PortfolioArchiveFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'ENUM'

export const PORTFOLIO_ARCHIVE_FIELD_TYPE_LABEL: Record<PortfolioArchiveFieldType, string> = {
  TEXT: '文本',
  NUMBER: '数值',
  DATE: '日期',
  ENUM: '枚举',
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
  publishedAt?: string
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

export interface PortfolioArchivePublishedFieldsVO {
  categoryId: string
  templateCode: string
  templateVersionId: string
  versionNo: string
  targetFields: PortfolioTargetFieldDefinition[]
}
