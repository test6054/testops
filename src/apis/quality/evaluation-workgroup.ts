/**
 * 专业评价工作组 API - 对应 EvaluationWorkgroupController
 * 后端路径：/api/quality/evaluation-workgroups
 *
 * 工作组层级：PROGRAM（专业级）/ SCHOOL（校级）/ INDUSTRY（行业企业）。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/evaluation-workgroups'

export interface EvaluationWorkgroupVO {
  id: string
  programId: string
  workgroupCode: string
  workgroupName: string
  levelCode: string
  convenerUserId: string
  members?: string
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
}
