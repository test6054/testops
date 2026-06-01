import type { IncidentRecordVO } from '@/apis/mark/admin-dashboard'
import type { PageResult, QueryDto } from '@/types'

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

/** 审计目标类型（与后端 AuditTargetType JSON 编码完全对齐） */
export type AuditTargetTypeCode
  = | 'EXAM'
    | 'EXAM_QUESTION_GRADE_RESULT'
    | 'EXAM_FINAL_SCORE'
    | 'ABSENCE_RECORD'
    | 'GRADE_REVIEW_REQUEST'
    | 'GRADE_CORRECTION'
    | 'MARKING_TASK'
    | 'EXAM_PAPER_INSTANCE'
    | 'SCAN_BATCH'
    | 'SYNC_TASK'
    | 'PASSBACK_RECORD'
    | 'EXAM_EXPORT_TASK'
    | 'EXAM_ARCHIVE_PACKAGE'

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

/** 审计操作类型下拉选项，值来源必须与 OperationTypeCode 完全一致 */
export const OPERATION_TYPE_OPTIONS: Array<{ label: string, value: OperationTypeCode }> = [
  { value: 'SCORE_CHANGE', label: OPERATION_TYPE_LABEL.SCORE_CHANGE },
  { value: 'SCORE_CONFIRM', label: OPERATION_TYPE_LABEL.SCORE_CONFIRM },
  { value: 'SCORE_PUBLISH', label: OPERATION_TYPE_LABEL.SCORE_PUBLISH },
  { value: 'SCORE_WITHDRAW', label: OPERATION_TYPE_LABEL.SCORE_WITHDRAW },
  { value: 'REVIEW_REQUEST_HANDLE', label: OPERATION_TYPE_LABEL.REVIEW_REQUEST_HANDLE },
  { value: 'GRADE_CORRECTION_CREATE', label: OPERATION_TYPE_LABEL.GRADE_CORRECTION_CREATE },
  { value: 'QUALITY_OVERRIDE', label: OPERATION_TYPE_LABEL.QUALITY_OVERRIDE },
  { value: 'ABSENCE_CONFIRM', label: OPERATION_TYPE_LABEL.ABSENCE_CONFIRM },
  { value: 'ABSENCE_REVOKE', label: OPERATION_TYPE_LABEL.ABSENCE_REVOKE },
  { value: 'ABSENCE_RECONCILE', label: OPERATION_TYPE_LABEL.ABSENCE_RECONCILE },
  { value: 'DUPLICATE_RESOLVE', label: OPERATION_TYPE_LABEL.DUPLICATE_RESOLVE },
  { value: 'BINDING_CONFIRM', label: OPERATION_TYPE_LABEL.BINDING_CONFIRM },
  { value: 'DEANONYMIZE', label: OPERATION_TYPE_LABEL.DEANONYMIZE },
  { value: 'REPAIR_SUBMIT', label: OPERATION_TYPE_LABEL.REPAIR_SUBMIT },
  { value: 'SPOT_CHECK_ABNORMAL', label: OPERATION_TYPE_LABEL.SPOT_CHECK_ABNORMAL },
  { value: 'BATCH_REPROCESS', label: OPERATION_TYPE_LABEL.BATCH_REPROCESS },
  { value: 'GRADE_PASSBACK_EXECUTE', label: OPERATION_TYPE_LABEL.GRADE_PASSBACK_EXECUTE },
  { value: 'GRADE_PASSBACK_RECONCILE', label: OPERATION_TYPE_LABEL.GRADE_PASSBACK_RECONCILE },
  { value: 'GRADE_PASSBACK_CALLBACK', label: OPERATION_TYPE_LABEL.GRADE_PASSBACK_CALLBACK },
  { value: 'SYNC_TASK_RETRY', label: OPERATION_TYPE_LABEL.SYNC_TASK_RETRY },
  { value: 'SYNC_TASK_CANCEL', label: OPERATION_TYPE_LABEL.SYNC_TASK_CANCEL },
  { value: 'EXPORT_CREATE', label: OPERATION_TYPE_LABEL.EXPORT_CREATE },
  { value: 'EXPORT_START', label: OPERATION_TYPE_LABEL.EXPORT_START },
  { value: 'EXPORT_COMPLETE', label: OPERATION_TYPE_LABEL.EXPORT_COMPLETE },
  { value: 'EXPORT_FAIL', label: OPERATION_TYPE_LABEL.EXPORT_FAIL },
  { value: 'ARCHIVE_CREATE', label: OPERATION_TYPE_LABEL.ARCHIVE_CREATE },
  { value: 'ARCHIVE_PACKAGE_START', label: OPERATION_TYPE_LABEL.ARCHIVE_PACKAGE_START },
  { value: 'ARCHIVE_PACKAGE_COMPLETE', label: OPERATION_TYPE_LABEL.ARCHIVE_PACKAGE_COMPLETE },
  { value: 'ARCHIVE_PACKAGE_FAIL', label: OPERATION_TYPE_LABEL.ARCHIVE_PACKAGE_FAIL },
  { value: 'ARCHIVE_APPRAISAL_REQUEST', label: OPERATION_TYPE_LABEL.ARCHIVE_APPRAISAL_REQUEST },
  { value: 'ARCHIVE_APPRAISAL_DECIDE', label: OPERATION_TYPE_LABEL.ARCHIVE_APPRAISAL_DECIDE },
  { value: 'ARCHIVE_RETENTION_EXTEND', label: OPERATION_TYPE_LABEL.ARCHIVE_RETENTION_EXTEND },
  { value: 'ARCHIVE_DESTRUCTION_REQUEST', label: OPERATION_TYPE_LABEL.ARCHIVE_DESTRUCTION_REQUEST },
  { value: 'ARCHIVE_DESTRUCTION_APPROVE', label: OPERATION_TYPE_LABEL.ARCHIVE_DESTRUCTION_APPROVE },
  { value: 'ARCHIVE_DESTROY', label: OPERATION_TYPE_LABEL.ARCHIVE_DESTROY },
]

/** 审计目标类型文案映射，与后端 AuditTargetType JSON 编码完全一致 */
export const AUDIT_TARGET_TYPE_LABEL: Record<AuditTargetTypeCode, string> = {
  EXAM: '考试',
  EXAM_QUESTION_GRADE_RESULT: '题目批改结果',
  EXAM_FINAL_SCORE: '最终成绩',
  ABSENCE_RECORD: '缺考记录',
  GRADE_REVIEW_REQUEST: '复核申请',
  GRADE_CORRECTION: '成绩更正',
  MARKING_TASK: '阅卷任务',
  EXAM_PAPER_INSTANCE: '试卷实例',
  SCAN_BATCH: '扫描批次',
  SYNC_TASK: '教务同步任务',
  PASSBACK_RECORD: '成绩回写记录',
  EXAM_EXPORT_TASK: '导出任务',
  EXAM_ARCHIVE_PACKAGE: '考后归档包',
}

// ─── 请求 / 响应类型 ────────────────────────────────

/** 审计日志查询请求 - 对应 OperationLogQueryRequest */
export interface OperationLogQueryRequest extends QueryDto {
  examId?: string
  operationType?: OperationTypeCode
  targetType?: AuditTargetTypeCode
  targetId?: string
}

/** 审计日志记录 - 对应 OperationLogResponse */
export interface OperationLogVO {
  id: string
  examId: string
  operationType: OperationTypeCode
  targetType: AuditTargetTypeCode
  targetId: string
  targetLabel: string
  operatorId: string
  operatorName: string
  operatorRole: string
  reason: string
  traceId?: string
  createTime: string
}

/** 重大事件查询请求 - 对应 IncidentQueryRequest */
export interface IncidentQueryRequest {
  examId: string
  unresolvedOnly?: boolean
}

/** 重大事件解决请求 - 对应 IncidentResolveRequest */
export interface IncidentResolveRequest {
  incidentId: string
  resolveNote: string
}

/** 诊断样本查询请求 - 对应 DiagnosticSampleQueryRequest */
export interface DiagnosticSampleQueryRequest {
  examId: string
  sampleType?: DiagnosticSampleTypeCode
}

/** 诊断样本类型 */
export type DiagnosticSampleTypeCode
  = | 'OCR_CONFLICT'
    | 'IQA_EDGE'
    | 'AI_DRIFT'
    | 'BINDING_AMBIGUOUS'

/** 诊断样本来源类型 */
export type DiagnosticSourceTypeCode
  = | 'SCANNED_PAGE'
    | 'RESPONSE_SLICE'
    | 'GRADE_RESULT'
    | 'RECOGNITION_RESULT'

/** 诊断样本文案 */
export const DIAGNOSTIC_SAMPLE_TYPE_LABEL: Record<DiagnosticSampleTypeCode, string> = {
  OCR_CONFLICT: 'OCR 冲突',
  IQA_EDGE: 'IQA 边界',
  AI_DRIFT: 'AI 漂移',
  BINDING_AMBIGUOUS: '绑定歧义',
}

/** 诊断样本类型下拉选项，值来源必须与 DiagnosticSampleTypeCode 完全一致 */
export const DIAGNOSTIC_SAMPLE_TYPE_OPTIONS: Array<{
  label: string
  value: DiagnosticSampleTypeCode
}> = [
  { value: 'OCR_CONFLICT', label: DIAGNOSTIC_SAMPLE_TYPE_LABEL.OCR_CONFLICT },
  { value: 'IQA_EDGE', label: DIAGNOSTIC_SAMPLE_TYPE_LABEL.IQA_EDGE },
  { value: 'AI_DRIFT', label: DIAGNOSTIC_SAMPLE_TYPE_LABEL.AI_DRIFT },
  { value: 'BINDING_AMBIGUOUS', label: DIAGNOSTIC_SAMPLE_TYPE_LABEL.BINDING_AMBIGUOUS },
]

/** 诊断样本记录 - 对应 DiagnosticSampleResponse */
export interface DiagnosticSampleVO {
  id: string
  examId: string
  sampleType: DiagnosticSampleTypeCode
  sourceType: DiagnosticSourceTypeCode
  sourceId: string
  fileId?: string
  diagnostic: string
  createUser?: string
  updateUser?: string
  createTime: string
  updateTime?: string
}
// ─── 接口调用 ────────────────────────────────────────

/**
 * 查询审计日志列表。
 * POST /api/mark/exams/audit/operation-logs
 */
export function listOperationLogs(
  request: OperationLogQueryRequest,
): Promise<PageResult<OperationLogVO>> {
  return http.post<PageResult<OperationLogVO>>('/api/mark/exams/audit/operation-logs', request)
}

/**
 * 查询重大事件列表。
 * POST /api/mark/exams/audit/incidents
 */
export function listIncidents(request: IncidentQueryRequest): Promise<IncidentRecordVO[]> {
  return http.post<IncidentRecordVO[]>('/api/mark/exams/audit/incidents', request)
}

/**
 * 解决重大事件。
 * POST /api/mark/exams/audit/incidents/resolve
 */
export function resolveIncident(request: IncidentResolveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/audit/incidents/resolve', request)
}

/**
 * 查询诊断样本列表。
 * POST /api/mark/exams/audit/diagnostic-samples
 */
export function listDiagnosticSamples(
  request: DiagnosticSampleQueryRequest,
): Promise<DiagnosticSampleVO[]> {
  return http.post<DiagnosticSampleVO[]>('/api/mark/exams/audit/diagnostic-samples', request)
}
