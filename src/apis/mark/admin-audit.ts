import type { IncidentLevelCode, IncidentRecordVO, IncidentTypeCode } from '@/apis/mark/admin-dashboard'

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

/** 审计操作类型（与后端 OperationType 对齐） */
export type OperationTypeCode
  = | 'SCORE_CHANGE'
    | 'SCORE_CONFIRM'
    | 'SCORE_PUBLISH'
    | 'SCORE_WITHDRAW'
    | 'REVIEW_REQUEST_HANDLE'
    | 'GRADE_CORRECTION_CREATE'
    | 'QUALITY_OVERRIDE'
    | 'ABSENCE_CONFIRM'
    | 'ABSENCE_REVOKE'
    | 'ABSENCE_RECONCILE'
    | 'DUPLICATE_RESOLVE'
    | 'BINDING_CONFIRM'
    | 'DEANONYMIZE'
    | 'REPAIR_SUBMIT'
    | 'SPOT_CHECK_ABNORMAL'
    | 'BATCH_REPROCESS'
    | 'GRADE_PASSBACK_EXECUTE'
    | 'GRADE_PASSBACK_RECONCILE'
    | 'GRADE_PASSBACK_CALLBACK'
    | 'SYNC_TASK_RETRY'
    | 'SYNC_TASK_CANCEL'
    | 'EXPORT_CREATE'
    | 'EXPORT_START'
    | 'EXPORT_COMPLETE'
    | 'EXPORT_FAIL'
    | 'ARCHIVE_CREATE'
    | 'ARCHIVE_PACKAGE_START'
    | 'ARCHIVE_PACKAGE_COMPLETE'
    | 'ARCHIVE_PACKAGE_FAIL'
    | 'ARCHIVE_APPRAISAL_REQUEST'
    | 'ARCHIVE_APPRAISAL_DECIDE'
    | 'ARCHIVE_RETENTION_EXTEND'
    | 'ARCHIVE_DESTRUCTION_REQUEST'
    | 'ARCHIVE_DESTRUCTION_APPROVE'
    | 'ARCHIVE_DESTROY'

/** 审计操作类型中文文案 */
export const OPERATION_TYPE_LABEL: Record<OperationTypeCode, string> = {
  SCORE_CHANGE: '改分',
  SCORE_CONFIRM: '成绩确认',
  SCORE_PUBLISH: '成绩发布',
  SCORE_WITHDRAW: '成绩撤回',
  REVIEW_REQUEST_HANDLE: '复核申请处理',
  GRADE_CORRECTION_CREATE: '成绩更正创建',
  QUALITY_OVERRIDE: '质检覆盖',
  ABSENCE_CONFIRM: '缺考确认',
  ABSENCE_REVOKE: '缺考撤销',
  ABSENCE_RECONCILE: '缺考核对',
  DUPLICATE_RESOLVE: '重复处置',
  BINDING_CONFIRM: '绑定确认',
  DEANONYMIZE: '解匿名查看',
  REPAIR_SUBMIT: '修复提交',
  SPOT_CHECK_ABNORMAL: '抽检异常确认',
  BATCH_REPROCESS: '异常批次重处理',
  GRADE_PASSBACK_EXECUTE: '成绩回写执行',
  GRADE_PASSBACK_RECONCILE: '成绩回写对账',
  GRADE_PASSBACK_CALLBACK: '成绩回写外部回调',
  SYNC_TASK_RETRY: '教务同步任务重试',
  SYNC_TASK_CANCEL: '教务同步任务取消',
  EXPORT_CREATE: '导出创建',
  EXPORT_START: '导出开始',
  EXPORT_COMPLETE: '导出完成',
  EXPORT_FAIL: '导出失败',
  ARCHIVE_CREATE: '考后归档创建',
  ARCHIVE_PACKAGE_START: '考后归档打包开始',
  ARCHIVE_PACKAGE_COMPLETE: '考后归档打包完成',
  ARCHIVE_PACKAGE_FAIL: '考后归档打包失败',
  ARCHIVE_APPRAISAL_REQUEST: '考后归档申请鉴定',
  ARCHIVE_APPRAISAL_DECIDE: '考后归档鉴定决议',
  ARCHIVE_RETENTION_EXTEND: '考后归档保管期限延长',
  ARCHIVE_DESTRUCTION_REQUEST: '考后归档销毁申请',
  ARCHIVE_DESTRUCTION_APPROVE: '考后归档销毁审批',
  ARCHIVE_DESTROY: '考后归档销毁执行',
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
  sampleType?: DiagnosticSampleTypeCode
}

/** 诊断样本类型 */
export type DiagnosticSampleTypeCode
  = | 'OCR_FAILURE'
    | 'GRADING_AMBIGUOUS'
    | 'IMAGE_QUALITY'
    | 'OBJECTIVE_MISMATCH'
    | 'OTHER'

/** 诊断样本文案 */
export const DIAGNOSTIC_SAMPLE_TYPE_LABEL: Record<DiagnosticSampleTypeCode, string> = {
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
  { value: 'REVIEW_REQUIRED', label: '需复核' },
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
  return http
    .post<unknown>('/api/mark/exams/audit/incidents', payload)
    .then(validateIncidentList)
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

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`审计接口缺少 ${fieldName}`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`审计接口 ${fieldName} 格式错误`)
  }
  return value
}

function requireIncidentType(value: unknown): IncidentTypeCode {
  if (
    value !== 'DUPLICATE_DETECTED'
    && value !== 'BINDING_CONFLICT'
    && value !== 'SCAN_BATCH_REPROCESS'
    && value !== 'SCORE_ANOMALY'
  ) {
    throw new TypeError('审计接口 incidentType 格式错误')
  }
  return value
}

function optionalIncidentLevel(value: unknown): IncidentLevelCode | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (
    value !== 'BLOCKING'
    && value !== 'REVIEW_REQUIRED'
    && value !== 'WARNING'
    && value !== 'INFO'
  ) {
    throw new TypeError('审计接口 incidentLevel 格式错误')
  }
  return value
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`审计接口 ${fieldName} 格式错误`)
  }
  return value
}

function validateIncident(value: unknown): IncidentRecordVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('审计接口重大事件返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    id: requireString(record.id, 'id'),
    tenantId: optionalString(record.tenantId, 'tenantId'),
    examId: requireString(record.examId, 'examId'),
    incidentLevel: optionalIncidentLevel(record.incidentLevel),
    incidentType: requireIncidentType(record.incidentType),
    sourceType: optionalString(record.sourceType, 'sourceType'),
    sourceId: optionalString(record.sourceId, 'sourceId'),
    summary: requireString(record.summary, 'summary'),
    detail: optionalString(record.detail, 'detail'),
    resolved: optionalBoolean(record.resolved, 'resolved'),
    resolvedBy: optionalString(record.resolvedBy, 'resolvedBy'),
    resolvedTime: optionalString(record.resolvedTime, 'resolvedTime'),
    resolveNote: optionalString(record.resolveNote, 'resolveNote'),
    createUser: optionalString(record.createUser, 'createUser'),
    updateUser: optionalString(record.updateUser, 'updateUser'),
    createTime: optionalString(record.createTime, 'createTime'),
    updateTime: optionalString(record.updateTime, 'updateTime'),
  }
}

function validateIncidentList(value: unknown): IncidentRecordVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('审计接口重大事件列表格式错误')
  }
  return value.map(validateIncident)
}
