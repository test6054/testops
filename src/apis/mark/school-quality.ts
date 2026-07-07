import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisExamScopeResponse, ExamStatSnapshotResponse } from './cross-exam-analysis'
import type { QuestionTypeCode } from './question-type'

/**
 * AI 校级质量分析 API - 对接 edu-mark 模块 SchoolQualityAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/school-quality
 * - 写操作与查询均为 POST + 请求体 DTO
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExperienceRecommendationCode } from '@/types/enums/experience-recommendation-enum'
import type { SchoolQualityDimensionCode } from '@/types/enums/school-quality-dimension-enum'
import type { SchoolQualityItemDimensionCode } from '@/types/enums/school-quality-item-dimension-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  ALL_SCHOOL_QUALITY_DIMENSION_CODES,
  SchoolQualityDimensionDescription,
} from '@/types/enums/school-quality-dimension-enum'
import { SchoolQualityRatingCode } from '@/types/enums/school-quality-rating-enum'

export {
  ALL_EXPERIENCE_RECOMMENDATION_CODES,
  ExperienceRecommendationCode,
  ExperienceRecommendationDescription,
} from '@/types/enums/experience-recommendation-enum'

export {
  ALL_SCHOOL_QUALITY_DIMENSION_CODES,
  SchoolQualityDimensionCode,
  SchoolQualityDimensionDescription,
} from '@/types/enums/school-quality-dimension-enum'

export {
  ALL_SCHOOL_QUALITY_ITEM_DIMENSION_CODES,
  SchoolQualityItemDimensionCode,
  SchoolQualityItemDimensionDescription,
} from '@/types/enums/school-quality-item-dimension-enum'

export {
  ALL_SCHOOL_QUALITY_RATING_CODES,
  SchoolQualityRatingCode,
  SchoolQualityRatingDescription,
} from '@/types/enums/school-quality-rating-enum'

export const SCHOOL_QUALITY_DIMENSION_OPTIONS: Array<{
  value: SchoolQualityDimensionCode
  label: string
}> = ALL_SCHOOL_QUALITY_DIMENSION_CODES.map((value) => ({
  value,
  label: SchoolQualityDimensionDescription[value],
}))

/** 校级质量评价颜色 */
export const SCHOOL_QUALITY_RATING_TONE: Record<SchoolQualityRatingCode, BadgeTone> = {
  [SchoolQualityRatingCode.EXCELLENT]: 'green',
  [SchoolQualityRatingCode.GOOD]: 'blue',
  [SchoolQualityRatingCode.ACCEPTABLE]: 'orange',
  [SchoolQualityRatingCode.POOR]: 'red',
}

/** 校级质量分析条目 */
export interface SchoolQualityItemResponse {
  qualityDimension?: SchoolQualityItemDimensionCode
  metricName?: string
  metricValue?: number
  rating?: SchoolQualityRatingCode
  description?: string
  baselineComparison?: string
  suggestion?: string
}

/** 校级质量分析记录 - 对应 SchoolQualityAnalysis */
export interface SchoolQualityAnalysisResponse {
  id: string
  analysisDimension: SchoolQualityDimensionCode
  dimensionId?: string
  dimensionName?: string
  academicYear?: string
  semester?: SemesterCode
  exams?: AnalysisExamScopeResponse[]
  examCount?: number
  aiTraceId?: string
  qualitySummary?: string
  qualityItems?: SchoolQualityItemResponse[]
  examStatSnapshots?: ExamStatSnapshotResponse[]
  teachingQualityScore?: number
  questionQualityScore?: number
  markingQualityScore?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/** 经验有效性评估脱敏样本 */
export interface ExperienceEffectivenessEvalEvidenceResponse {
  anonymousId?: string
  anonymousClassLabel?: string
  questionNo?: string
  questionType?: QuestionTypeCode
  fullScore?: number
  standardAnswer?: string
  answerExplain?: string
  recognizedAnswer?: string
  teacherReviewScore?: number
  aiScore?: number
  objectiveResult?: string
  commentText?: string
}

/** 经验有效性评估记录 - 对应 ExperienceEffectivenessEval */
export interface ExperienceEffectivenessEvalResponse {
  id: string
  experienceCaseId?: string
  evalExamId?: string
  sourceExamName?: string
  sourceExamNo?: string
  evalExamName?: string
  evalExamNo?: string
  experienceSummary?: string
  questionType: QuestionTypeCode
  aiTraceId?: string
  evalSummary?: string
  detailedAnalysis?: string
  consistencyRate?: number
  reuseCount?: number
  recommendation?: ExperienceRecommendationCode
  evidenceItems?: ExperienceEffectivenessEvalEvidenceResponse[]
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/**
 * 生成校级质量分析（POST + body，参数 ≥ 3 个，按 nybc-practice 风格使用 DTO）
 * POST /api/exam/school-quality/analysis/generate
 */
export function generateQualityAnalysis(params: {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId?: string
  academicYear?: string
  semester?: SemesterCode
  examIds: string[]
}): Promise<SchoolQualityAnalysisResponse> {
  return http.post<SchoolQualityAnalysisResponse>('/api/exam/school-quality/analysis/generate', params)
}

/**
 * 查询校级质量分析历史列表
 * POST /api/exam/school-quality/analysis/list
 */
export function listQualityAnalysis(params: {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId?: string
  academicYear?: string
  semester?: SemesterCode
}): Promise<SchoolQualityAnalysisResponse[]> {
  return http.post<SchoolQualityAnalysisResponse[]>('/api/exam/school-quality/analysis/list', params)
}

export function evaluateExperienceEffectiveness(params: {
  experienceCaseId: string
  evalExamId: string
}): Promise<ExperienceEffectivenessEvalResponse> {
  return http.post<ExperienceEffectivenessEvalResponse>(
    '/api/exam/school-quality/experience-eval/generate',
    params,
  )
}

export function listExperienceEvals(
  experienceCaseId: string,
): Promise<ExperienceEffectivenessEvalResponse[]> {
  return http.post<ExperienceEffectivenessEvalResponse[]>(
    '/api/exam/school-quality/experience-eval/list',
    { id: experienceCaseId },
  )
}
