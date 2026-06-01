/**
 * 批改经验沉淀 API - 对接 edu-mark 模块 GradingExperienceController
 *
 * 业务能力（按照 docs/17 §K6）：
 *   1. 题目签名 - generateSignatures / listSignatures / searchSimilar
 *   2. AI 经验提取 - extractExperience / listExperiences / listExperiencesByQuestion
 *   3. AI 答案聚类 - generateAnswerCluster / getLatestAnswerCluster
 *
 * 后端规则（注意混合方法）：
 *   - 写操作（generate / extract）走 POST，复杂查询走 POST + DTO
 *   - ≤ 2 参数的简单查询保留 GET + @RequestParam（symmetry-mark 模块约定）
 *   - searchSimilar 因 3 参数已强制 POST + SimilarQuestionSearchRequest
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

// ─── 状态枚举 ─────────────────────────────────

/** 题目类型 - 对应后端 QuestionType */
export type QuestionTypeCode = 'OBJECTIVE' | 'SUBJECTIVE'

export const QUESTION_TYPE_LABEL: Record<QuestionTypeCode, string> = {
  OBJECTIVE: '客观题',
  SUBJECTIVE: '主观题',
}

/** AI 分析状态 - 对应 AiAnalysisStatus */
export type AiAnalysisStatusCode = 'PENDING' | 'SUCCESS' | 'FAILED' | 'BLOCKED'

export const AI_ANALYSIS_STATUS_LABEL: Record<AiAnalysisStatusCode, string> = {
  PENDING: '执行中',
  SUCCESS: '成功',
  FAILED: '失败',
  BLOCKED: '已阻断',
}

export const AI_ANALYSIS_STATUS_COLOR: Record<AiAnalysisStatusCode, BadgeTone> = {
  PENDING: 'blue',
  SUCCESS: 'green',
  FAILED: 'red',
  BLOCKED: 'orange',
}

/** 经验案例状态 - 对应 ExperienceCaseStatus */
export type ExperienceCaseStatusCode = 'DRAFT' | 'CONFIRMED' | 'DEPRECATED'

export const EXPERIENCE_CASE_STATUS_LABEL: Record<ExperienceCaseStatusCode, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
  DEPRECATED: '已废弃',
}

export const EXPERIENCE_CASE_STATUS_COLOR: Record<ExperienceCaseStatusCode, BadgeTone> = {
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

// ─── 题目签名 API ─────────────────────────────────

/**
 * 为考试所有题目生成签名（写操作）
 * POST /api/exam/grading-experience/signature/generate?examId=
 */
export function generateSignatures(examId: string): Promise<QuestionSignatureVO[]> {
  return http.post<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/generate',
    null,
    { params: { examId } },
  )
}

/**
 * 查询指定考试的题目签名列表（≤ 2 参数 GET 保留）
 * GET /api/exam/grading-experience/signature/list?examId=
 */
export function listSignatures(examId: string): Promise<QuestionSignatureVO[]> {
  return http.get<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/list',
    { params: { examId } },
  )
}

/**
 * 检索跨考试相似题（3 参数已转 POST + DTO）
 * POST /api/exam/grading-experience/signature/similar
 */
export function searchSimilar(
  request: SimilarQuestionSearchRequest,
): Promise<QuestionSignatureVO[]> {
  return http.post<QuestionSignatureVO[]>(
    '/api/exam/grading-experience/signature/similar',
    request,
  )
}

// ─── AI 经验提取 API ─────────────────────────────────

/**
 * AI 提取批改经验（写操作 + AI 调用）
 * POST /api/exam/grading-experience/experience/extract?examId=&questionTemplateId=
 */
export function extractExperience(
  examId: string,
  questionTemplateId: string,
): Promise<GradingExperienceCaseVO> {
  return http.post<GradingExperienceCaseVO>(
    '/api/exam/grading-experience/experience/extract',
    null,
    { params: { examId, questionTemplateId } },
  )
}

/**
 * 查询考试维度的所有经验案例
 * GET /api/exam/grading-experience/experience/list?examId=
 */
export function listExperiences(examId: string): Promise<GradingExperienceCaseVO[]> {
  return http.get<GradingExperienceCaseVO[]>(
    '/api/exam/grading-experience/experience/list',
    { params: { examId } },
  )
}

/**
 * 查询指定题目的经验案例列表（按时间倒序）
 * GET /api/exam/grading-experience/experience/by-question?examId=&questionTemplateId=
 */
export function listExperiencesByQuestion(
  examId: string,
  questionTemplateId: string,
): Promise<GradingExperienceCaseVO[]> {
  return http.get<GradingExperienceCaseVO[]>(
    '/api/exam/grading-experience/experience/by-question',
    { params: { examId, questionTemplateId } },
  )
}

// ─── AI 答案聚类 API ─────────────────────────────────

/**
 * AI 对指定题目执行答案聚类（写操作 + AI 调用）
 * POST /api/exam/grading-experience/answer-cluster/generate?examId=&questionTemplateId=
 */
export function generateAnswerCluster(
  examId: string,
  questionTemplateId: string,
): Promise<AnswerClusterRecordVO> {
  return http.post<AnswerClusterRecordVO>(
    '/api/exam/grading-experience/answer-cluster/generate',
    null,
    { params: { examId, questionTemplateId } },
  )
}

/**
 * 查询指定题目最新的答案聚类结果
 * GET /api/exam/grading-experience/answer-cluster/latest?examId=&questionTemplateId=
 */
export function getLatestAnswerCluster(
  examId: string,
  questionTemplateId: string,
): Promise<AnswerClusterRecordVO | null> {
  return http.get<AnswerClusterRecordVO | null>(
    '/api/exam/grading-experience/answer-cluster/latest',
    { params: { examId, questionTemplateId } },
  )
}
