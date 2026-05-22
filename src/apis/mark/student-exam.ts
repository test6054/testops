import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

export type FinalScoreStatusCode
  = | 'PENDING'
    | 'CALCULATED'
    | 'CONFIRMED'
    | 'CORRECTED'
    | 'PUBLISHED'
    | 'WITHDRAWN'

export const FINAL_SCORE_STATUS_LABEL: Record<FinalScoreStatusCode, string> = {
  PENDING: '待计算',
  CALCULATED: '已计算',
  CONFIRMED: '已确认',
  CORRECTED: '已更正',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
}

export const FINAL_SCORE_STATUS_COLOR: Record<FinalScoreStatusCode, BadgeTone> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'purple',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

export const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, BadgeTone> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'purple',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

export type StudentReviewWindowStatusCode = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export type AiAnalysisStatusCode = 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED'

export const AI_ANALYSIS_STATUS_LABEL: Record<AiAnalysisStatusCode, string> = {
  PENDING: '处理中',
  SUCCESS: '成功',
  FAILED: '失败',
  BLOCKED: '已阻断',
}

export const AI_ANALYSIS_STATUS_COLOR: Record<AiAnalysisStatusCode, BadgeTone> = {
  PENDING: 'orange',
  SUCCESS: 'green',
  FAILED: 'red',
  BLOCKED: 'red',
}

export interface StudentExamItemVO {
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  examId: string
  examName?: string
  examNo?: string
  examStatus?: string
  courseId?: string
  examStartTime?: string
  examEndTime?: string
  paperInstanceId?: string
  bindingStatus?: string
  finalScoreId?: string
  finalScoreStatus?: FinalScoreStatusCode
  finalScore?: number
  publishedTime?: string
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus?: StudentReviewWindowStatusCode
}

export interface StudentQuestionScoreVO {
  questionTemplateId: string
  questionNo?: string
  questionType?: string
  fullScore?: number
  finalScore?: number
  gradeStatus?: string
  objectiveResult?: string
  /** 学生端 AI 改进建议，整卷 AI 批阅生成并随教师确认保留 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签，用于错题本快速归类 */
  mistakeClusterLabel?: string
}

export interface StudentScoreDetailVO {
  examId: string
  examName?: string
  examNo?: string
  examStatus?: string
  courseId?: string
  examStartTime?: string
  examEndTime?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  paperInstanceId?: string
  finalScoreId?: string
  finalScoreStatus?: FinalScoreStatusCode
  totalScore?: number
  fullScore?: number
  publishedTime?: string
  questions?: StudentQuestionScoreVO[]
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus?: StudentReviewWindowStatusCode
}

export interface StudentAiDiagnosisItemVO {
  questionType?: string
  masteryLevel?: 'EXCELLENT' | 'GOOD' | 'MEDIUM' | 'WEAK' | 'CRITICAL'
  scoreRate?: string
  lostQuestionNos?: string[]
  causeAnalysis?: string
  suggestion?: string
}

export interface StudentAiErrorClusterVO {
  causeName?: string
  causeDescription?: string
  affectedCount?: number
  typicalExamples?: string[]
  questionType?: string
  suggestion?: string
}

export interface StudentAiLearningReportVO {
  examId: string
  published: boolean
  available: boolean
  profileStatus?: AiAnalysisStatusCode
  clusterStatus?: AiAnalysisStatusCode
  profileMessage?: string
  clusterMessage?: string
  overallSummary?: string
  errorClusterSummary?: string
  diagnosisItems?: StudentAiDiagnosisItemVO[]
  improvementSuggestions?: string[]
  errorClusters?: StudentAiErrorClusterVO[]
}

export function listMyExams(): Promise<StudentExamItemVO[]> {
  return http.get<StudentExamItemVO[]>('/api/mark/student/exams/list')
}

export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailVO> {
  return http.get<StudentScoreDetailVO>('/api/mark/student/exams/score-detail', {
    params: { examId },
  })
}

export function getMyAiLearningReport(examId: string): Promise<StudentAiLearningReportVO> {
  return http.get<StudentAiLearningReportVO>('/api/mark/student/exams/ai-learning-report', {
    params: { examId },
  })
}

export function canSubmitReview(item: StudentExamItemVO | StudentScoreDetailVO): boolean {
  if (item.finalScoreStatus !== 'PUBLISHED') {
    return false
  }
  if (item.reviewWindowStatus !== 'ACTIVE') {
    return false
  }
  if (!item.reviewWindowOpenTime || !item.reviewWindowCloseTime) {
    return false
  }
  const now = Date.now()
  const open = new Date(item.reviewWindowOpenTime).getTime()
  const close = new Date(item.reviewWindowCloseTime).getTime()
  return now >= open && now <= close
}
