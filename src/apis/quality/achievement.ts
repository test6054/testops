import type {
  AchievementStatusCode,
  AchievementTargetTypeCode,
  AggregationFunctionCode,
  EvaluationMethodCode,
} from './types'
import type { QueryDto } from '@/types'
/**
 * 达成度计算 API - 对齐 AchievementCalculationController
 *
 * 后端路径：
 * - /api/quality/achievement            确定性计算入口（6 个 compute-* 子端点）
 *
 * 结果查询 / 审核 API 位于 ./achievement-result。
 *
 * 审核责任链、明细、人工复核的相关查询 / 处理 API 分别位于：
 * - ./achievement-audit       (achievementAuditApi / achievementManualReviewApi)
 * - ./achievement-detail      (achievementDetailApi)
 */
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const CALC = '/api/quality/achievement'

// ─── 计算入口请求 ──────────────────────────────────────────────────

/** 课程目标计算请求 */
export interface ComputeCourseGoalRequest {
  qualityCourseId: string
  courseGoalId: string
  schoolYear?: string
  semester?: SemesterCode
  classId?: string
  evaluationMethod?: EvaluationMethodCode
  professionProfileId?: string
}

/** 专业达成度汇总请求 - 严格对齐 ComputeProgramRequest */
export interface ComputeProgramRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: SemesterCode
  professionProfileId?: string
}

/** 课程思政独立达成度聚合请求 - 严格对齐 ComputeCivicGoalRequest */
export interface ComputeCivicGoalRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: SemesterCode
  professionProfileId?: string
}

/** 复杂工程问题专项达成度聚合请求 - 严格对齐 ComputeComplexEngineeringRequest */
export interface ComputeComplexEngineeringRequest {
  programId: string
  trainingPlanId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: SemesterCode
  professionProfileId?: string
}

/** 毕业要求 / 观测点聚合请求 */
export interface ComputeRequirementRequest {
  programId: string
  trainingPlanId: string
  requirementId?: string
  gradeLevel?: string
  schoolYear?: string
  semester?: SemesterCode
  professionProfileId?: string
}

/** 培养目标聚合请求 */
export interface ComputeTrainingObjectiveRequest {
  programId: string
  trainingPlanId: string
  trainingObjectiveId: string
  gradeLevel?: string
  schoolYear?: string
  semester?: SemesterCode
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
  achievementStatus?: AchievementStatusCode
  evaluationMethod?: EvaluationMethodCode
  directWeight?: number
  indirectWeight?: number
  assessmentItemCount?: number
  directSampleCount?: number
  indirectValidSampleCount?: number
  indirectCoverage?: number
  evidenceGap?: string
}

/** 单条毕业要求 / 观测点摘要 - 严格对齐 RequirementAchievementSummaryVO */
export interface RequirementAchievementSummaryVO {
  achievementResultId?: string
  targetType: AchievementTargetTypeCode
  targetId?: string
  targetCode?: string
  targetName?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatusCode
  aggregation?: AggregationFunctionCode
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
  achievementStatus?: AchievementStatusCode
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
  achievementStatus?: AchievementStatusCode
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
  achievementStatus?: AchievementStatusCode
  aggregation?: AggregationFunctionCode
  civicGoalCount?: number
}

/** 复杂工程问题专项 VO - 严格对齐 ComplexEngineeringGoalAchievementSummaryVO */
export interface ComplexEngineeringGoalAchievementSummaryVO {
  achievementResultId?: string
  programId?: string
  trainingPlanId?: string
  finalValue?: number
  thresholdValue?: number
  achievementStatus?: AchievementStatusCode
  aggregation?: AggregationFunctionCode
  complexEngineeringGoalCount?: number
}

/** 计算就绪查询 - 严格对齐 AchievementComputeReadinessRequest；programId / trainingPlanId 合同必填 */
export interface AchievementComputeReadinessRequest extends QueryDto {
  programId: string
  trainingPlanId: string
  qualityCourseId?: string
  courseGoalId?: string
  trainingObjectiveId?: string
  schoolYear?: string
  semester?: SemesterCode
}

/** 计算就绪项 - 严格对齐 AchievementComputeReadinessItemVO */
export interface AchievementComputeReadinessItemVO {
  computeKind: string
  /** 链式步骤序号，后端必填 int */
  stageOrder: number
  stageTitle: string
  /** 是否可执行计算，后端必填 boolean */
  ready: boolean
  blockingReasons: string[]
  /** 目标对象 / 计算范围说明 */
  targetScopeLabel: string
  /** 数据期间说明 */
  dataPeriodLabel: string
  /** 算法口径说明 */
  algorithmProfileLabel: string
  /** 预计覆盖结果数 */
  expectedCoverCount: number
  /** 将被覆盖的未锁定结果数 */
  replaceableResultCount: number
  /** 已提交锁定结果数 */
  lockedSubmittedCount: number
  /** 已确认锁定结果数 */
  lockedConfirmedCount: number
  /** 已归档锁定结果数 */
  lockedArchivedCount: number
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
}
