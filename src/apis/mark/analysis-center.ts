import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export interface AiAnalysisCenterOverviewRequest {
  academicYear: string
  semester: SemesterCode
  courseId?: string
  classId?: string
  referenceDepartmentId?: string
  examId?: string
}

/** AI 分析中心错因聚类 Tab KPI，与后端 AiAnalysisClusterSignalResponse 逐字段对应 */
export interface AiAnalysisClusterSignalResponse {
  totalLayoutQuestionCount?: number
  layoutRoiGapCount?: number
  clusterAnalysisReady?: boolean
  errorCauseTypeCount?: number
  questionQualityAnalyzedCount?: number
  lowDiscriminationQuestionCount?: number
  idealZoneQuestionCount?: number
  nonIdealZoneQuestionCount?: number
  pendingRejudgePlanCount?: number
  approvedRejudgePlanCount?: number
  executingRejudgePlanCount?: number
  courseGoalMappedQuestionCount?: number
  unmappedQuestionCount?: number
  courseGoalConfigured?: boolean
}

export interface AiAnalysisCenterOverviewResponse {
  scopedExamCount?: number
  scopedCourseCount?: number
  examSelected?: boolean
  selectedExamName?: string
  clusterSignal?: AiAnalysisClusterSignalResponse
}

export function loadAiAnalysisCenterOverview(request: AiAnalysisCenterOverviewRequest) {
  return http.post<AiAnalysisCenterOverviewResponse>(
    '/api/exam/ai-analysis-center/overview',
    request,
  )
}
