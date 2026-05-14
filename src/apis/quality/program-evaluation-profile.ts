/**
 * 专业评价口径 API - 对应 ProgramEvaluationProfileController
 * 后端路径：/api/quality/program-evaluation-profiles
 *
 * 用于配置某个专业采用哪个认证标准、评价方法、评价周期、样本范围、责任链与归档策略。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/program-evaluation-profiles'

export interface ProgramEvaluationProfileVO {
  id: string
  programId: string
  programName: string
  schoolId?: string
  departmentId?: string
  accreditationType: string
  standardId?: string
  standardYear?: string
  accreditationLevel?: string
  evaluationMethod: string
  evaluationCycle: string
  sampleScope?: string
  reviewChain?: string
  archivePolicy?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ProgramEvaluationProfileSavePayload {
  id?: string
  programId: string
  programName: string
  schoolId?: string
  departmentId?: string
  accreditationType: string
  standardId?: string
  standardYear?: string
  accreditationLevel?: string
  evaluationMethod: string
  evaluationCycle: string
  sampleScope?: string
  reviewChain?: string
  archivePolicy?: string
  enabled?: boolean
}

export interface ProgramEvaluationProfileQueryPayload extends QueryDto {
  schoolId?: string
  departmentId?: string
  accreditationType?: string
  enabled?: boolean
  keyword?: string
}

export const programEvaluationProfileApi = {
  page: (data: ProgramEvaluationProfileQueryPayload) =>
    http.post<PageResult<ProgramEvaluationProfileVO>>(`${BASE}/page`, data),
  detail: (id: string) =>
    http.post<ProgramEvaluationProfileVO>(`${BASE}/detail`, { id }),
  create: (data: ProgramEvaluationProfileSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ProgramEvaluationProfileSavePayload) =>
    http.post<void>(`${BASE}/update`, data),
  delete: (id: string) =>
    http.post<void>(`${BASE}/delete`, { id }),
  /** 按专业取启用中的口径 */
  byProgram: (programId: string) =>
    http.post<ProgramEvaluationProfileVO | null>(`${BASE}/by-program`, { id: programId }),
}
