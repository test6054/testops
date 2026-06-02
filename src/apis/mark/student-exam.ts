import type { BindingStatusCode, ExamStatusCode } from './exam'
import type { QuestionTypeCode } from './grading-experience'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'
import { throwUserFacing } from '@/utils/contract-guard'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { QUESTION_TYPE_LABEL } from './grading-experience'

const STUDENT_EXAM_DATA_ERROR = '成绩数据异常，请刷新后重试'

const STUDENT_EXAM_STATUS_LABEL: Record<ExamStatusCode, string> = {
  ACTIVE: '正常',
  CLOSED: '已关闭',
}

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
  examStatus: ExamStatusCode
  courseId?: string
  examStartTime: string
  examEndTime: string
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
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
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 学生端 AI 改进内容，整卷 AI 评分生成并随教师确认保留 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签，用于错题本快速归类 */
  mistakeClusterLabel?: string
}

export interface StudentScoreDetailVO {
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
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
  questionType: QuestionTypeCode
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
  questionType: QuestionTypeCode
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
 * - examId / paperInstanceId / questionTemplateId / questionNo / questionType / fullScore / teacherReviewScore / gradeStatus
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
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore: number
  gradeStatus: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
  /** 作答切片文件 ID，客观题或未生成切片时为空 */
  sliceFileId?: string
  /** OCR 识别后的学生作答文本，未识别或主观题未作答空白时为空 */
  recognizedAnswer?: string
  /** 教师评语，未填写时为空 */
  commentText?: string
  /** 学生端 AI 学习内容 */
  improvementSuggestion?: string
  /** 学生端 AI 错题聚类标签 */
  mistakeClusterLabel?: string
  /** 题目级 AI 诊断信息 */
  aiDiagnostic?: string
}

function requireStudentExamText(value: string | undefined): void {
  if (!value) {
    throwUserFacing(STUDENT_EXAM_DATA_ERROR)
  }
}

function requireStudentExamNumber(value: number | undefined): void {
  if (value === undefined || value === null) {
    throwUserFacing(STUDENT_EXAM_DATA_ERROR)
  }
}

function validateStudentReviewWindowContract(
  record: StudentExamItemVO | StudentScoreDetailVO,
): void {
  strictEnumLabel(STUDENT_REVIEW_WINDOW_STATUS_LABEL, record.reviewWindowStatus, '成绩复核窗口状态')
  strictEnumTone(STUDENT_REVIEW_WINDOW_STATUS_TONE, record.reviewWindowStatus, '成绩复核窗口状态')
  if (record.reviewWindowStatus === 'ACTIVE') {
    requireStudentExamText(record.reviewWindowOpenTime)
    requireStudentExamText(record.reviewWindowCloseTime)
  }
}

export function validateStudentExamItemContract(record: StudentExamItemVO): void {
  requireStudentExamText(record.candidateRosterId)
  requireStudentExamText(record.studentUserId)
  requireStudentExamText(record.studentNo)
  requireStudentExamText(record.studentName)
  requireStudentExamText(record.examId)
  requireStudentExamText(record.examName)
  requireStudentExamText(record.examNo)
  requireStudentExamText(record.examStartTime)
  requireStudentExamText(record.examEndTime)
  strictEnumLabel(STUDENT_EXAM_STATUS_LABEL, record.examStatus, '考试状态')
  strictEnumLabel(FINAL_SCORE_STATUS_LABEL, record.finalScoreStatus, '最终成绩状态')
  strictEnumTone(FINAL_SCORE_STATUS_TONE, record.finalScoreStatus, '最终成绩状态')
  validateStudentReviewWindowContract(record)
  if (record.finalScoreStatus === 'PUBLISHED') {
    requireStudentExamNumber(record.finalScore)
    requireStudentExamText(record.publishedTime)
  }
}

function validateStudentQuestionScoreContract(record: StudentQuestionScoreVO): void {
  requireStudentExamText(record.questionTemplateId)
  requireStudentExamText(record.questionNo)
  requireStudentExamNumber(record.fullScore)
  requireStudentExamNumber(record.teacherReviewScore)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  strictEnumLabel(GRADE_STATUS_LABEL, record.gradeStatus, '题目评分状态')
  strictEnumTone(GRADE_STATUS_TONE, record.gradeStatus, '题目评分状态')
  if (record.objectiveResult) {
    strictEnumLabel(OBJECTIVE_RESULT_LABEL, record.objectiveResult, '客观题判定结果')
    strictEnumTone(OBJECTIVE_RESULT_TONE, record.objectiveResult, '客观题判定结果')
  }
}

export function validateStudentScoreDetailContract(record: StudentScoreDetailVO): void {
  requireStudentExamText(record.examId)
  requireStudentExamText(record.examName)
  requireStudentExamText(record.examNo)
  requireStudentExamText(record.examStartTime)
  requireStudentExamText(record.examEndTime)
  requireStudentExamText(record.candidateRosterId)
  requireStudentExamText(record.studentUserId)
  requireStudentExamText(record.studentNo)
  requireStudentExamText(record.studentName)
  strictEnumLabel(STUDENT_EXAM_STATUS_LABEL, record.examStatus, '考试状态')
  strictEnumLabel(FINAL_SCORE_STATUS_LABEL, record.finalScoreStatus, '最终成绩状态')
  strictEnumTone(FINAL_SCORE_STATUS_TONE, record.finalScoreStatus, '最终成绩状态')
  validateStudentReviewWindowContract(record)
  if (record.finalScoreStatus === 'PUBLISHED') {
    requireStudentExamNumber(record.totalScore)
    requireStudentExamNumber(record.fullScore)
    requireStudentExamText(record.publishedTime)
  }
  record.questions.forEach(validateStudentQuestionScoreContract)
}

function validateStudentAiDiagnosisContract(record: StudentAiDiagnosisItemVO): void {
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, 'AI诊断题型')
  strictEnumLabel(MASTERY_LEVEL_LABEL, record.masteryLevel, '掌握层级')
  strictEnumTone(MASTERY_LEVEL_TONE, record.masteryLevel, '掌握层级')
  requireStudentExamText(record.scoreRate)
}

function validateStudentAiErrorClusterContract(record: StudentAiErrorClusterVO): void {
  requireStudentExamText(record.causeName)
  requireStudentExamText(record.causeDescription)
  requireStudentExamNumber(record.affectedCount)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '错因题型')
  requireStudentExamText(record.suggestion)
}

export function validateStudentAiLearningReportContract(record: StudentAiLearningReportVO): void {
  requireStudentExamText(record.examId)
  if (record.profileStatus) {
    strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, record.profileStatus, 'AI学习画像状态')
    strictEnumTone(AI_ANALYSIS_STATUS_COLOR, record.profileStatus, 'AI学习画像状态')
  }
  if (record.clusterStatus) {
    strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, record.clusterStatus, 'AI错因聚类状态')
    strictEnumTone(AI_ANALYSIS_STATUS_COLOR, record.clusterStatus, 'AI错因聚类状态')
  }
  record.diagnosisItems?.forEach(validateStudentAiDiagnosisContract)
  record.errorClusters?.forEach(validateStudentAiErrorClusterContract)
}

export function validateStudentQuestionAnswerDetailContract(
  record: StudentQuestionAnswerDetailVO,
): void {
  requireStudentExamText(record.examId)
  requireStudentExamText(record.paperInstanceId)
  requireStudentExamText(record.questionTemplateId)
  requireStudentExamText(record.questionNo)
  requireStudentExamNumber(record.fullScore)
  requireStudentExamNumber(record.teacherReviewScore)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  strictEnumLabel(GRADE_STATUS_LABEL, record.gradeStatus, '题目评分状态')
  strictEnumTone(GRADE_STATUS_TONE, record.gradeStatus, '题目评分状态')
  if (record.objectiveResult) {
    strictEnumValue(OBJECTIVE_RESULT_LABEL, record.objectiveResult, '客观题判定结果')
    strictEnumTone(OBJECTIVE_RESULT_TONE, record.objectiveResult, '客观题判定结果')
  }
}

export function listMyExams(): Promise<StudentExamItemVO[]> {
  return http.get<StudentExamItemVO[]>('/api/mark/student/exams/list').then((records) => {
    records.forEach(validateStudentExamItemContract)
    return records
  })
}

export function getMyScoreDetail(examId: string): Promise<StudentScoreDetailVO> {
  return http
    .get<StudentScoreDetailVO>('/api/mark/student/exams/score-detail', {
      params: { examId },
    })
    .then((record) => {
      validateStudentScoreDetailContract(record)
      return record
    })
}

export function getMyAiLearningReport(examId: string): Promise<StudentAiLearningReportVO> {
  return http
    .get<StudentAiLearningReportVO>('/api/mark/student/exams/ai-learning-report', {
      params: { examId },
    })
    .then((record) => {
      validateStudentAiLearningReportContract(record)
      return record
    })
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
    .post<StudentQuestionAnswerDetailVO>('/api/mark/student/exams/question-answer-detail', {
      examId,
      questionTemplateId,
    })
    .then((record) => {
      validateStudentQuestionAnswerDetailContract(record)
      return record
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
    throwUserFacing(STUDENT_EXAM_DATA_ERROR)
  }
  const now = Date.now()
  const open = new Date(item.reviewWindowOpenTime).getTime()
  const close = new Date(item.reviewWindowCloseTime).getTime()
  return now >= open && now <= close
}
