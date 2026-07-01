import type {
  AchievementAuditStatus,
  AchievementStatus,
  AchievementTargetType,
  AggregationFunction,
} from './types'
/**
 * 达成度结果查询与审核 API - 对齐 AchievementResultController。
 *
 * 后端路径：/api/quality/achievement-results
 */
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/achievement-results'

/** 达成度结果 VO - 严格对齐后端 AchievementResultVO */
export interface AchievementResultVO {
  id: string
  targetType: AchievementTargetType
  targetId: string
  targetLabel: string
  programId?: string
  programName: string
  trainingPlanId?: string
  trainingPlanCode: string
  trainingPlanName: string
  qualityCourseId?: string
  qualityCourseCode: string
  qualityCourseName: string
  schoolYear: string
  semester: SemesterCode
  gradeLevel?: string
  classId?: string
  className: string
  teacherUserId?: string
  sampleTotal: number
  sampleValid: number
  directValue?: number
  indirectValue?: number
  finalValue?: number
  thresholdValue?: number
  achievementStatus: AchievementStatus
  aggregation?: AggregationFunction
  scoreBatchIds: string[]
  auditStatus: AchievementAuditStatus
  auditRemark?: string
  staleFlag?: boolean
  staleReason?: string
  staleTime?: string
  staleSourceType?: string
  staleSourceId?: string
  calculatedTime?: string
  createTime?: string
  updateTime?: string
}

/** 结果分页查询 - 严格对齐 AchievementResultQueryRequest */
export interface AchievementResultQueryRequest extends QueryDto {
  targetType?: AchievementTargetType
  targetId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  classId?: string
  schoolYear?: string
  semester?: SemesterCode
  auditStatus?: AchievementAuditStatus
  achievementStatus?: AchievementStatus
}

/** 审核流转请求 - 严格对齐 AchievementResultAuditRequest */
export interface AchievementResultAuditRequest {
  id: string
  auditStatus: AchievementAuditStatus
  auditRemark?: string
}

export const achievementResultApi = {
  page: (data: AchievementResultQueryRequest) =>
    http.post<PageResult<AchievementResultVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<AchievementResultVO>(`${BASE}/detail`, { id }),
  /** 审核状态流转：DRAFT ↔ CALCULATED ↔ SUBMITTED ↔ CONFIRMED / RETURNED / ARCHIVED */
  updateAuditStatus: (data: AchievementResultAuditRequest) =>
    http.post<void>(`${BASE}/update-audit-status`, data),
}
