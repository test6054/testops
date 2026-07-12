/**
 * 专业评价工作组 API - 对应 EvaluationWorkgroupController
 * 后端路径：/api/quality/evaluation-workgroups
 *
 * 工作组层级：UNIVERSITY（学校级）/ COLLEGE（学院级）/ PROGRAM（专业级）/ INDUSTRY（行业企业专家组）。
 */
import type { WorkgroupLevelCode } from './types'
import type { PageResult, QueryDto } from '@/types'
import type { WorkgroupMemberRoleCode } from '@/types/enums/workgroup-member-role-enum'
import http from '@/config/axios'
import {
  ALL_WORKGROUP_MEMBER_ROLE_CODES,
  WorkgroupMemberRoleDescription,
} from '@/types/enums/workgroup-member-role-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const BASE = '/api/quality/evaluation-workgroups'

export {
  ALL_WORKGROUP_MEMBER_ROLE_CODES,
  WorkgroupMemberRoleCode,
  WorkgroupMemberRoleDescription,
} from '@/types/enums/workgroup-member-role-enum'

export const WORKGROUP_MEMBER_ROLE_OPTIONS: Array<{ value: WorkgroupMemberRoleCode, label: string }>
  = ALL_WORKGROUP_MEMBER_ROLE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(WorkgroupMemberRoleDescription, value, '工作组成员角色'),
  }))

/**
 * 工作组成员结构化对象（后端 WorkgroupMember 投影）。
 */
export interface WorkgroupMember {
  /** 平台用户 ID；外部专家可空 */
  userId?: string
  /** 工号 / 编号；必填 */
  userCode: string
  /** 姓名；必填 */
  userName: string
  /** 角色；CONVENER / MEMBER / EXTERNAL_EXPERT，未填写时后端按 MEMBER 处理 */
  role?: WorkgroupMemberRoleCode
  /** 备注：组织 / 单位 / 联系方式等 */
  note?: string
}

export interface EvaluationWorkgroupVO {
  id: string
  programId: string
  programName?: string
  workgroupCode: string
  workgroupName: string
  levelCode: WorkgroupLevelCode
  convenerUserId: string
  convenerUserName?: string
  members?: WorkgroupMember[]
  responsibility?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface EvaluationWorkgroupSaveRequest {
  id?: string
  programId: string
  workgroupCode: string
  workgroupName: string
  levelCode: WorkgroupLevelCode
  convenerUserId: string
  members: WorkgroupMember[]
  responsibility?: string
  enabled?: boolean
}

export interface EvaluationWorkgroupQueryRequest extends QueryDto {
  levelCode?: WorkgroupLevelCode
  programId?: string
  enabled?: boolean
}

export const evaluationWorkgroupApi = {
  page: (data: EvaluationWorkgroupQueryRequest) =>
    http.post<PageResult<EvaluationWorkgroupVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<EvaluationWorkgroupVO>(`${BASE}/detail`, { id }),
  create: (data: EvaluationWorkgroupSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: EvaluationWorkgroupSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
}
