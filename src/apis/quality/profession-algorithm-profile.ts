import type { AccreditationType, AggregationFunction, ConfirmationStatus } from './types'
/**
 * 专业算法实例 API - 对应 ProfessionAlgorithmProfileController
 * 后端路径：/api/quality/profession-algorithm-profiles
 *
 * 设计文档 §7.2 三层结构第 3 层：必须由专业负责人确认（confirm）后才能进入达成度计算。
 * 状态流转（ConfirmationStatusEnum）：
 *   DRAFT/SUBMITTED/RETURNED → CONFIRMED；CONFIRMED → RETURNED。
 *   仅 CONFIRMED + enabled=true 的实例参与达成度计算。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/profession-algorithm-profiles'

export interface ProfessionAlgorithmProfileVO {
  id: string
  profileCode: string
  profileName: string
  templateId: string
  programId: string
  programName: string
  standardId?: string
  accreditationType: AccreditationType
  accreditationLevel?: string
  standardYear?: string
  courseGoalAggregation: AggregationFunction
  indicatorAggregation: AggregationFunction
  requirementAggregation: AggregationFunction
  directWeight: number
  indirectWeight: number
  indirectMinValidSampleCount?: number
  indirectCoverageThreshold?: number
  courseGoalThreshold?: number
  indicatorThreshold?: number
  requirementThreshold?: number
  inheritAggregationStrategy?: boolean
  inheritWeightStrategy?: boolean
  inheritThresholdStrategy?: boolean
  overrideAggregationStrategy?: boolean
  overrideWeightStrategy?: boolean
  overrideThresholdStrategy?: boolean
  overrideReason?: string
  confirmationStatus: ConfirmationStatus
  confirmedBy?: string
  confirmedAt?: string
  enabled: boolean
  createTime?: string
  updateTime?: string
}

export interface ProfessionAlgorithmProfileSaveRequest {
  id?: string
  profileCode: string
  profileName: string
  templateId: string
  programId: string
  standardId?: string
  accreditationType: AccreditationType
  accreditationLevel?: string
  standardYear?: string
  courseGoalAggregation: AggregationFunction
  indicatorAggregation: AggregationFunction
  requirementAggregation: AggregationFunction
  directWeight: number
  indirectWeight: number
  indirectMinValidSampleCount?: number
  indirectCoverageThreshold?: number
  courseGoalThreshold?: number
  indicatorThreshold?: number
  requirementThreshold?: number
  inheritAggregationStrategy?: boolean
  inheritWeightStrategy?: boolean
  inheritThresholdStrategy?: boolean
  overrideAggregationStrategy?: boolean
  overrideWeightStrategy?: boolean
  overrideThresholdStrategy?: boolean
  overrideReason?: string
  enabled?: boolean
}

export interface ProfessionAlgorithmProfileQueryRequest extends QueryDto {
  programId?: string
  accreditationType?: AccreditationType
  confirmationStatus?: ConfirmationStatus
  enabled?: boolean
  keyword?: string
}

export const professionAlgorithmProfileApi = {
  page: (data: ProfessionAlgorithmProfileQueryRequest) =>
    http.post<PageResult<ProfessionAlgorithmProfileVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ProfessionAlgorithmProfileVO>(`${BASE}/detail`, { id }),
  create: (data: ProfessionAlgorithmProfileSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  update: (data: ProfessionAlgorithmProfileSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** DRAFT/SUBMITTED/RETURNED → CONFIRMED：专业负责人确认实例 */
  confirm: (id: string) => http.post<void>(`${BASE}/confirm`, { id }),
  /** CONFIRMED → RETURNED：退回已确认实例 */
  revoke: (id: string) => http.post<void>(`${BASE}/revoke`, { id }),
  /** 按专业 ID 取当前生效（CONFIRMED + enabled）的实例 */
  activeByProgram: (programId: string) =>
    http.post<ProfessionAlgorithmProfileVO | null>(`${BASE}/active-by-program`, {
      id: programId,
    }),
}
