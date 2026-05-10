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

/** 错因聚类分析记录 - 对应 ExamErrorCauseCluster */
export interface ExamErrorCauseClusterVO {
  id: string
  tenantId?: string
  examId?: string
  questionTemplateId?: string
  scopeType?: AnalysisScopeTypeCode
  scopeId?: string
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  overallSummary?: string
  clusterItems?: string
  clusterCount?: number
  analysisStatus?: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
  updateTime?: string
}

/**
 * 生成考试维度的错因聚类分析
 * POST /api/exam/error-cause-cluster/generate?examId=
 */
export function generateErrorCauseCluster(examId: string): Promise<ExamErrorCauseClusterVO> {
  return http.post<ExamErrorCauseClusterVO>(
    `/api/exam/error-cause-cluster/generate?examId=${encodeURIComponent(examId)}`,
  )
}

/**
 * 查询最新错因聚类分析
 * GET /api/exam/error-cause-cluster/latest?examId=
 */
export function getLatestErrorCauseCluster(examId: string): Promise<ExamErrorCauseClusterVO | null> {
  return http.get<ExamErrorCauseClusterVO | null>(
    '/api/exam/error-cause-cluster/latest',
    { params: { examId } },
  )
}

/**
 * 查询错因聚类分析历史列表
 * GET /api/exam/error-cause-cluster/list?examId=
 */
export function listErrorCauseClusters(examId: string): Promise<ExamErrorCauseClusterVO[]> {
  return http.get<ExamErrorCauseClusterVO[]>(
    '/api/exam/error-cause-cluster/list',
    { params: { examId } },
  )
}
