import type { ExamIncidentRecord } from '@/apis/mark/admin-dashboard'
import type { PageResult, QueryDto } from '@/types'
import type { AuditTargetTypeCode } from '@/types/enums/audit-target-type-enum'
import type { DiagnosticSampleTypeCode } from '@/types/enums/diagnostic-sample-type-enum'
import type { DiagnosticSourceTypeCode } from '@/types/enums/diagnostic-source-type-enum'
import type { OperationTypeCode } from '@/types/enums/operation-type-enum'
import http from '@/config/axios'
import {
  ALL_DIAGNOSTIC_SAMPLE_TYPE_CODES,
  DiagnosticSampleTypeDescription,
} from '@/types/enums/diagnostic-sample-type-enum'
import {
  ALL_OPERATION_TYPE_CODES,
  OperationTypeDescription,
} from '@/types/enums/operation-type-enum'

export {
  ALL_AUDIT_TARGET_TYPE_CODES,
  AuditTargetTypeCode,
  AuditTargetTypeDescription,
} from '@/types/enums/audit-target-type-enum'
export {
  ALL_DIAGNOSTIC_SAMPLE_TYPE_CODES,
  DIAGNOSTIC_SAMPLE_TYPE_TONE,
  DiagnosticSampleTypeCode,
  DiagnosticSampleTypeDescription,
} from '@/types/enums/diagnostic-sample-type-enum'
export {
  ALL_DIAGNOSTIC_SOURCE_TYPE_CODES,
  DiagnosticSourceTypeCode,
  DiagnosticSourceTypeDescription,
} from '@/types/enums/diagnostic-source-type-enum'
export {
  ALL_OPERATION_TYPE_CODES,
  OPERATION_TYPE_TONE,
  OperationTypeCode,
  OperationTypeDescription,
} from '@/types/enums/operation-type-enum'

/** 审计操作类型下拉选项，值来源必须与 OperationTypeCode 完全一致 */
export const OPERATION_TYPE_OPTIONS: Array<{ label: string, value: OperationTypeCode }>
  = ALL_OPERATION_TYPE_CODES.map((value) => ({
    value,
    label: OperationTypeDescription[value],
  }))

/** 诊断样本类型下拉选项，值来源必须与 DiagnosticSampleTypeCode 完全一致 */
export const DIAGNOSTIC_SAMPLE_TYPE_OPTIONS: Array<{
  label: string
  value: DiagnosticSampleTypeCode
}> = ALL_DIAGNOSTIC_SAMPLE_TYPE_CODES.map((value) => ({
  value,
  label: DiagnosticSampleTypeDescription[value],
}))

/** 审计日志查询请求 - 对应 OperationLogQueryRequest */
export interface OperationLogQueryRequest extends QueryDto {
  examId?: string
  operationType?: OperationTypeCode
  targetType?: AuditTargetTypeCode
  targetId?: string
}

/** 审计日志记录 - 对应 OperationLogResponse */
export interface OperationLogResponse {
  id: string
  examId: string
  operationType: OperationTypeCode
  targetType: AuditTargetTypeCode
  targetId: string
  targetLabel: string
  createUser: string
  operatorName: string
  operatorRole: string
  reason: string
  traceId?: string
  createTime: string
}

/** 重大事件查询请求 - 对应 IncidentQueryRequest */
export interface IncidentQueryRequest extends QueryDto {
  examId: string
  unresolvedOnly?: boolean
}

/** 重大事件解决请求 - 对应 IncidentResolveRequest */
export interface IncidentResolveRequest {
  incidentId: string
  resolveNote: string
}

/** 诊断样本查询请求 - 对应 DiagnosticSampleQueryRequest */
export interface DiagnosticSampleQueryRequest extends QueryDto {
  examId: string
  sampleType?: DiagnosticSampleTypeCode
}

/** 诊断样本记录 - 对应 DiagnosticSampleResponse */
export interface DiagnosticSampleResponse {
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
): Promise<PageResult<OperationLogResponse>> {
  return http.post<PageResult<OperationLogResponse>>(
    '/api/mark/exams/audit/operation-logs',
    request,
  )
}

/**
 * 查询重大事件列表。
 * POST /api/mark/exams/audit/incidents
 */
export function listIncidents(
  request: IncidentQueryRequest,
): Promise<PageResult<ExamIncidentRecord>> {
  return http.post<PageResult<ExamIncidentRecord>>('/api/mark/exams/audit/incidents', request)
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
): Promise<PageResult<DiagnosticSampleResponse>> {
  return http.post<PageResult<DiagnosticSampleResponse>>(
    '/api/mark/exams/audit/diagnostic-samples',
    request,
  )
}
