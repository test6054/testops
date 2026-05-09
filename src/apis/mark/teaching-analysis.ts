/**
 * AI 教学分析 API - 对接 edu-mark 模块 TeachingAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/teaching-analysis
 * - 写操作（生成）为 POST + @RequestParam，查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

/** 教学分析类型 */
export type TeachingAnalysisTypeCode = 'TEACHING_IMPROVEMENT' | 'CLASS_WEAKNESS'

/** 分析范围类型 */
export type AnalysisScopeTypeCode = 'EXAM' | 'CLASS'

/** AI 分析状态 */
export type AiAnalysisStatusCode = 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED'

/** 教学分析类型文案映射 */
export const TEACHING_ANALYSIS_TYPE_LABEL: Record<TeachingAnalysisTypeCode, string> = {
  TEACHING_IMPROVEMENT: '教学改进建议',
  CLASS_WEAKNESS: '班级薄弱题型',
}

/** 教学分析类型徽标颜色 */
export const TEACHING_ANALYSIS_TYPE_COLOR: Record<TeachingAnalysisTypeCode, string> = {
  TEACHING_IMPROVEMENT: 'blue',
  CLASS_WEAKNESS: 'orange',
}

/** AI 分析状态文案映射 */
export const AI_ANALYSIS_STATUS_LABEL: Record<AiAnalysisStatusCode, string> = {
  PENDING: '处理中',
  SUCCESS: '成功',
  FAILED: '失败',
  BLOCKED: '已阻断',
}

/** AI 分析状态徽标颜色 */
export const AI_ANALYSIS_STATUS_COLOR: Record<AiAnalysisStatusCode, string> = {
  PENDING: 'orange',
  SUCCESS: 'green',
  FAILED: 'red',
  BLOCKED: 'volcano',
}

/** AI 教学分析记录 - 对应 ExamTeachingAnalysisRecord */
export interface ExamTeachingAnalysisRecordVO {
  id: string
  tenantId?: string
  examId: string
  analysisType?: TeachingAnalysisTypeCode
  scopeType?: AnalysisScopeTypeCode
  scopeId?: string
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  overallSummary?: string
  improvementItems?: string
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/**
 * 生成教学改进建议
 * POST /api/exam/teaching-analysis/improvement/generate?examId=
 */
export function generateTeachingImprovement(examId: string): Promise<ExamTeachingAnalysisRecordVO> {
  return http.post<ExamTeachingAnalysisRecordVO>(
    `/api/exam/teaching-analysis/improvement/generate?examId=${encodeURIComponent(examId)}`,
  )
}

/**
 * 查询最新教学改进建议
 * GET /api/exam/teaching-analysis/improvement/latest
 */
export function getLatestTeachingImprovement(
  examId: string,
): Promise<ExamTeachingAnalysisRecordVO | null> {
  return http.get<ExamTeachingAnalysisRecordVO | null>(
    '/api/exam/teaching-analysis/improvement/latest',
    { params: { examId } },
  )
}

/**
 * 生成班级薄弱题型分析
 * POST /api/exam/teaching-analysis/class-weakness/generate?examId=&classId=
 */
export function generateClassWeaknessAnalysis(params: {
  examId: string
  classId: string
}): Promise<ExamTeachingAnalysisRecordVO> {
  const search = new URLSearchParams({
    examId: params.examId,
    classId: params.classId,
  }).toString()
  return http.post<ExamTeachingAnalysisRecordVO>(
    `/api/exam/teaching-analysis/class-weakness/generate?${search}`,
  )
}

/**
 * 查询最新班级薄弱题型分析
 * GET /api/exam/teaching-analysis/class-weakness/latest
 */
export function getLatestClassWeaknessAnalysis(params: {
  examId: string
  classId: string
}): Promise<ExamTeachingAnalysisRecordVO | null> {
  return http.get<ExamTeachingAnalysisRecordVO | null>(
    '/api/exam/teaching-analysis/class-weakness/latest',
    { params },
  )
}

/**
 * 查询教学分析记录列表
 * GET /api/exam/teaching-analysis/list
 */
export function listTeachingAnalysis(params: {
  examId: string
  analysisType?: TeachingAnalysisTypeCode
}): Promise<ExamTeachingAnalysisRecordVO[]> {
  return http.get<ExamTeachingAnalysisRecordVO[]>('/api/exam/teaching-analysis/list', { params })
}
