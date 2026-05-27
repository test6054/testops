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

export const STUDENT_REVIEW_WINDOW_STATUS_LABEL: Record<StudentReviewWindowStatusCode, string> = {
  DRAFT: '未开放',
  ACTIVE: '已开放',
  CLOSED: '已关闭',
}

export const STUDENT_REVIEW_WINDOW_STATUS_TONE: Record<StudentReviewWindowStatusCode, BadgeTone> = {
  DRAFT: 'gray',
  ACTIVE: 'orange',
  CLOSED: 'gray',
}

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

export type GradeStatusCode = 'PENDING' | 'NEED_REVIEW' | 'CONFIRMED'

export const GRADE_STATUS_LABEL: Record<GradeStatusCode, string> = {
  PENDING: '待批改',
  NEED_REVIEW: '待复核',
  CONFIRMED: '已确认',
}

export const GRADE_STATUS_TONE: Record<GradeStatusCode, BadgeTone> = {
  PENDING: 'gray',
  NEED_REVIEW: 'orange',
  CONFIRMED: 'green',
}

export type ObjectiveResultCode = 'CORRECT' | 'WRONG' | 'NEED_REVIEW'

export const OBJECTIVE_RESULT_LABEL: Record<ObjectiveResultCode, string> = {
  CORRECT: '正确',
  WRONG: '错误',
  NEED_REVIEW: '待复核',
}

export const OBJECTIVE_RESULT_TONE: Record<ObjectiveResultCode, BadgeTone> = {
  CORRECT: 'green',
  WRONG: 'red',
  NEED_REVIEW: 'orange',
}

export type MasteryLevelCode = 'EXCELLENT' | 'GOOD' | 'MEDIUM' | 'WEAK' | 'CRITICAL'

export const MASTERY_LEVEL_LABEL: Record<MasteryLevelCode, string> = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  MEDIUM: '中等',
  WEAK: '薄弱',
  CRITICAL: '危急',
}

export const MASTERY_LEVEL_TONE: Record<MasteryLevelCode, BadgeTone> = {
  EXCELLENT: 'green',
  GOOD: 'blue',
  MEDIUM: 'blue',
  WEAK: 'orange',
  CRITICAL: 'red',
}

export interface StudentExamItemVO {
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
  examId: string
  examName: string
  examNo: string
  examStatus: string
  courseId?: string
  examStartTime: string
  examEndTime: string
  paperInstanceId?: string
  bindingStatus?: string
  finalScoreId?: string
  finalScoreStatus: FinalScoreStatusCode
  finalScore?: number
  publishedTime?: string
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus: StudentReviewWindowStatusCode
}

export interface StudentQuestionScoreVO {
  questionTemplateId: string
  questionNo: string
  questionType: string
  fullScore: number
  finalScore?: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 学生端 AI 改进建议，整卷 AI 批阅生成并随教师确认保留 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签，用于错题本快速归类 */
  mistakeClusterLabel?: string
}

export interface StudentScoreDetailVO {
  examId: string
  examName: string
  examNo: string
  examStatus: string
  courseId?: string
  examStartTime: string
  examEndTime: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  paperInstanceId?: string
  finalScoreId?: string
  finalScoreStatus: FinalScoreStatusCode
  totalScore?: number
  fullScore?: number
  publishedTime?: string
  questions: StudentQuestionScoreVO[]
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus: StudentReviewWindowStatusCode
}

export interface StudentAiDiagnosisItemVO {
  questionType: string
  masteryLevel: MasteryLevelCode
  scoreRate: string
  lostQuestionNos?: string[]
  causeAnalysis?: string
  suggestion?: string
}

export interface StudentAiErrorClusterVO {
  causeName: string
  causeDescription: string
  affectedCount: number
  typicalExamples: string[]
  questionType: string
  suggestion: string
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
  return http.get<unknown>('/api/mark/student/exams/list')
    .then(validateStudentExamList)
}

export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailVO> {
  return http.get<StudentScoreDetailVO>('/api/mark/student/exams/score-detail', {
    params: { examId },
  })
}

export function getMyAiLearningReport(examId: string): Promise<StudentAiLearningReportVO> {
  return http.get<unknown>('/api/mark/student/exams/ai-learning-report', {
    params: { examId },
  }).then(validateStudentAiLearningReport)
}

export function canSubmitReview(item: StudentExamItemVO | StudentScoreDetailVO): boolean {
  if (item.finalScoreStatus !== 'PUBLISHED') {
    return false
  }
  if (item.reviewWindowStatus !== 'ACTIVE') {
    return false
  }
  if (!item.reviewWindowOpenTime || !item.reviewWindowCloseTime) {
    throw new Error('复核窗口已开放但缺少开放时间或关闭时间')
  }
  const now = Date.now()
  const open = new Date(item.reviewWindowOpenTime).getTime()
  const close = new Date(item.reviewWindowCloseTime).getTime()
  return now >= open && now <= close
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireFinalScoreStatus(value: unknown, fieldName: string): FinalScoreStatusCode {
  if (
    value !== 'PENDING'
    && value !== 'CALCULATED'
    && value !== 'CONFIRMED'
    && value !== 'CORRECTED'
    && value !== 'PUBLISHED'
    && value !== 'WITHDRAWN'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireReviewWindowStatus(
  value: unknown,
  fieldName: string,
): StudentReviewWindowStatusCode {
  if (value !== 'DRAFT' && value !== 'ACTIVE' && value !== 'CLOSED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireAiAnalysisStatus(value: unknown, fieldName: string): AiAnalysisStatusCode {
  if (value !== 'PENDING' && value !== 'SUCCESS' && value !== 'FAILED' && value !== 'BLOCKED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireMasteryLevel(value: unknown, fieldName: string): MasteryLevelCode {
  if (
    value !== 'EXCELLENT'
    && value !== 'GOOD'
    && value !== 'MEDIUM'
    && value !== 'WEAK'
    && value !== 'CRITICAL'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalAiAnalysisStatus(
  value: unknown,
  fieldName: string,
): AiAnalysisStatusCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requireAiAnalysisStatus(value, fieldName)
}

function optionalFiniteNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value.map((item, index) => requireString(item, `${fieldName}[${index}]`))
}

function optionalStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  return requireStringArray(value, fieldName)
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value as Record<string, unknown>
}

function validateStudentExam(value: unknown): StudentExamItemVO {
  const result = requireObject(value, '学生考试列表项')
  return {
    candidateRosterId: requireString(result.candidateRosterId, '考生名册 ID'),
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    studentNo: requireString(result.studentNo, '学号'),
    studentName: requireString(result.studentName, '学生姓名'),
    classId: optionalString(result.classId, '班级 ID'),
    examId: requireString(result.examId, '考试 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: requireString(result.examNo, '考试编号'),
    examStatus: requireString(result.examStatus, '考试状态'),
    courseId: optionalString(result.courseId, '课程 ID'),
    examStartTime: requireString(result.examStartTime, '考试开始时间'),
    examEndTime: requireString(result.examEndTime, '考试结束时间'),
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    bindingStatus: optionalString(result.bindingStatus, '绑定状态'),
    finalScoreId: optionalString(result.finalScoreId, '最终成绩 ID'),
    finalScoreStatus: requireFinalScoreStatus(result.finalScoreStatus, '最终成绩状态'),
    finalScore: optionalFiniteNumber(result.finalScore, '最终成绩'),
    publishedTime: optionalString(result.publishedTime, '发布时间'),
    reviewWindowOpenTime: optionalString(result.reviewWindowOpenTime, '复核窗口开始时间'),
    reviewWindowCloseTime: optionalString(result.reviewWindowCloseTime, '复核窗口结束时间'),
    reviewWindowStatus: requireReviewWindowStatus(result.reviewWindowStatus, '复核窗口状态'),
  }
}

function validateStudentExamList(value: unknown): StudentExamItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('学生考试列表接口返回格式错误')
  }
  return value.map(validateStudentExam)
}

function validateDiagnosisItem(value: unknown, index: number): StudentAiDiagnosisItemVO {
  const result = requireObject(value, `AI 诊断条目[${index}]`)
  return {
    questionType: requireString(result.questionType, `AI 诊断条目[${index}].questionType`),
    masteryLevel: requireMasteryLevel(result.masteryLevel, `AI 诊断条目[${index}].masteryLevel`),
    scoreRate: requireString(result.scoreRate, `AI 诊断条目[${index}].scoreRate`),
    lostQuestionNos: optionalStringArray(result.lostQuestionNos, `AI 诊断条目[${index}].lostQuestionNos`),
    causeAnalysis: optionalString(result.causeAnalysis, `AI 诊断条目[${index}].causeAnalysis`),
    suggestion: optionalString(result.suggestion, `AI 诊断条目[${index}].suggestion`),
  }
}

function validateErrorCluster(value: unknown, index: number): StudentAiErrorClusterVO {
  const result = requireObject(value, `AI 错题聚类[${index}]`)
  return {
    causeName: requireString(result.causeName, `AI 错题聚类[${index}].causeName`),
    causeDescription: requireString(
      result.causeDescription,
      `AI 错题聚类[${index}].causeDescription`,
    ),
    affectedCount: requireFiniteNumber(result.affectedCount, `AI 错题聚类[${index}].affectedCount`),
    typicalExamples: requireStringArray(
      result.typicalExamples,
      `AI 错题聚类[${index}].typicalExamples`,
    ),
    questionType: requireString(result.questionType, `AI 错题聚类[${index}].questionType`),
    suggestion: requireString(result.suggestion, `AI 错题聚类[${index}].suggestion`),
  }
}

function validateStudentAiLearningReport(value: unknown): StudentAiLearningReportVO {
  const result = requireObject(value, '学生 AI 学习报告')
  if (!Array.isArray(result.diagnosisItems)) {
    throw new TypeError('学生 AI 学习报告 diagnosisItems 接口返回格式错误')
  }
  if (!Array.isArray(result.improvementSuggestions)) {
    throw new TypeError('学生 AI 学习报告 improvementSuggestions 接口返回格式错误')
  }
  if (!Array.isArray(result.errorClusters)) {
    throw new TypeError('学生 AI 学习报告 errorClusters 接口返回格式错误')
  }
  return {
    examId: requireString(result.examId, '考试 ID'),
    published: requireBoolean(result.published, '成绩发布状态'),
    available: requireBoolean(result.available, 'AI 学习报告可用状态'),
    profileStatus: optionalAiAnalysisStatus(result.profileStatus, '个体学情分析状态'),
    clusterStatus: optionalAiAnalysisStatus(result.clusterStatus, '错因聚类分析状态'),
    profileMessage: optionalString(result.profileMessage, '个体学情分析提示'),
    clusterMessage: optionalString(result.clusterMessage, '错因聚类提示'),
    overallSummary: optionalString(result.overallSummary, '学生整体表现摘要'),
    errorClusterSummary: optionalString(result.errorClusterSummary, '错题聚类整体摘要'),
    diagnosisItems: result.diagnosisItems.map(validateDiagnosisItem),
    improvementSuggestions: requireStringArray(result.improvementSuggestions, '个性化改进建议'),
    errorClusters: result.errorClusters.map(validateErrorCluster),
  }
}
