import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { AnalysisScopeTypeCode } from './analysis-scope-type'
import type { FinalScoreStatusCode } from './final-score-status'
import type { QuestionTypeCode } from './question-type'
import type { MasteryLevelCode } from './student-mastery-level'
/**
 * AI 教学分析 API - 对接 edu-mark 模块 TeachingAnalysisController
 *
 * 后端规则：
 * - 路径前缀 /api/exam/teaching-analysis
 * - 写操作与查询均为 POST + 请求体 DTO
 * - 后端 Long ID 统一用 string 表达到前端
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'
import { TeachingAnalysisTypeCode } from '@/types/enums/teaching-analysis-type-enum'
import { TeachingImprovementSeverityCode } from '@/types/enums/teaching-improvement-severity-enum'

export {
  ALL_TEACHING_ANALYSIS_TYPE_CODES,
  TeachingAnalysisTypeCode,
  TeachingAnalysisTypeDescription,
} from '@/types/enums/teaching-analysis-type-enum'

export {
  ALL_TEACHING_IMPROVEMENT_SEVERITY_CODES,
  TeachingImprovementSeverityCode,
  TeachingImprovementSeverityDescription,
} from '@/types/enums/teaching-improvement-severity-enum'

/** 教学改进严重程度徽标颜色 */
export const TEACHING_IMPROVEMENT_SEVERITY_TONE: Record<
  TeachingImprovementSeverityCode,
  BadgeTone
> = {
  [TeachingImprovementSeverityCode.HIGH]: 'red',
  [TeachingImprovementSeverityCode.MEDIUM]: 'orange',
  [TeachingImprovementSeverityCode.LOW]: 'blue',
}

/** 教学分析类型徽标颜色 */
export const TEACHING_ANALYSIS_TYPE_TONE: Record<TeachingAnalysisTypeCode, BadgeTone> = {
  [TeachingAnalysisTypeCode.TEACHING_IMPROVEMENT]: 'blue',
  [TeachingAnalysisTypeCode.CLASS_WEAKNESS]: 'orange',
  [TeachingAnalysisTypeCode.STUDENT_LEARNING_PROFILE]: 'purple',
}

/** 教学改进内容条目 */
export interface TeachingImprovementItemVO {
  questionType: QuestionTypeCode
  problemDescription?: string
  severity?: TeachingImprovementSeverityCode
  suggestion?: string
  evidenceSummary?: string
}

/** 班级薄弱题型条目 */
export interface ClassWeaknessItemVO {
  questionType: QuestionTypeCode
  rank?: number
  avgScoreRate?: number
  errorRate?: number
  affectedStudentCount?: number
  causeAnalysis?: string
  suggestion?: string
}

/** 学生学情诊断条目 */
export interface StudentLearningDiagnosisItemVO {
  questionType: QuestionTypeCode
  masteryLevel: MasteryLevelCode
  scoreRate: string
  lostQuestionNos?: string[]
  causeAnalysis?: string
  suggestion?: string
}

/** 学生学情成绩构成 */
export interface StudentLearningScoreCompositionVO {
  classId?: string
  paperFullScore?: number
  dailyScoreFull?: number
  examScore?: number
  dailyScore?: number
  totalScore?: number
  finalScoreStatus?: FinalScoreStatusCode
  classAvgExamScore?: number
  classAvgDailyScore?: number
  classAvgTotalScore?: number
}

/** AI 教学分析记录 - 对应 ExamTeachingAnalysisRecord */
export interface ExamTeachingAnalysisRecordVO {
  id: string
  examId: string
  analysisType?: TeachingAnalysisTypeCode
  scopeType?: AnalysisScopeTypeCode
  scopeId?: string
  aiTraceId?: string
  overallSummary?: string
  improvementItems?: TeachingImprovementItemVO[]
  weaknessItems?: ClassWeaknessItemVO[]
  diagnosisItems?: StudentLearningDiagnosisItemVO[]
  scoreComposition?: StudentLearningScoreCompositionVO
  suggestions?: string[]
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

export interface ExamClassScopeQueryRequest {
  examId: string
  classId?: string
}

export interface ExamStudentScopeQueryRequest {
  examId: string
  studentUserId: string
}

export function generateTeachingImprovement(
  request: ExamClassScopeQueryRequest,
): Promise<ExamTeachingAnalysisRecordVO> {
  return http.post<ExamTeachingAnalysisRecordVO>(
    '/api/exam/teaching-analysis/improvement/generate',
    request,
  )
}

export function getLatestTeachingImprovement(
  request: ExamClassScopeQueryRequest,
): Promise<ExamTeachingAnalysisRecordVO | null> {
  return http.post<ExamTeachingAnalysisRecordVO | null>(
    '/api/exam/teaching-analysis/improvement/latest',
    request,
  )
}

export function generateClassWeaknessAnalysis(request: {
  examId: string
  classId: string
}): Promise<ExamTeachingAnalysisRecordVO> {
  return http.post<ExamTeachingAnalysisRecordVO>(
    '/api/exam/teaching-analysis/class-weakness/generate',
    request,
  )
}

export function getLatestClassWeaknessAnalysis(params: {
  examId: string
  classId: string
}): Promise<ExamTeachingAnalysisRecordVO | null> {
  return http.post<ExamTeachingAnalysisRecordVO | null>(
    '/api/exam/teaching-analysis/class-weakness/latest',
    params,
  )
}

export function generateStudentLearningProfile(
  request: ExamStudentScopeQueryRequest,
): Promise<ExamTeachingAnalysisRecordVO> {
  return http.post<ExamTeachingAnalysisRecordVO>(
    '/api/exam/teaching-analysis/student-profile/generate',
    request,
  )
}

export function getLatestStudentLearningProfile(
  request: ExamStudentScopeQueryRequest,
): Promise<ExamTeachingAnalysisRecordVO | null> {
  return http.post<ExamTeachingAnalysisRecordVO | null>(
    '/api/exam/teaching-analysis/student-profile/latest',
    request,
  )
}
