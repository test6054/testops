import type { AiAnalysisStatusCode } from './teaching-analysis'

/**
 * AI 校级质量分析 API - 对接 edu-mark 模块 SchoolQualityAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/school-quality
 * - 写操作（生成/评估）为 POST + @RequestParam（List 用重复 key），查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

/** 校级质量分析维度 */
export type SchoolQualityDimensionCode = 'COURSE' | 'TEACHER' | 'CLASS' | 'COLLEGE' | 'SEMESTER'

/** 校级质量分析维度文案映射 */
export const SCHOOL_QUALITY_DIMENSION_LABEL: Record<SchoolQualityDimensionCode, string> = {
  COURSE: '课程维度',
  TEACHER: '教师维度',
  CLASS: '班级维度',
  COLLEGE: '学院维度',
  SEMESTER: '学期维度',
}

/** 校级质量分析记录 - 对应 SchoolQualityAnalysis */
export interface SchoolQualityAnalysisVO {
  id: string
  tenantId?: string
  analysisDimension?: SchoolQualityDimensionCode
  dimensionId?: string
  dimensionName?: string
  semesterCode?: string
  examIds?: string
  examCount?: number
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  qualitySummary?: string
  qualityItems?: string
  teachingQualityScore?: number
  questionQualityScore?: number
  markingQualityScore?: number
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/** 经验有效性评估记录 - 对应 ExperienceEffectivenessEval */
export interface ExperienceEffectivenessEvalVO {
  id: string
  tenantId?: string
  experienceCaseId?: string
  evalExamId?: string
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  evalSummary?: string
  consistencyRate?: number
  reuseCount?: number
  driftDetected?: boolean
  driftDescription?: string
  recommendation?: string
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/**
 * 生成校级质量分析（POST + body，参数 ≥ 3 个，按 nybc-practice 风格使用 DTO）
 * POST /api/exam/school-quality/analysis/generate
 */
export function generateQualityAnalysis(params: {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId?: string
  dimensionName?: string
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
  return http.get<SchoolQualityAnalysisVO[]>(
    '/api/exam/school-quality/analysis/list',
    { params },
  )
}

/**
 * 评估经验案例的有效性
 * POST /api/exam/school-quality/experience-eval/generate?experienceCaseId=&evalExamId=
 */
export function evaluateExperienceEffectiveness(params: {
  experienceCaseId: string
  evalExamId: string
}): Promise<ExperienceEffectivenessEvalVO> {
  const search = new URLSearchParams({
    experienceCaseId: params.experienceCaseId,
    evalExamId: params.evalExamId,
  }).toString()
  return http.post<ExperienceEffectivenessEvalVO>(
    `/api/exam/school-quality/experience-eval/generate?${search}`,
  )
}

/**
 * 查询经验有效性评估历史列表
 * GET /api/exam/school-quality/experience-eval/list?experienceCaseId=
 */
export function listExperienceEvals(experienceCaseId: string): Promise<ExperienceEffectivenessEvalVO[]> {
  return http.get<ExperienceEffectivenessEvalVO[]>(
    '/api/exam/school-quality/experience-eval/list',
    { params: { experienceCaseId } },
  )
}
