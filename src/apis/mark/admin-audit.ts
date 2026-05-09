import type { IncidentLevelCode, IncidentRecordVO } from '@/apis/mark/admin-dashboard'

/**
 * 阅卷管理员批改审计 API - 对接 edu-mark 模块 ExamAuditController。
 *
 * 后端规则：
 * - 路径前缀 /api/mark/exams/audit
 * - 全部为 POST + DTO body
 * - 租户上下文从 UserHold 注入；examId 由前端传入
 * - 后端 Long ID 统一以 string 表达到前端
 */
import http from '@/config/axios'

// ─── 操作类型 / 目标类型枚举 ─────────────────────────

/** 审计目标类型（与后端 AuditTargetType 对齐，仅列出阅卷链常见目标） */
export type AuditTargetTypeCode
  = | 'EXAM'
    | 'PAPER_INSTANCE'
    | 'CANDIDATE_ROSTER'
    | 'QUESTION_TEMPLATE'
    | 'GRADE_RESULT'
    | 'FINAL_SCORE'
    | 'REVIEW_TASK'
    | 'PROCESSING_TASK'
    | 'IMAGE_LEDGER'
    | 'IMAGE_PAGE'
    | 'IMAGE_QUALITY_DECISION'
    | 'REPAIR_ACTION'
    | 'PAPER_DUPLICATE_RESOLUTION'
    | 'INCIDENT_RECORD'

/**
 * 操作类型字符串。
 *
 * 后端 OperationType 枚举条目较多，前端不强制枚举值，按字符串处理；
 * 用 Map 列出常见操作类型的中文文案，未知值原样展示。
 */
export type OperationTypeCode = string

/** 常见操作类型文案映射 */
export const OPERATION_TYPE_LABEL: Record<string, string> = {
  EXAM_CREATE: '创建考试',
  EXAM_UPDATE: '修改考试',
  EXAM_CLOSE: '关闭考试',
  EXAM_REOPEN: '重新激活考试',
  CANDIDATE_IMPORT: '导入考生',
  CANDIDATE_UPDATE: '修改考生',
  PAPER_BIND: '绑定试卷',
  PAPER_UNBIND: '解绑试卷',
  GRADE_SUBMIT: '提交评分',
  GRADE_OVERRIDE: '覆盖评分',
  GRADE_CONFIRM: '确认评分',
  GRADE_WITHDRAW: '撤回评分',
  FINAL_SCORE_CONFIRM: '确认最终成绩',
  FINAL_SCORE_PUBLISH: '发布最终成绩',
  FINAL_SCORE_WITHDRAW: '撤回最终成绩',
  FINAL_SCORE_CORRECT: '更正最终成绩',
  REVIEW_TASK_CLAIM: '认领复核任务',
  REVIEW_TASK_COMPLETE: '完成复核任务',
  IQA_DECISION: 'IQA 决策',
  REPAIR_ACTION_CREATE: '提交修复',
  REPAIR_ACTION_COMPLETE: '完成修复',
  DUPLICATE_RESOLVE: '处置重复',
  INCIDENT_RESOLVE: '解决重大事件',
}

/** 常见目标类型文案映射 */
export const AUDIT_TARGET_TYPE_LABEL: Record<string, string> = {
  EXAM: '考试',
  PAPER_INSTANCE: '试卷实例',
  CANDIDATE_ROSTER: '考生名册',
  QUESTION_TEMPLATE: '题目模板',
  GRADE_RESULT: '题目得分',
  FINAL_SCORE: '最终成绩',
  REVIEW_TASK: '复核任务',
  PROCESSING_TASK: '处理任务',
  IMAGE_LEDGER: '影像账本',
  IMAGE_PAGE: '影像页',
  IMAGE_QUALITY_DECISION: '影像质量决策',
  REPAIR_ACTION: '修复动作',
  PAPER_DUPLICATE_RESOLUTION: '重复试卷处置',
  INCIDENT_RECORD: '重大事件',
}

// ─── 请求 / 响应类型 ────────────────────────────────

/** 审计日志查询请求 - 对应 OperationLogQueryRequest */
export interface OperationLogQueryPayload {
  examId?: string
  operationType?: OperationTypeCode
  targetType?: AuditTargetTypeCode
  targetId?: string
}

/** 审计日志记录 - 对应 ExamOperationLog */
export interface OperationLogVO {
  id: string
  tenantId?: string
  examId?: string
  operationType?: OperationTypeCode
  targetType?: AuditTargetTypeCode
  targetId?: string
  operatorId?: string
  operatorRole?: string
  beforeValue?: string
  afterValue?: string
  reason?: string
  traceId?: string
  createTime?: string
}

/** 重大事件查询请求 - 对应 IncidentQueryRequest */
export interface IncidentQueryPayload {
  examId: string
  unresolvedOnly?: boolean
}

/** 重大事件解决请求 - 对应 IncidentResolveRequest */
export interface IncidentResolvePayload {
  incidentId: string
  resolveNote: string
}

/** 诊断样本查询请求 - 对应 DiagnosticSampleQueryRequest */
export interface DiagnosticSampleQueryPayload {
  examId: string
  sampleType?: string
}

/** 诊断样本类型 */
export type DiagnosticSampleTypeCode
  = | 'OCR_FAILURE'
    | 'GRADING_AMBIGUOUS'
    | 'IMAGE_QUALITY'
    | 'OBJECTIVE_MISMATCH'
    | 'OTHER'

/** 诊断样本文案 */
export const DIAGNOSTIC_SAMPLE_TYPE_LABEL: Record<string, string> = {
  OCR_FAILURE: 'OCR 识别失败',
  GRADING_AMBIGUOUS: '批改歧义',
  IMAGE_QUALITY: '影像质量',
  OBJECTIVE_MISMATCH: '客观题判定不一致',
  OTHER: '其他',
}

/** 诊断样本记录 - 对应 ExamDiagnosticSample */
export interface DiagnosticSampleVO {
  id: string
  tenantId?: string
  examId?: string
  sampleType?: DiagnosticSampleTypeCode
  sourceType?: string
  sourceId?: string
  fileId?: string
  snapshotPayload?: string
  diagnostic?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 重大事件级别选项（与 admin-dashboard 中映射对齐） */
export const INCIDENT_LEVEL_OPTIONS: Array<{ label: string, value: IncidentLevelCode }> = [
  { value: 'BLOCKING', label: '阻断' },
  { value: 'CRITICAL', label: '严重' },
  { value: 'WARNING', label: '警告' },
  { value: 'INFO', label: '提示' },
]

// ─── 接口调用 ────────────────────────────────────────

/**
 * 查询审计日志列表。
 * POST /api/mark/exams/audit/operation-logs
 */
export function listOperationLogs(payload: OperationLogQueryPayload): Promise<OperationLogVO[]> {
  return http.post<OperationLogVO[]>('/api/mark/exams/audit/operation-logs', payload)
}

/**
 * 查询重大事件列表。
 * POST /api/mark/exams/audit/incidents
 */
export function listIncidents(payload: IncidentQueryPayload): Promise<IncidentRecordVO[]> {
  return http.post<IncidentRecordVO[]>('/api/mark/exams/audit/incidents', payload)
}

/**
 * 解决重大事件。
 * POST /api/mark/exams/audit/incidents/resolve
 */
export function resolveIncident(payload: IncidentResolvePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/audit/incidents/resolve', payload)
}

/**
 * 查询诊断样本列表。
 * POST /api/mark/exams/audit/diagnostic-samples
 */
export function listDiagnosticSamples(payload: DiagnosticSampleQueryPayload): Promise<DiagnosticSampleVO[]> {
  return http.post<DiagnosticSampleVO[]>('/api/mark/exams/audit/diagnostic-samples', payload)
}
