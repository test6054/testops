import type {
  AchievementAuditStatus,
  AchievementStatus,
  AchievementTargetType,
  AggregationFunction,
  EvaluationMethod,
} from './types'
/**
 * 达成度计算 + 结果查询 / 审核 API - 对接 edu-quality
 *
 * 后端路径：
 * - /api/quality/achievement            确定性计算入口（6 个 compute-* 子端点）
 * - /api/quality/achievement-results    结果查询与审核（page/detail/update-audit-status）
 *
 * 字段严格对齐 AchievementResultVO / AchievementResultQueryRequest / AchievementResultAuditRequest
 * 以及各 compute-* 入参 / 出参 VO。
 *
 * 审核责任链、明细、人工复核的相关查询 / 处理 API 分别位于：
 * - ./achievement-audit       (achievementAuditApi / achievementManualReviewApi)
 * - ./achievement-detail      (achievementDetailApi)
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const CALC = '/api/quality/achievement'
const RESULT = '/api/quality/achievement-results'

/** 达成度计算结果 VO - 严格对齐后端 AchievementResultVO */
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
  semester: string
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
  staleAt?: string
  staleSourceType?: string
  staleSourceId?: string
  calculatedAt?: string
  createTime?: string
  updateTime?: string
}

// ─── 计算入口请求 ──────────────────────────────────────────────────

/** 课程目标计算请求 */
export interface ComputeCourseGoalRequest {
  qualityCourseId: string
  courseGoalId: string
  schoolYear?: string
  semester?: string
  classId?: string
  evaluationMethod?: EvaluationMethod
  professionProfileId?: string
}

/** 毕业要求 / 观测点聚合请求 */
export interface ComputeRequirementRequest {
  programId: string
  trainingPlanId: string
  requirementId?: string
  gradeLevel?: string
  schoolYear?: string
  semester?: string
  professionProfileId?: string
}

/** 专业汇总请求 */
export interface ComputeProgramRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: string
  professionProfileId?: string
}

/** 培养目标聚合请求 */
export interface ComputeTrainingObjectiveRequest {
  programId: string
  trainingPlanId: string
  trainingObjectiveId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: string
  professionProfileId?: string
}

/** 课程思政聚合请求 */
export interface ComputeCivicGoalRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: string
  professionProfileId?: string
}

/** 复杂工程问题聚合请求 */
export interface ComputeComplexEngineeringRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: string
  professionProfileId?: string
}

/** 课程目标达成度计算摘要 - 严格对齐后端 CourseGoalAchievementSummaryVO */
export interface CourseGoalAchievementSummaryVO {
  achievementResultId: string
  courseGoalId: string
  directValue?: number
  indirectValue?: number
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  evaluationMethod: EvaluationMethod
  directWeight?: number
  indirectWeight?: number
  assessmentItemCount: number
  directSampleCount: number
  indirectValidSampleCount: number
  indirectCoverage?: number
  evidenceGap?: string
}

/** 单条毕业要求 / 观测点摘要 - 严格对齐 RequirementAchievementSummaryVO */
export interface RequirementAchievementSummaryVO {
  achievementResultId?: string
  targetType: AchievementTargetType
  targetId?: string
  targetCode?: string
  targetName?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  aggregation?: AggregationFunction
  inputCount?: number
}

/** 毕业要求聚合 VO - 严格对齐 RequirementAggregateVO */
export interface RequirementAggregateVO {
  indicatorSummaries: RequirementAchievementSummaryVO[]
  requirementSummary?: RequirementAchievementSummaryVO
}

/** 专业汇总 VO - 严格对齐 ProgramAchievementSummaryVO */
export interface ProgramAchievementSummaryVO {
  achievementResultId?: string
  programId?: string
  trainingPlanId?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  aggregation?: string
  requirementCount?: number
}

/** 培养目标汇总 VO - 严格对齐 TrainingObjectiveAchievementSummaryVO */
export interface TrainingObjectiveAchievementSummaryVO {
  achievementResultId?: string
  trainingObjectiveId?: string
  trainingObjectiveCode?: string
  programId?: string
  trainingPlanId?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  aggregation?: string
  requirementCount?: number
}

/** 课程思政聚合 VO - 严格对齐 CivicGoalAchievementSummaryVO */
export interface CivicGoalAchievementSummaryVO {
  achievementResultId?: string
  programId?: string
  trainingPlanId?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  aggregation?: AggregationFunction
  dimensionCount?: number
}

/** 复杂工程问题专项 VO - 严格对齐 ComplexEngineeringGoalAchievementSummaryVO */
export interface ComplexEngineeringGoalAchievementSummaryVO {
  achievementResultId?: string
  programId?: string
  trainingPlanId?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatus
  aggregation?: AggregationFunction
  indicatorCount?: number
}

// ─── 结果维护请求 ─────────────────────────────────────────────────

/** 结果分页查询 - 严格对齐 AchievementResultQueryRequest */
export interface AchievementResultQueryRequest extends QueryDto {
  targetType?: AchievementTargetType
  targetId?: string
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  classId?: string
  schoolYear?: string
  semester?: string
  auditStatus?: AchievementAuditStatus
  achievementStatus?: AchievementStatus
}

/** 审核流转请求 - 严格对齐 AchievementResultAuditRequest */
export interface AchievementResultAuditRequest {
  id: string
  auditStatus: AchievementAuditStatus
  auditRemark?: string
}

/** 计算就绪查询 - 严格对齐 AchievementComputeReadinessRequest */
export interface AchievementComputeReadinessRequest {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  courseGoalId?: string
  trainingObjectiveId?: string
  schoolYear?: string
  semester?: string
}

/** 计算就绪项 - 严格对齐 AchievementComputeReadinessItemVO */
export interface AchievementComputeReadinessItemVO {
  computeKind: string
  stageOrder: number
  stageTitle: string
  ready: boolean
  blockingReasons: string[]
}

export const achievementApi = {
  // ─── 计算入口 ─────────────────────────────────────────
  computeReadiness: (data: AchievementComputeReadinessRequest) =>
    http.post<AchievementComputeReadinessItemVO[]>(`${CALC}/compute-readiness`, data),
  computeCourseGoal: (data: ComputeCourseGoalRequest) =>
    http.post<CourseGoalAchievementSummaryVO>(`${CALC}/compute-course-goal`, data),
  computeRequirement: (data: ComputeRequirementRequest) =>
    http.post<RequirementAggregateVO[]>(`${CALC}/compute-requirement`, data),
  computeProgram: (data: ComputeProgramRequest) =>
    http.post<ProgramAchievementSummaryVO>(`${CALC}/compute-program`, data),
  computeTrainingObjective: (data: ComputeTrainingObjectiveRequest) =>
    http.post<TrainingObjectiveAchievementSummaryVO>(`${CALC}/compute-training-objective`, data),
  computeCivicGoalAggregate: (data: ComputeCivicGoalRequest) =>
    http.post<CivicGoalAchievementSummaryVO>(`${CALC}/compute-civic-goal-aggregate`, data),
  computeComplexEngineeringAggregate: (data: ComputeComplexEngineeringRequest) =>
    http.post<ComplexEngineeringGoalAchievementSummaryVO>(
      `${CALC}/compute-complex-engineering-aggregate`,
      data,
    ),

  // ─── 结果查询与审核 ───────────────────────────────────
  page: (data: AchievementResultQueryRequest) =>
    http.post<PageResult<AchievementResultVO>>(`${RESULT}/page`, data),
  detail: (id: string) => http.post<AchievementResultVO>(`${RESULT}/detail`, { id }),
  /** 审核状态流转：DRAFT ↔ CALCULATED ↔ SUBMITTED ↔ CONFIRMED / RETURNED / ARCHIVED */
  updateAuditStatus: (data: AchievementResultAuditRequest) =>
    http.post<void>(`${RESULT}/update-audit-status`, data),
}
