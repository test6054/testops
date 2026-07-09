import type { AccreditationTypeCode, EvaluationCycleCode, EvaluationMethodCode } from './types'
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
  accreditationType: AccreditationTypeCode
  standardId?: string
  standardYear?: string
  accreditationLevel?: string
  evaluationMethod: EvaluationMethodCode
  evaluationCycle: EvaluationCycleCode
  includeGraduateSamples?: boolean
  includeEmployerSamples?: boolean
  includeAlumniSamples?: boolean
  includeCurrentStudentSamples?: boolean
  sampleScopeRemark?: string
  collegeReviewOwner?: string
  departmentReviewOwner?: string
  programReviewOwner?: string
  reviewChainRemark?: string
  archiveRetentionYears?: number
  archiveLocation?: string
  archiveResponsibleUnit?: string
  archivePolicyRemark?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ProgramEvaluationProfileSaveRequest {
  id?: string
  programId: string
  schoolId?: string
  departmentId?: string
  accreditationType: AccreditationTypeCode
  standardId?: string
  standardYear?: string
  accreditationLevel?: string
  evaluationMethod: EvaluationMethodCode
  evaluationCycle: EvaluationCycleCode
  includeGraduateSamples?: boolean
  includeEmployerSamples?: boolean
  includeAlumniSamples?: boolean
  includeCurrentStudentSamples?: boolean
  sampleScopeRemark?: string
  collegeReviewOwner?: string
  departmentReviewOwner?: string
  programReviewOwner?: string
  reviewChainRemark?: string
  archiveRetentionYears?: number
  archiveLocation?: string
  archiveResponsibleUnit?: string
  archivePolicyRemark?: string
  enabled?: boolean
}

export interface ProgramEvaluationProfileQueryRequest extends QueryDto {
  schoolId?: string
  departmentId?: string
  accreditationType?: AccreditationTypeCode
  enabled?: boolean
  keyword?: string
}

/** SignalBand 汇总响应 - 对齐后端 ProgramEvaluationProfileSignalSummaryVO */
export interface ProgramEvaluationProfileSignalSummaryVO {
  totalCount: number
  enabledCount: number
  disabledCount: number
  engineeringAccreditationCount: number
}

export const programEvaluationProfileApi = {
  page: (data: ProgramEvaluationProfileQueryRequest) =>
    http.post<PageResult<ProgramEvaluationProfileVO>>(`${BASE}/page`, data),
  signalSummary: (data: ProgramEvaluationProfileQueryRequest) =>
    http.post<ProgramEvaluationProfileSignalSummaryVO>(`${BASE}/signal-summary`, data),
  detail: (id: string) => http.post<ProgramEvaluationProfileVO>(`${BASE}/detail`, { id }),
  create: (data: ProgramEvaluationProfileSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ProgramEvaluationProfileSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 按专业取启用中的口径 */
  byProgram: (programId: string) =>
    http.post<ProgramEvaluationProfileVO | null>(`${BASE}/by-program`, { id: programId }),
}
