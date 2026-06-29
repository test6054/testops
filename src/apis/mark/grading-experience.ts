/**
 * 批改经验沉淀 API - 对接 edu-mark 模块 GradingExperienceController
 */
import type { AiAnalysisStatusCode } from './ai-analysis-status'
import type { QuestionTypeCode } from './question-type'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

// ─── 状态枚举 ─────────────────────────────────

/** 经验案例状态 - 对应 ExperienceCaseStatus */
export type ExperienceCaseStatusCode = 'DRAFT' | 'CONFIRMED' | 'DEPRECATED'

export const EXPERIENCE_CASE_STATUS_LABEL: Record<ExperienceCaseStatusCode, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
  DEPRECATED: '已废弃',
}

export const EXPERIENCE_CASE_STATUS_TONE: Record<ExperienceCaseStatusCode, BadgeTone> = {
  DRAFT: 'gray',
  CONFIRMED: 'green',
  DEPRECATED: 'red',
}

// ─── DTO ─────────────────────────────────

/** 跨考试相似题检索 - 对应 SimilarQuestionSearchRequest */
export interface SimilarQuestionSearchRequest {
  examId: string
  questionTemplateId: string
  /** 最大返回条数，默认 10 */
  limit?: number
}

/** 考试详情查询 - 对应 ExamDetailQueryRequest */
export interface ExamDetailQueryRequest {
  examId: string
}

/** 考试 + 题目模板范围 - 对应 ExamQuestionScopeQueryRequest */
export interface ExamQuestionScopeQueryRequest {
  examId: string
  questionTemplateId: string
}

/** 题目签名 VO - 对应 QuestionSignatureResponse */
export interface QuestionSignatureVO {
  id?: string
  examId: string
  examName: string
  examNo: string
  questionTemplateId: string
  questionType: QuestionTypeCode
  questionNo: string
  questionDigest?: string
  standardAnswerDigest?: string
  createTime?: string
}

/** 批改经验单项 */
export interface ExperienceItemVO {
  experienceType?: string
  description?: string
  frequency?: number
  scoringPattern?: string
  applicableScenario?: string
  riskNote?: string
}

/** 经验案例 VO - 对应 GradingExperienceCaseResponse */
export interface GradingExperienceCaseVO {
  id?: string
  sourceExamId: string
  sourceExamName: string
  sourceExamNo: string
  questionTemplateId: string
  questionNo: string
  questionDigest?: string
  questionType: QuestionTypeCode
  aiTraceId?: string
  experienceSummary?: string
  experienceItems?: ExperienceItemVO[]
  riskTags?: string[]
  applicableScope?: string
  caseStatus: ExperienceCaseStatusCode
  effectivenessMetric?: string
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/** 答案聚类单组 */
export interface AnswerGroupVO {
  groupNo?: number
  groupLabel?: string
  groupDescription?: string
  representativeAnswers?: string[]
  answerCount?: number
  avgScore?: number
  suggestedAction?: string
  controversyNote?: string
}

/** 答案聚类记录 VO - 对应 ExamAnswerClusterRecord */
export interface AnswerClusterRecordVO {
  id?: string
  examId: string
  questionTemplateId: string
  aiTraceId?: string
  clusterSummary?: string
  answerGroups?: AnswerGroupVO[]
  groupCount?: number
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

export function generateSignatures(examId: string): Promise<QuestionSignatureVO[]> {
  return http.post<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/generate',
    { examId } satisfies ExamDetailQueryRequest,
  )
}

export function listSignatures(examId: string): Promise<QuestionSignatureVO[]> {
  return http.post<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/list',
    { examId } satisfies ExamDetailQueryRequest,
  )
}

export function searchSimilar(
  request: SimilarQuestionSearchRequest,
): Promise<QuestionSignatureVO[]> {
  return http.post<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/similar',
    request,
  )
}

export function extractExperience(
  examId: string,
  questionTemplateId: string,
): Promise<GradingExperienceCaseVO> {
  return http.post<GradingExperienceCaseVO>(
    '/api/exam/grading-experience/experience/extract',
    { examId, questionTemplateId } satisfies ExamQuestionScopeQueryRequest,
  )
}

export function listExperiences(examId: string): Promise<GradingExperienceCaseVO[]> {
  return http.post<GradingExperienceCaseVO[]>(
    '/api/exam/grading-experience/experience/list',
    { examId } satisfies ExamDetailQueryRequest,
  )
}

export function listExperiencesByQuestion(
  examId: string,
  questionTemplateId: string,
): Promise<GradingExperienceCaseVO[]> {
  return http.post<GradingExperienceCaseVO[]>(
    '/api/exam/grading-experience/experience/by-question',
    { examId, questionTemplateId } satisfies ExamQuestionScopeQueryRequest,
  )
}

export function generateAnswerCluster(
  examId: string,
  questionTemplateId: string,
): Promise<AnswerClusterRecordVO> {
  return http.post<AnswerClusterRecordVO>(
    '/api/exam/grading-experience/answer-cluster/generate',
    { examId, questionTemplateId } satisfies ExamQuestionScopeQueryRequest,
  )
}

export function getLatestAnswerCluster(
  examId: string,
  questionTemplateId: string,
): Promise<AnswerClusterRecordVO | null> {
  return http.post<AnswerClusterRecordVO | null>(
    '/api/exam/grading-experience/answer-cluster/latest',
    { examId, questionTemplateId } satisfies ExamQuestionScopeQueryRequest,
  )
}
