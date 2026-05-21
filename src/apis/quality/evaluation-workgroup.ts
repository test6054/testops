/**
 * 专业评价工作组 API - 对应 EvaluationWorkgroupController
 * 后端路径：/api/quality/evaluation-workgroups
 *
 * 工作组层级：PROGRAM（专业级）/ SCHOOL（校级）/ INDUSTRY（行业企业）。
 */
import type { ImportResult } from '@/apis/quality/importing'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/evaluation-workgroups'

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
  /** 角色；CONVENER / MEMBER / EXTERNAL_EXPERT */
  role?: string
  /** 备注：组织 / 单位 / 联系方式等 */
  note?: string
}

export interface EvaluationWorkgroupVO {
  id: string
  programId: string
  workgroupCode: string
  workgroupName: string
  levelCode: string
  convenerUserId: string
  members?: string
  /** 后端从 members JSON 解析后的结构化列表 */
  parsedMembers?: WorkgroupMember[]
  responsibility?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface EvaluationWorkgroupSavePayload {
  id?: string
  programId: string
  workgroupCode: string
  workgroupName: string
  levelCode: string
  convenerUserId: string
  members?: string
  responsibility?: string
  enabled?: boolean
}

export interface EvaluationWorkgroupQueryPayload extends QueryDto {
  programId?: string
  levelCode?: string
  enabled?: boolean
}

export const evaluationWorkgroupApi = {
  page: (data: EvaluationWorkgroupQueryPayload) =>
    http.post<PageResult<EvaluationWorkgroupVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<EvaluationWorkgroupVO>(`${BASE}/detail`, { id }),
  create: (data: EvaluationWorkgroupSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: EvaluationWorkgroupSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
  /** Excel 批量导入工作组成员（覆盖语义） */
  importMembersExcel: (workgroupId: string, file: File) => {
    const formData = new FormData()
    formData.append('workgroupId', workgroupId)
    formData.append('file', file)
    return http.upload<ImportResult>(`${BASE}/import-members-excel`, formData)
  },
  /** 下载工作组成员导入 Excel 模板 */
  downloadMembersTemplate: () =>
    http.download(`${BASE}/members-template-download`),
}
