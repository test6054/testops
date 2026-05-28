import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

export type FinalScoreStatusCode =
  | 'PENDING'
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
  finalScore: number
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
  /** 得分率，后端返回 0-1 小数比例字符串，前端展示时转为百分比 */
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

/**
 * 学生单题答题明细 VO，仅在成绩已发布时由后端返回。
 *
 * 必填字段（PUBLISHED 守门后由后端校验）：
 * - examId / paperInstanceId / questionTemplateId / questionNo / questionType / fullScore / finalScore / gradeStatus
 *
 * 可空字段（按题型 / OCR / 教师批阅状态决定）：
 * - sliceFileId / recognizedAnswer / commentText / objectiveResult
 *   / improvementSuggestion / mistakeClusterLabel / aiDiagnostic
 */
export interface StudentQuestionAnswerDetailVO {
  examId: string
  paperInstanceId: string
  questionTemplateId: string
  questionNo: string
  questionType: string
  fullScore: number
  finalScore: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 作答切片文件 ID，客观题或未生成切片时为空 */
  sliceFileId?: string
  /** OCR 识别后的学生作答文本，未识别或主观题原始空白时为空 */
  recognizedAnswer?: string
  /** 教师评语，未填写时为空 */
  commentText?: string
  /** 学生端 AI 学习建议 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签 */
  mistakeClusterLabel?: string
  /** 题目级 AI 诊断信息 */
  aiDiagnostic?: string
}

export function listMyExams(): Promise<StudentExamItemVO[]> {
  return http.get<unknown>('/api/mark/student/exams/list').then(validateStudentExamList)
}

export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailVO> {
  return http
    .get<unknown>('/api/mark/student/exams/score-detail', {
      params: { examId },
    })
    .then(validateStudentScoreDetail)
}

export function getMyAiLearningReport(examId: string): Promise<StudentAiLearningReportVO> {
  return http
    .get<unknown>('/api/mark/student/exams/ai-learning-report', {
      params: { examId },
    })
    .then(validateStudentAiLearningReport)
}

/**
 * 查询当前学生指定考试中某一道题的答题明细。
 *
 * 后端守门：
 * - 学生身份未命中 candidate_roster -> FORBIDDEN
 * - 成绩未发布 -> CONFLICT（"成绩尚未发布，暂不能查看答题明细"）
 * - 题目模板未命中 -> NOT_FOUND
 *
 * 调用方应保证仅在 finalScoreStatus = PUBLISHED 时调用，避免无谓的 CONFLICT 报错。
 */
export function getMyQuestionAnswerDetail(
  examId: string,
  questionTemplateId: string,
): Promise<StudentQuestionAnswerDetailVO> {
  return http
    .post<unknown>('/api/mark/student/exams/question-answer-detail', {
      examId,
      questionTemplateId,
    })
    .then(validateStudentQuestionAnswerDetail)
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
    value !== 'PENDING' &&
    value !== 'CALCULATED' &&
    value !== 'CONFIRMED' &&
    value !== 'CORRECTED' &&
    value !== 'PUBLISHED' &&
    value !== 'WITHDRAWN'
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
    value !== 'EXCELLENT' &&
    value !== 'GOOD' &&
    value !== 'MEDIUM' &&
    value !== 'WEAK' &&
    value !== 'CRITICAL'
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
  const item = {
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
  validatePublishedStudentExamContract(item)
  return item
}

function validateStudentExamList(value: unknown): StudentExamItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('学生考试列表接口返回格式错误')
  }
  return value.map(validateStudentExam)
}

function validatePublishedStudentExamContract(item: StudentExamItemVO): void {
  if (item.finalScoreStatus !== 'PUBLISHED') {
    return
  }
  if (!item.paperInstanceId) {
    throw new TypeError(`已发布成绩缺少试卷实例 ID：examId=${item.examId}`)
  }
  if (item.finalScore == null) {
    throw new TypeError(`已发布成绩缺少最终分数：examId=${item.examId}`)
  }
  if (!item.publishedTime) {
    throw new TypeError(`已发布成绩缺少发布时间：examId=${item.examId}`)
  }
}

function validatePublishedStudentScoreDetailContract(detail: StudentScoreDetailVO): void {
  if (detail.finalScoreStatus !== 'PUBLISHED') {
    return
  }
  if (!detail.paperInstanceId) {
    throw new TypeError(`已发布成绩缺少试卷实例 ID：examId=${detail.examId}`)
  }
  if (detail.totalScore == null) {
    throw new TypeError(`已发布成绩缺少最终分数：examId=${detail.examId}`)
  }
  if (!detail.publishedTime) {
    throw new TypeError(`已发布成绩缺少发布时间：examId=${detail.examId}`)
  }
}

function requireGradeStatus(value: unknown, fieldName: string): GradeStatusCode {
  if (value !== 'PENDING' && value !== 'NEED_REVIEW' && value !== 'CONFIRMED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalObjectiveResult(
  value: unknown,
  fieldName: string,
): ObjectiveResultCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== 'CORRECT' && value !== 'WRONG' && value !== 'NEED_REVIEW') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateQuestionScore(value: unknown, index: number): StudentQuestionScoreVO {
  const result = requireObject(value, `题目得分明细[${index}]`)
  return {
    questionTemplateId: requireString(
      result.questionTemplateId,
      `题目得分明细[${index}].questionTemplateId`,
    ),
    questionNo: requireString(result.questionNo, `题目得分明细[${index}].questionNo`),
    questionType: requireString(result.questionType, `题目得分明细[${index}].questionType`),
    fullScore: requireFiniteNumber(result.fullScore, `题目得分明细[${index}].fullScore`),
    finalScore: requireFiniteNumber(result.finalScore, `题目得分明细[${index}].finalScore`),
    gradeStatus: requireGradeStatus(result.gradeStatus, `题目得分明细[${index}].gradeStatus`),
    objectiveResult: optionalObjectiveResult(
      result.objectiveResult,
      `题目得分明细[${index}].objectiveResult`,
    ),
    improvementSuggestion: optionalString(
      result.improvementSuggestion,
      `题目得分明细[${index}].improvementSuggestion`,
    ),
    mistakeClusterLabel: optionalString(
      result.mistakeClusterLabel,
      `题目得分明细[${index}].mistakeClusterLabel`,
    ),
  }
}

function validateStudentScoreDetail(value: unknown): StudentScoreDetailVO {
  const result = requireObject(value, '学生成绩详情')
  if (!Array.isArray(result.questions)) {
    throw new TypeError('学生成绩详情 questions 接口返回格式错误')
  }
  const detail: StudentScoreDetailVO = {
    examId: requireString(result.examId, '考试 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: requireString(result.examNo, '考试编号'),
    examStatus: requireString(result.examStatus, '考试状态'),
    courseId: optionalString(result.courseId, '课程 ID'),
    examStartTime: requireString(result.examStartTime, '考试开始时间'),
    examEndTime: requireString(result.examEndTime, '考试结束时间'),
    candidateRosterId: requireString(result.candidateRosterId, '考生名册 ID'),
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    studentNo: requireString(result.studentNo, '学号'),
    studentName: requireString(result.studentName, '学生姓名'),
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    finalScoreId: optionalString(result.finalScoreId, '最终成绩 ID'),
    finalScoreStatus: requireFinalScoreStatus(result.finalScoreStatus, '最终成绩状态'),
    totalScore: optionalFiniteNumber(result.totalScore, '总分'),
    fullScore: optionalFiniteNumber(result.fullScore, '满分'),
    publishedTime: optionalString(result.publishedTime, '发布时间'),
    questions: result.questions.map(validateQuestionScore),
    reviewWindowOpenTime: optionalString(result.reviewWindowOpenTime, '复核窗口开始时间'),
    reviewWindowCloseTime: optionalString(result.reviewWindowCloseTime, '复核窗口结束时间'),
    reviewWindowStatus: requireReviewWindowStatus(result.reviewWindowStatus, '复核窗口状态'),
  }
  validatePublishedStudentScoreDetailContract(detail)
  if (detail.finalScoreStatus === 'PUBLISHED') {
    if (detail.fullScore == null) {
      throw new TypeError(`已发布成绩缺少满分：examId=${detail.examId}`)
    }
    if (detail.questions.length === 0) {
      throw new TypeError(`已发布成绩缺少逐题明细：examId=${detail.examId}`)
    }
  }
  return detail
}

function validateDiagnosisItem(value: unknown, index: number): StudentAiDiagnosisItemVO {
  const result = requireObject(value, `AI 诊断条目[${index}]`)
  return {
    questionType: requireString(result.questionType, `AI 诊断条目[${index}].questionType`),
    masteryLevel: requireMasteryLevel(result.masteryLevel, `AI 诊断条目[${index}].masteryLevel`),
    scoreRate: requireString(result.scoreRate, `AI 诊断条目[${index}].scoreRate`),
    lostQuestionNos: optionalStringArray(
      result.lostQuestionNos,
      `AI 诊断条目[${index}].lostQuestionNos`,
    ),
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
  const report = {
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
  if (!report.available && !report.profileMessage && !report.clusterMessage) {
    throw new TypeError('学生 AI 学习报告不可用时缺少提示信息')
  }
  return report
}

function validateStudentQuestionAnswerDetail(value: unknown): StudentQuestionAnswerDetailVO {
  const result = requireObject(value, '学生单题答题明细')
  const detail: StudentQuestionAnswerDetailVO = {
    examId: requireString(result.examId, '考试 ID'),
    paperInstanceId: requireString(result.paperInstanceId, '试卷实例 ID'),
    questionTemplateId: requireString(result.questionTemplateId, '题目模板 ID'),
    questionNo: requireString(result.questionNo, '题号'),
    questionType: requireString(result.questionType, '题型'),
    fullScore: requireFiniteNumber(result.fullScore, '题目满分'),
    finalScore: requireFiniteNumber(result.finalScore, '题目最终得分'),
    gradeStatus: requireGradeStatus(result.gradeStatus, '批改状态'),
    objectiveResult: optionalObjectiveResult(result.objectiveResult, '客观题判定'),
    sliceFileId: optionalString(result.sliceFileId, '作答切片文件 ID'),
    recognizedAnswer: optionalString(result.recognizedAnswer, 'OCR 识别作答'),
    commentText: optionalString(result.commentText, '教师评语'),
    improvementSuggestion: optionalString(result.improvementSuggestion, '学生端 AI 学习建议'),
    mistakeClusterLabel: optionalString(result.mistakeClusterLabel, '学生端 AI 错题聚类标签'),
    aiDiagnostic: optionalString(result.aiDiagnostic, '题目级 AI 诊断'),
  }
  return detail
}
