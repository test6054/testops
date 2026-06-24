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

export const PORTFOLIO_ORG_ALIAS_TARGET_TYPE_OPTIONS =
  (Object.keys(PORTFOLIO_ORG_ALIAS_TARGET_TYPE_LABEL) as PortfolioOrgAliasTargetType[])
    .map(value => ({ value, label: PORTFOLIO_ORG_ALIAS_TARGET_TYPE_LABEL[value] }))

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

export const PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS =
  (Object.keys(PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL) as PortfolioTeacherIdentityType[])
    .map(value => ({ value, label: PORTFOLIO_TEACHER_IDENTITY_TYPE_LABEL[value] }))

/** 教师身份状态 - PortfolioTeacherIdentityStatusEnum */
export type PortfolioTeacherIdentityStatus = 'ACTIVE' | 'INACTIVE'

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL: Record<PortfolioTeacherIdentityStatus, string> = {
  ACTIVE: '有效',
  INACTIVE: '停用',
}

export const PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS =
  (Object.keys(PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL) as PortfolioTeacherIdentityStatus[])
    .map(value => ({ value, label: PORTFOLIO_TEACHER_IDENTITY_STATUS_LABEL[value] }))

/** 组织树节点类型 - PortfolioOrgTreeNodeTypeConstants */
export type PortfolioOrgTreeNodeType
  = | 'SCHOOL'
    | 'DEPARTMENT'
    | 'MAJOR'
    | 'MAJOR_GROUP'
    | 'TEACHING_RESEARCH_OFFICE'
    | 'CAMPUS'
    | 'CLASS'

export const PORTFOLIO_ORG_TREE_NODE_TYPE_LABEL: Record<PortfolioOrgTreeNodeType, string> = {
  SCHOOL: '学校',
  DEPARTMENT: '院系',
  MAJOR: '专业',
  MAJOR_GROUP: '专业群',
  TEACHING_RESEARCH_OFFICE: '教研室',
  CAMPUS: '校区',
  CLASS: '班级',
}

export const PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES: PortfolioOrgTreeNodeType[] = [
  'MAJOR_GROUP',
  'TEACHING_RESEARCH_OFFICE',
  'CAMPUS',
]

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
