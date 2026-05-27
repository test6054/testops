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
export interface SimilarQuestionSearchPayload {
  examId: string
  questionTemplateId: string
  /** 最大返回条数，默认 10 */
  limit?: number
}

/** 题目签名 VO - 对应 CrossExamQuestionSignature */
export interface QuestionSignatureVO {
  id?: string
  tenantId?: string
  examId: string
  questionTemplateId: string
  questionType?: QuestionTypeCode
  questionNo: string
  questionDigest?: string
  standardAnswerDigest?: string
  structureFeatures?: string
  signatureHash?: string
  signatureSimhash?: string
  createTime?: string
}

/** 经验案例 VO - 对应 ExamGradingExperienceCase */
export interface GradingExperienceCaseVO {
  id?: string
  tenantId?: string
  sourceExamId: string
  questionTemplateId: string
  questionType?: QuestionTypeCode
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  experienceSummary?: string
  experienceItems?: string
  riskTags?: string
  applicableScope?: string
  caseStatus: ExperienceCaseStatusCode
  effectivenessMetric?: string
  analysisStatus: AiAnalysisStatusCode
  errorMessage?: string
  latencyMs?: number
  createTime?: string
}

/** 答案聚类记录 VO - 对应 ExamAnswerClusterRecord */
export interface AnswerClusterRecordVO {
  id?: string
  tenantId?: string
  examId: string
  questionTemplateId: string
  aiTraceId?: string
  aiModelProfileId?: string
  evidenceSnapshot?: string
  aiRawResponse?: string
  clusterSummary?: string
  answerGroups?: string
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
  return http.post<unknown>(
    '/api/exam/grading-experience/signature/generate',
    null,
    { params: { examId } },
  ).then(validateQuestionSignatureList)
}

/**
 * 查询指定考试的题目签名列表（≤ 2 参数 GET 保留）
 * GET /api/exam/grading-experience/signature/list?examId=
 */
export function listSignatures(examId: string): Promise<QuestionSignatureVO[]> {
  return http.get<unknown>(
    '/api/exam/grading-experience/signature/list',
    { params: { examId } },
  ).then(validateQuestionSignatureList)
}

/**
 * 检索跨考试相似题（3 参数已转 POST + DTO）
 * POST /api/exam/grading-experience/signature/similar
 */
export function searchSimilar(
  payload: SimilarQuestionSearchPayload,
): Promise<QuestionSignatureVO[]> {
  return http.post<unknown>(
    '/api/exam/grading-experience/signature/similar',
    payload,
  ).then(validateQuestionSignatureList)
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
  return http.post<unknown>(
    '/api/exam/grading-experience/experience/extract',
    null,
    { params: { examId, questionTemplateId } },
  ).then(validateGradingExperienceCase)
}

/**
 * 查询考试维度的所有经验案例
 * GET /api/exam/grading-experience/experience/list?examId=
 */
export function listExperiences(examId: string): Promise<GradingExperienceCaseVO[]> {
  return http.get<unknown>(
    '/api/exam/grading-experience/experience/list',
    { params: { examId } },
  ).then(validateGradingExperienceCaseList)
}

/**
 * 查询指定题目的经验案例列表（按时间倒序）
 * GET /api/exam/grading-experience/experience/by-question?examId=&questionTemplateId=
 */
export function listExperiencesByQuestion(
  examId: string,
  questionTemplateId: string,
): Promise<GradingExperienceCaseVO[]> {
  return http.get<unknown>(
    '/api/exam/grading-experience/experience/by-question',
    { params: { examId, questionTemplateId } },
  ).then(validateGradingExperienceCaseList)
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
  return http.post<unknown>(
    '/api/exam/grading-experience/answer-cluster/generate',
    null,
    { params: { examId, questionTemplateId } },
  ).then(validateAnswerClusterRecord)
}

/**
 * 查询指定题目最新的答案聚类结果
 * GET /api/exam/grading-experience/answer-cluster/latest?examId=&questionTemplateId=
 */
export function getLatestAnswerCluster(
  examId: string,
  questionTemplateId: string,
): Promise<AnswerClusterRecordVO | null> {
  return http.get<unknown>(
    '/api/exam/grading-experience/answer-cluster/latest',
    { params: { examId, questionTemplateId } },
  ).then((value) => {
    if (value === null) {
      return null
    }
    return validateAnswerClusterRecord(value)
  })
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`批改经验接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`批改经验接口 ${fieldName} 格式错误`)
  }
  return value
}

function optionalQuestionType(value: unknown, fieldName: string): QuestionTypeCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (
    value !== 'OBJECTIVE'
    && value !== 'SUBJECTIVE'
  ) {
    throw new TypeError(`批改经验接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireQuestionType(value: unknown, fieldName: string): QuestionTypeCode {
  const result = optionalQuestionType(value, fieldName)
  if (!result) {
    throw new TypeError(`批改经验接口缺少 ${fieldName}`)
  }
  return result
}

function requireAiAnalysisStatus(value: unknown, fieldName: string): AiAnalysisStatusCode {
  if (
    value !== 'PENDING'
    && value !== 'SUCCESS'
    && value !== 'FAILED'
    && value !== 'BLOCKED'
  ) {
    throw new TypeError(`批改经验接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireExperienceCaseStatus(value: unknown, fieldName: string): ExperienceCaseStatusCode {
  if (
    value !== 'DRAFT'
    && value !== 'CONFIRMED'
    && value !== 'DEPRECATED'
  ) {
    throw new TypeError(`批改经验接口 ${fieldName} 格式错误`)
  }
  return value
}

function validateQuestionSignature(value: unknown): QuestionSignatureVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('题目签名接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: optionalString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    examId: requireString(record.examId, 'examId'),
    questionTemplateId: requireString(record.questionTemplateId, 'questionTemplateId'),
    questionType: optionalQuestionType(record.questionType, 'questionType'),
    questionNo: requireString(record.questionNo, 'questionNo'),
    questionDigest: optionalString(record.questionDigest, 'questionDigest'),
    standardAnswerDigest: optionalString(record.standardAnswerDigest, 'standardAnswerDigest'),
    structureFeatures: optionalString(record.structureFeatures, 'structureFeatures'),
    signatureHash: optionalString(record.signatureHash, 'signatureHash'),
    signatureSimhash: optionalString(record.signatureSimhash, 'signatureSimhash'),
    createTime: optionalString(record.createTime, 'createTime'),
  }
}

function validateQuestionSignatureList(value: unknown): QuestionSignatureVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('题目签名列表接口返回格式错误')
  }
  return value.map(validateQuestionSignature)
}

function validateGradingExperienceCase(value: unknown): GradingExperienceCaseVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('批改经验案例接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: optionalString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    sourceExamId: requireString(record.sourceExamId, 'sourceExamId'),
    questionTemplateId: requireString(record.questionTemplateId, 'questionTemplateId'),
    questionType: requireQuestionType(record.questionType, 'questionType'),
    aiTraceId: optionalString(record.aiTraceId, 'aiTraceId'),
    aiModelProfileId: optionalString(record.aiModelProfileId, 'aiModelProfileId'),
    evidenceSnapshot: optionalString(record.evidenceSnapshot, 'evidenceSnapshot'),
    aiRawResponse: optionalString(record.aiRawResponse, 'aiRawResponse'),
    experienceSummary: optionalString(record.experienceSummary, 'experienceSummary'),
    experienceItems: optionalString(record.experienceItems, 'experienceItems'),
    riskTags: optionalString(record.riskTags, 'riskTags'),
    applicableScope: optionalString(record.applicableScope, 'applicableScope'),
    caseStatus: requireExperienceCaseStatus(record.caseStatus, 'caseStatus'),
    effectivenessMetric: optionalString(record.effectivenessMetric, 'effectivenessMetric'),
    analysisStatus: requireAiAnalysisStatus(record.analysisStatus, 'analysisStatus'),
    errorMessage: optionalString(record.errorMessage, 'errorMessage'),
    latencyMs: typeof record.latencyMs === 'number' ? record.latencyMs : undefined,
    createTime: optionalString(record.createTime, 'createTime'),
  }
}

function validateGradingExperienceCaseList(value: unknown): GradingExperienceCaseVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('批改经验案例列表接口返回格式错误')
  }
  return value.map(validateGradingExperienceCase)
}

function validateAnswerClusterRecord(value: unknown): AnswerClusterRecordVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('答案聚类接口返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: optionalString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    examId: requireString(record.examId, 'examId'),
    questionTemplateId: requireString(record.questionTemplateId, 'questionTemplateId'),
    aiTraceId: optionalString(record.aiTraceId, 'aiTraceId'),
    aiModelProfileId: optionalString(record.aiModelProfileId, 'aiModelProfileId'),
    evidenceSnapshot: optionalString(record.evidenceSnapshot, 'evidenceSnapshot'),
    aiRawResponse: optionalString(record.aiRawResponse, 'aiRawResponse'),
    clusterSummary: optionalString(record.clusterSummary, 'clusterSummary'),
    answerGroups: optionalString(record.answerGroups, 'answerGroups'),
    groupCount: typeof record.groupCount === 'number' ? record.groupCount : undefined,
    analysisStatus: requireAiAnalysisStatus(record.analysisStatus, 'analysisStatus'),
    errorMessage: optionalString(record.errorMessage, 'errorMessage'),
    latencyMs: typeof record.latencyMs === 'number' ? record.latencyMs : undefined,
    createTime: optionalString(record.createTime, 'createTime'),
  }
}
