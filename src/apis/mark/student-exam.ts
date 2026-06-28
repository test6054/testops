import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { ExamStatusCode } from './exam'
import type { BindingStatusCode } from './exam-binding'
import type { FinalScoreStatusCode } from './final-score-status'
import type { GradeStatusCode } from './grade-status'
import type { ObjectiveResultCode } from './objective-result'
import type { QuestionTypeCode } from './question-type'
import type { MasteryLevelCode } from './student-mastery-level'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'
import { throwUserFacing } from '@/utils/contract-guard'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { AI_ANALYSIS_STATUS_LABEL, AI_ANALYSIS_STATUS_TONE } from './ai-analysis-status'
import { EXAM_STATUS_LABEL } from './exam'
import { FINAL_SCORE_STATUS_LABEL, FINAL_SCORE_STATUS_TONE } from './final-score-status'
import { GRADE_STATUS_LABEL, GRADE_STATUS_TONE } from './grade-status'
import { OBJECTIVE_RESULT_LABEL, OBJECTIVE_RESULT_TONE } from './objective-result'
import { QUESTION_TYPE_LABEL } from './question-type'
import { MASTERY_LEVEL_LABEL, MASTERY_LEVEL_TONE } from './student-mastery-level'

const STUDENT_EXAM_DATA_ERROR = '成绩数据异常，请刷新后重试'

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
  examScore?: number
  dailyScore?: number
  dailyScoreFull?: number
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
  examScore?: number
  dailyScore?: number
  dailyScoreFull?: number
  fullScore?: number
  publishedTime?: string
  questions: StudentQuestionScoreVO[]
  reviewWindowOpenTime?: string
  reviewWindowCloseTime?: string
  reviewWindowStatus: StudentReviewWindowStatusCode
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
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
  strictEnumLabel(EXAM_STATUS_LABEL, record.examStatus, '考试状态')
  strictEnumLabel(FINAL_SCORE_STATUS_LABEL, record.finalScoreStatus, '最终成绩状态')
  strictEnumTone(FINAL_SCORE_STATUS_TONE, record.finalScoreStatus, '最终成绩状态')
  validateStudentReviewWindowContract(record)
  if (record.finalScoreStatus === 'PUBLISHED') {
    requireStudentExamNumber(record.finalScore)
    requireStudentExamNumber(record.examScore)
    requireStudentExamNumber(record.dailyScore)
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
  strictEnumLabel(EXAM_STATUS_LABEL, record.examStatus, '考试状态')
  strictEnumLabel(FINAL_SCORE_STATUS_LABEL, record.finalScoreStatus, '最终成绩状态')
  strictEnumTone(FINAL_SCORE_STATUS_TONE, record.finalScoreStatus, '最终成绩状态')
  validateStudentReviewWindowContract(record)
  if (record.finalScoreStatus === 'PUBLISHED') {
    requireStudentExamNumber(record.totalScore)
    requireStudentExamNumber(record.examScore)
    requireStudentExamNumber(record.dailyScore)
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
    strictEnumTone(AI_ANALYSIS_STATUS_TONE, record.profileStatus, 'AI学习画像状态')
  }
  if (record.clusterStatus) {
    strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, record.clusterStatus, 'AI错因聚类状态')
    strictEnumTone(AI_ANALYSIS_STATUS_TONE, record.clusterStatus, 'AI错因聚类状态')
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
