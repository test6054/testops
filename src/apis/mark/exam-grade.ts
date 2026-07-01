import type { FinalScoreStatusCode } from './final-score-status'
import type { GradeStatusCode } from './grade-status'
import type { ObjectiveResultCode } from './objective-result'
import type { QuestionTypeCode } from './question-type'
/**
 * 阅卷考试题目评分确认与 AI 复评 API - 对接 /api/mark/exams/question-grades/*。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'
import { FINAL_SCORE_STATUS_LABEL } from './final-score-status'
import { QUESTION_TYPE_LABEL } from './question-type'

const EXAM_SCORE_DATA_ERROR = '成绩数据异常，请刷新后重试'

/** 题目成绩确认请求 - 对应 ExamGradeConfirmRequest */
export interface ExamGradeConfirmRequest {
  examId: string
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  commentText?: string
  annotationText?: string
}

/** 试卷题目得分明细 - 对应 ExamQuestionScoreDto */
export interface ExamQuestionScoreVO {
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore?: number
  gradeStatus?: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
}

/** 试卷成绩明细响应 - 对应 ExamPaperScoreResponse */
export interface ExamPaperScoreVO {
  examId: string
  paperInstanceId: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  examScore?: number
  dailyScore?: number
  totalScore?: number
  finalScoreStatus: FinalScoreStatusCode
  questions?: ExamQuestionScoreVO[]
}

/** 题目成绩驳回请求 - 对应 ExamGradeRejectRequest */
export interface ExamGradeRejectRequest {
  examId: string
  gradeResultId: string
  rejectReason: string
}

/** 题目成绩批量确认条目 - 对应 ExamGradeBatchConfirmRequest.Item */
export interface ExamGradeBatchConfirmItem {
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  /** 评语，可空 */
  commentText?: string
  /** 批注内容，可空 */
  annotationText?: string
}

/** 题目成绩批量确认请求 - 对应 ExamGradeBatchConfirmRequest */
export interface ExamGradeBatchConfirmRequest {
  examId: string
  items: ExamGradeBatchConfirmItem[]
}

/** 题目成绩批量确认失败明细 - 对应 ExamGradeBatchConfirmResponse.FailureItem */
export interface ExamGradeBatchConfirmFailureItem {
  gradeResultId: string
  /** 失败业务码（来自 ResultCodeEnum） */
  code: number
  /** 失败业务消息 */
  message: string
}

/** 题目成绩批量确认响应 - 对应 ExamGradeBatchConfirmResponse */
export interface ExamGradeBatchConfirmResponse {
  totalCount: number
  successCount: number
  failureCount: number
  successGradeResultIds: string[]
  failures: ExamGradeBatchConfirmFailureItem[]
}

/** 单题 AI 复评请求 - 对应 ExamQuestionAiRescoreRequest */
export interface ExamQuestionAiRescoreRequest {
  examId: string
  gradeResultId: string
}

/** AI 风险标记 - 对应 SubjectiveAiRiskFlag */
export interface SubjectiveAiRiskFlagVO {
  code?: string
  message?: string
}

/** AI 供应商类型编码 - 对应后端 AiProviderType */
export type AiProviderTypeCode = 'DEEPSEEK' | 'QWEN'

/** AI 供应商类型中文文案映射 */
export const AI_PROVIDER_TYPE_LABEL: Record<AiProviderTypeCode, string> = {
  DEEPSEEK: 'DeepSeek 模型服务',
  QWEN: '通义千问模型服务',
}

/** 单题 AI 复评结果 - 对应后端 SubjectiveGradeSuggestionResult 合同 */
export interface SubjectiveGradeSuggestionResultVO {
  scored?: boolean
  aiScore?: number
  modelProfileId?: string
  providerType?: AiProviderTypeCode
  modelName?: string
  diagnostic?: string
  evidenceSummary?: string
  traceId?: string
  limited?: boolean
  riskFlags?: SubjectiveAiRiskFlagVO[]
}

/** AI 能力编码 - docs/17 §整卷 AI 与单题复评；首次整卷 AI / 教师异议单题 AI 复评 */
export type AiAbilityCode = 'PAPER_GRADE_SUGGESTION' | 'SUBJECTIVE_GRADE_SUGGESTION'

/** AI 能力编码 -> 来源中文文案 */
export const AI_ABILITY_LABEL: Record<AiAbilityCode, string> = {
  PAPER_GRADE_SUGGESTION: '整卷 AI 批阅',
  SUBJECTIVE_GRADE_SUGGESTION: '单题 AI 复评',
}

/** AI 能力编码 -> 来源徽标色调 */
export const AI_ABILITY_TONE: Record<AiAbilityCode, BadgeTone> = {
  PAPER_GRADE_SUGGESTION: 'blue',
  SUBJECTIVE_GRADE_SUGGESTION: 'purple',
}

/** AI 执行状态编码 - 对应后端 AiExecutionStatus */
export type AiExecutionStatusCode = 'SUCCESS' | 'BLOCKED' | 'FAILED'

/** AI 执行状态文案映射 */
export const AI_EXECUTION_STATUS_LABEL: Record<AiExecutionStatusCode, string> = {
  SUCCESS: '成功',
  BLOCKED: '阻断',
  FAILED: '失败',
}

/** AI 执行状态徽标色调 */
export const AI_EXECUTION_STATUS_TONE: Record<AiExecutionStatusCode, BadgeTone> = {
  SUCCESS: 'green',
  BLOCKED: 'orange',
  FAILED: 'red',
}

/** 单题历次 AI 执行查询请求 - 对应 ExamQuestionAiExecutionsRequest */
export interface ExamQuestionAiExecutionsRequest {
  examId: string
  gradeResultId: string
}

/** 单题历次 AI 执行记录条目 - 对应 ExamQuestionAiExecutionItemResponse */
export interface ExamQuestionAiExecutionItemVO {
  traceId: string
  abilityCode: AiAbilityCode
  status: AiExecutionStatusCode
  providerType: AiProviderTypeCode
  modelName: string
  requestSummary?: string
  responseSummary?: string
  diagnostic?: string
  latencyMs: number
  createTime: string
  createUser: string
}

/** 试卷成绩合同校验，确保成绩详情的试卷身份、学生身份和题目分值完整。 */
function validateExamPaperScoreContract(record: ExamPaperScoreVO): ExamPaperScoreVO {
  assertUserFacingText(record.examId, EXAM_SCORE_DATA_ERROR)
  assertUserFacingText(record.paperInstanceId, EXAM_SCORE_DATA_ERROR)
  assertUserFacingText(record.candidateRosterId, EXAM_SCORE_DATA_ERROR)
  assertUserFacingText(record.studentUserId, EXAM_SCORE_DATA_ERROR)
  assertUserFacingText(record.studentNo, EXAM_SCORE_DATA_ERROR)
  assertUserFacingText(record.studentName, EXAM_SCORE_DATA_ERROR)
  strictEnumLabel(FINAL_SCORE_STATUS_LABEL, record.finalScoreStatus, '最终成绩状态')
  record.questions?.forEach((item) => {
    assertUserFacingText(item.questionTemplateId, EXAM_SCORE_DATA_ERROR)
    assertUserFacingText(item.questionNo, EXAM_SCORE_DATA_ERROR)
    strictEnumLabel(QUESTION_TYPE_LABEL, item.questionType, '题型')
    assertUserFacingFiniteNumber(item.fullScore, EXAM_SCORE_DATA_ERROR)
  })
  return record
}

/** 教师确认题目得分。 */
export function confirmQuestionGrade(request: ExamGradeConfirmRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/confirm', request)
}

/** 教师驳回题目复核。 */
export function rejectQuestionGrade(request: ExamGradeRejectRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/reject', request)
}

/** 教师批量确认题目得分，单题失败不阻塞其余条目。 */
export function batchConfirmQuestionGrades(
  request: ExamGradeBatchConfirmRequest,
): Promise<ExamGradeBatchConfirmResponse> {
  return http.post<ExamGradeBatchConfirmResponse>(
    '/api/mark/exams/question-grades/batch-confirm',
    request,
  )
}

/** 教师异议场景单题 AI 复评，最终成绩仍由 confirmQuestionGrade 写入。 */
export function rescoreQuestionByAi(
  request: ExamQuestionAiRescoreRequest,
): Promise<SubjectiveGradeSuggestionResultVO> {
  return http.post<SubjectiveGradeSuggestionResultVO>(
    '/api/mark/exams/question-grades/ai-rescore',
    request,
  )
}

/** 查询单题历次 AI 执行记录，仅暴露审计真源，不引入版本化读取。 */
export function listAiExecutionsForQuestion(
  request: ExamQuestionAiExecutionsRequest,
): Promise<ExamQuestionAiExecutionItemVO[]> {
  return http.post<ExamQuestionAiExecutionItemVO[]>(
    '/api/mark/exams/question-grades/ai-executions',
    request,
  )
}

/** 查询试卷当前成绩明细。 */
export function getPaperScore(examId: string, paperInstanceId: string): Promise<ExamPaperScoreVO> {
  return http
    .post<ExamPaperScoreVO>('/api/mark/exams/paper-score', { examId, paperInstanceId })
    .then(validateExamPaperScoreContract)
}
