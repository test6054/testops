import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisExamScopeVO, ExamStatSnapshotVO } from './cross-exam-analysis'
import type { QuestionTypeCode } from './question-type'

/**
 * AI 校级质量分析 API - 对接 edu-mark 模块 SchoolQualityAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/school-quality
 * - 写操作（生成/评估）为 POST + @RequestParam（List 用重复 key），查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

/** 校级质量分析维度 */
export type SchoolQualityDimensionCode = 'COURSE' | 'CLASS' | 'SEMESTER'

/** 校级质量评价编码 */
export type SchoolQualityRatingCode = 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR'

/** 校级质量分析维度文案映射 */
export const SCHOOL_QUALITY_DIMENSION_LABEL: Record<SchoolQualityDimensionCode, string> = {
  COURSE: '课程维度',
  CLASS: '班级维度',
  SEMESTER: '学期维度',
}

/** 校级质量评价文案 - 与后端 SchoolQualityRating 完整一致 */
export const SCHOOL_QUALITY_RATING_LABEL: Record<SchoolQualityRatingCode, string> = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  ACCEPTABLE: '可接受',
  POOR: '较差',
}

/** 校级质量评价颜色 */
export const SCHOOL_QUALITY_RATING_TONE: Record<SchoolQualityRatingCode, BadgeTone> = {
  EXCELLENT: 'green',
  GOOD: 'blue',
  ACCEPTABLE: 'orange',
  POOR: 'red',
}

/** 校级质量分项维度 - 与 AI prompt school-quality-system.st 一致 */
export type SchoolQualityItemDimensionCode = 'TEACHING' | 'QUESTION_DESIGN' | 'SCORE_DISTRIBUTION'

/** 校级质量分项维度文案 */
export const SCHOOL_QUALITY_ITEM_DIMENSION_LABEL: Record<SchoolQualityItemDimensionCode, string> = {
  TEACHING: '教学质量',
  QUESTION_DESIGN: '命题质量',
  SCORE_DISTRIBUTION: '成绩分布',
}

/** 经验维护动作 - 与 AI prompt experience-effectiveness-system.st 一致 */
export type ExperienceRecommendationCode = 'KEEP' | 'UPDATE' | 'DEPRECATE'

/** 经验维护动作文案 */
export const EXPERIENCE_RECOMMENDATION_LABEL: Record<ExperienceRecommendationCode, string> = {
  KEEP: '维持',
  UPDATE: '更新',
  DEPRECATE: '废弃',
}

/** 校级质量分析条目 */
export interface SchoolQualityItemVO {
  qualityDimension?: SchoolQualityItemDimensionCode
  metricName?: string
  metricValue?: number
  rating?: SchoolQualityRatingCode
  description?: string
  baselineComparison?: string
  suggestion?: string
}

/** 校级质量分析记录 - 对应 SchoolQualityAnalysis */
export interface SchoolQualityAnalysisVO {
  id: string
  analysisDimension: SchoolQualityDimensionCode
  dimensionId?: string
  dimensionName?: string
  semesterCode?: string
  exams?: AnalysisExamScopeVO[]
  examCount?: number
  aiTraceId?: string
  qualitySummary?: string
  qualityItems?: SchoolQualityItemVO[]
  examStatSnapshots?: ExamStatSnapshotVO[]
  teachingQualityScore?: number
  questionQualityScore?: number
  markingQualityScore?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/** 经验有效性评估记录 - 对应 ExperienceEffectivenessEval */
export interface ExperienceEffectivenessEvalVO {
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
  consistencyRate?: number
  reuseCount?: number
  driftDetected?: boolean
  driftDescription?: string
  recommendation?: ExperienceRecommendationCode
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
  semesterCode?: string
  examIds: string[]
}): Promise<SchoolQualityAnalysisVO> {
  return http.post<SchoolQualityAnalysisVO>(
    '/api/exam/school-quality/analysis/generate',
    params,
  )
}

/**
 * 查询校级质量分析历史列表
 * GET /api/exam/school-quality/analysis/list
 */
export function listQualityAnalysis(params: {
  analysisDimension: SchoolQualityDimensionCode
  semesterCode?: string
}): Promise<SchoolQualityAnalysisVO[]> {
  return http.post<SchoolQualityAnalysisVO[]>(
    '/api/exam/school-quality/analysis/list',
    params,
  )
}

export function evaluateExperienceEffectiveness(params: {
  experienceCaseId: string
  evalExamId: string
}): Promise<ExperienceEffectivenessEvalVO> {
  return http.post<ExperienceEffectivenessEvalVO>(
    '/api/exam/school-quality/experience-eval/generate',
    params,
  )
}

export function listExperienceEvals(experienceCaseId: string): Promise<ExperienceEffectivenessEvalVO[]> {
  return http.post<ExperienceEffectivenessEvalVO[]>(
    '/api/exam/school-quality/experience-eval/list',
    { id: experienceCaseId },
  )
}
