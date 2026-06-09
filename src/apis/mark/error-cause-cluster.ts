import type { QuestionTypeCode } from './grading-experience'
import type { AiAnalysisStatusCode, AnalysisScopeTypeCode } from './teaching-analysis'

/**
 * AI 错因聚类分析 API - 对接 edu-mark 模块 ErrorCauseClusterController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/error-cause-cluster
 * - 写操作（生成）为 POST + @RequestParam，查询为 GET
 * - 后端 Long ID 统一用 string 表达到前端
 */
import http from '@/config/axios'

/** 错因聚类条目 */
export interface ErrorCauseClusterItemVO {
  causeName?: string
  causeDescription?: string
  affectedCount?: number
  proportion?: number
  typicalExamples?: string[]
  questionType?: QuestionTypeCode
  suggestion?: string
}

/** 错因聚类分析记录 - 对应 ExamErrorCauseCluster */
export interface ExamErrorCauseClusterVO {
  id: string
  examId?: string
  questionTemplateId?: string
  scopeType?: AnalysisScopeTypeCode
  scopeId?: string
  aiTraceId?: string
  overallSummary?: string
  clusterItems?: ErrorCauseClusterItemVO[]
  clusterCount?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/**
 * 生成错因聚类分析
 * POST /api/exam/error-cause-cluster/generate?examId=&classId=
 */
export function generateErrorCauseCluster(
  examId: string,
  classId?: string,
): Promise<ExamErrorCauseClusterVO> {
  const search = new URLSearchParams({ examId })
  if (classId) search.set('classId', classId)
  return http.post<ExamErrorCauseClusterVO>(
    `/api/exam/error-cause-cluster/generate?${search}`,
  )
}

/**
 * 查询最新错因聚类分析
 * GET /api/exam/error-cause-cluster/latest?examId=&classId=
 */
export function getLatestErrorCauseCluster(
  examId: string,
  classId?: string,
): Promise<ExamErrorCauseClusterVO | null> {
  return http.get<ExamErrorCauseClusterVO | null>(
    '/api/exam/error-cause-cluster/latest',
    { params: { examId, classId } },
  )
}
