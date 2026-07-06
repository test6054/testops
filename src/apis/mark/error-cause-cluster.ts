import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisScopeTypeCode } from './analysis-scope-type'
import type { QuestionTypeCode } from './question-type'
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
export interface ErrorCauseClusterResponse {
  id: string
  examId?: string
  layoutQuestionId?: string
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

export interface ExamClassScopeQueryRequest {
  examId: string
  classId?: string
}

export function generateErrorCauseCluster(
  request: ExamClassScopeQueryRequest,
): Promise<ErrorCauseClusterResponse> {
  return http.post<ErrorCauseClusterResponse>('/api/exam/error-cause-cluster/generate', request)
}

export function getLatestErrorCauseCluster(
  request: ExamClassScopeQueryRequest,
): Promise<ErrorCauseClusterResponse | null> {
  return http.post<ErrorCauseClusterResponse | null>('/api/exam/error-cause-cluster/latest', request)
}
