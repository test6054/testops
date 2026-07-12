/**
 * 阅卷-扫描设备管理 API - 对接 edu-mark/ExamMarkController 的 /scan-devices/* 端点
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端（保持与其他模块一致）
 */
import type { ExamStatusCode, ExamSummaryResponse } from './exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import type { ScannerActivationCodeStatusCode } from '@/types/enums/scanner-activation-code-status-enum'
import type { ScannerAgentDiagnosticStatusCode } from '@/types/enums/scanner-agent-diagnostic-status-enum'
import type { ScannerColorModeCode } from '@/types/enums/scanner-color-mode-enum'
import type { ScannerDuplexModeCode } from '@/types/enums/scanner-duplex-mode-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import { ALL_SCANNER_COLOR_MODE_CODES, ScannerColorModeDescription } from '@/types/enums/scanner-color-mode-enum'
import {
  ALL_SCANNER_DEVICE_STATUS_CODES,
  ScannerDeviceStatusCode,
  ScannerDeviceStatusDescription
} from '@/types/enums/scanner-device-status-enum'
import { ALL_SCANNER_DUPLEX_MODE_CODES, ScannerDuplexModeDescription } from '@/types/enums/scanner-duplex-mode-enum'
import {
  ALL_SCANNER_ENDPOINT_ONLINE_STATUS_CODES,
  ScannerEndpointOnlineStatusCode,
  ScannerEndpointOnlineStatusDescription
} from '@/types/enums/scanner-endpoint-online-status-enum'
import {
  ALL_SCANNER_INTERFACE_MODE_CODES,
  ScannerInterfaceModeCode,
  ScannerInterfaceModeDescription
} from '@/types/enums/scanner-interface-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
/** 扫描 Agent 激活码状态编码 */
export {
  ALL_SCANNER_ACTIVATION_CODE_STATUS_CODES,
  ScannerActivationCodeStatusCode,
  ScannerActivationCodeStatusDescription,
} from '@/types/enums/scanner-activation-code-status-enum'

/** 扫描 Agent 诊断状态编码 */
export {
  ALL_SCANNER_AGENT_DIAGNOSTIC_STATUS_CODES,
  ScannerAgentDiagnosticStatusCode,
  ScannerAgentDiagnosticStatusDescription,
} from '@/types/enums/scanner-agent-diagnostic-status-enum'

export {
  ALL_SCANNER_COLOR_MODE_CODES,
  ScannerColorModeCode,
  ScannerColorModeDescription,
} from '@/types/enums/scanner-color-mode-enum'

export {
  ALL_SCANNER_DEVICE_STATUS_CODES,
  ScannerDeviceStatusCode,
  ScannerDeviceStatusDescription,
} from '@/types/enums/scanner-device-status-enum'

export {
  ALL_SCANNER_DUPLEX_MODE_CODES,
  ScannerDuplexModeCode,
  ScannerDuplexModeDescription,
} from '@/types/enums/scanner-duplex-mode-enum'

/** 接入模式徽标颜色（统一 BadgeTone） */
export const SCANNER_INTERFACE_MODE_TONE: Record<ScannerInterfaceModeCode, BadgeTone> = {
  [ScannerInterfaceModeCode.HTTP_PUSH]: 'blue',
}

export const SCANNER_INTERFACE_MODE_OPTIONS: Array<{
  value: ScannerInterfaceModeCode
  label: string
}> = ALL_SCANNER_INTERFACE_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScannerInterfaceModeDescription, value, '扫描仪接口模式'),
}))

export {
  ALL_SCANNER_ENDPOINT_ONLINE_STATUS_CODES,
  ScannerEndpointOnlineStatusCode,
  ScannerEndpointOnlineStatusDescription,
} from '@/types/enums/scanner-endpoint-online-status-enum'

export {
  ALL_SCANNER_INTERFACE_MODE_CODES,
  ScannerInterfaceModeCode,
  ScannerInterfaceModeDescription,
} from '@/types/enums/scanner-interface-mode-enum'
export const SCANNER_DEVICE_STATUS_TONE: Record<ScannerDeviceStatusCode, BadgeTone> = {
  [ScannerDeviceStatusCode.ACTIVE]: 'green',
  [ScannerDeviceStatusCode.INACTIVE]: 'orange',
  [ScannerDeviceStatusCode.DISABLED]: 'red',
}

export const SCANNER_DEVICE_STATUS_OPTIONS: Array<{
  value: ScannerDeviceStatusCode
  label: string
}> = ALL_SCANNER_DEVICE_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScannerDeviceStatusDescription, value, '扫描仪设备状态'),
}))

/** 设备状态颜色（统一 BadgeTone） */
export const SCANNER_ENDPOINT_ONLINE_STATUS_TONE: Record<
  ScannerEndpointOnlineStatusCode,
  BadgeTone
> = {
  [ScannerEndpointOnlineStatusCode.ONLINE]: 'green',
  [ScannerEndpointOnlineStatusCode.OFFLINE]: 'orange',
}

export const SCANNER_ENDPOINT_ONLINE_STATUS_OPTIONS: Array<{
  value: ScannerEndpointOnlineStatusCode
  label: string
}> = ALL_SCANNER_ENDPOINT_ONLINE_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ScannerEndpointOnlineStatusDescription, value, '扫描端点在线状态'),
}))

export const SCANNER_COLOR_MODE_OPTIONS: Array<{ value: ScannerColorModeCode, label: string }>
  = ALL_SCANNER_COLOR_MODE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ScannerColorModeDescription, value, '扫描色彩模式'),
  }))

export const SCANNER_DUPLEX_MODE_OPTIONS: Array<{ value: ScannerDuplexModeCode, label: string }>
  = ALL_SCANNER_DUPLEX_MODE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(ScannerDuplexModeDescription, value, '单面/双面扫描方式'),
  }))

/** 扫描设备分页查询请求 - 对应 ExamScannerDeviceQueryRequest */
export interface ExamScannerDeviceQueryRequest extends QueryDto {
  status?: ScannerDeviceStatusCode
  scannerDeviceIdKeyword?: string
  location?: string
  interfaceMode?: ScannerInterfaceModeCode
}

/** 扫描设备物理位置筛选项 - 对应 ExamScannerDeviceLocationOptionResponse */
export interface ExamScannerDeviceLocationOptionResponse {
  location: string
}

/** 扫描设备视图 - 对应 ExamScannerDeviceResponse */
export interface ExamScannerDeviceResponse {
  id: string
  scannerDeviceId: string
  scannerStationId: string
  scannerIp?: string
  deviceName: string
  status: ScannerDeviceStatusCode
  interfaceMode: ScannerInterfaceModeCode
  pushTokenMasked?: string
  manufacturer?: string
  model?: string
  location?: string
  lastSeenTime?: string
  endpointOnlineStatus?: ScannerEndpointOnlineStatusCode
  endpointMachineCode?: string
  endpointName?: string
  agentVersion?: string
  clientVersion?: string
  scannerConnected?: boolean
  pendingJobCount?: number
  pendingUploadPageCount?: number
  diagnosticStatus?: ScannerAgentDiagnosticStatusCode
  diagnosticMessage?: string
  lastHeartbeatTime?: string
  kioskLockEnabled: boolean
  remark?: string
  webSupplementEnabled?: boolean
  createTime?: string
  updateTime?: string
}

/** 扫描 Agent 激活码创建请求 */
export interface ExamScannerActivationCodeCreateRequest {
  deviceId: string
  expireMinutes?: number
}

/** 扫描 Agent 激活码响应 */
export interface ExamScannerActivationCodeResponse {
  id: string
  scannerDeviceId: string
  scannerStationId: string
  activationCode: string
  status: ScannerActivationCodeStatusCode
  expireTime: string
}

/** 扫描设备详情视图 - 对应 ExamScannerDeviceDetailResponse */
export interface ExamScannerDeviceDetailResponse extends ExamScannerDeviceResponse {
  pushToken?: string
  pushUrl?: string
  authorizationHeader?: string
}

/** 扫描设备激活码交接响应 - 对应 ExamScannerDeviceActivationHandoffResponse */
export interface ExamScannerDeviceActivationHandoffResponse {
  id: string
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  activationCode?: string
  expireTime?: string
}

/** 扫描设备 token 响应 - 对应 ExamScannerDeviceTokenResponse（历史接口，教师侧不再使用） */
export interface ExamScannerDeviceTokenVO {
  id: string
  pushToken: string
  pushUrl: string
  authorizationHeader: string
}

/** 扫描设备创建请求 - 对应 ExamScannerDeviceCreateRequest */
export interface ExamScannerDeviceCreateRequest {
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  scannerIp?: string
  status?: ScannerDeviceStatusCode
  manufacturer?: string
  model?: string
  location?: string
  remark?: string
  kioskLockEnabled: boolean
}

/** 扫描设备更新请求 - 对应 ExamScannerDeviceUpdateRequest */
export interface ExamScannerDeviceUpdateRequest {
  id: string
  deviceName: string
  scannerIp?: string
  status?: ScannerDeviceStatusCode
  manufacturer?: string
  model?: string
  location?: string
  remark?: string
  kioskLockEnabled: boolean
  webSupplementEnabled: boolean
}

// ScanAttentionQueryRequest / ScanAttentionItemResponse 定义在 @/apis/mark/exam-scan，避免重复

/** 试卷身份批量绑定单项请求 - 对应 ExamPaperBatchBindItemRequest */
export interface ExamPaperBatchBindItemRequest {
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId: string
  attemptStatus: AttemptStatusCode
  attemptNo?: string
}

/** 试卷身份批量绑定请求 - 对应 ExamPaperBatchBindRequest */
export interface ExamPaperBatchBindRequest {
  examId: string
  scanBatchId: string
  items: ExamPaperBatchBindItemRequest[]
}

/** 试卷身份批量绑定单项结果 - 对应 ExamPaperBatchBindItemResponse */
export interface ExamPaperBatchBindItemResponse {
  paperInstanceId: string
  success: boolean
  errorMessage?: string
}

/** 试卷身份批量绑定结果 - 对应 ExamPaperBatchBindResponse */
export interface ExamPaperBatchBindResponse {
  successCount: number
  failureCount: number
  items: ExamPaperBatchBindItemResponse[]
}

/**
 * 分页查询当前租户的扫描设备
 * POST /api/mark/exams/scan-devices/list
 */
export function pageScannerDevices(
  request: ExamScannerDeviceQueryRequest,
): Promise<PageResult<ExamScannerDeviceResponse>> {
  return http.post<PageResult<ExamScannerDeviceResponse>>('/api/mark/exams/scan-devices/list', request)
}

/** 扫描设备汇总统计 - 对齐 ExamScannerDeviceSummaryResponse */
export interface ExamScannerDeviceSummaryResponse {
  totalCount: number
  onlineCount: number
  agentActivatedCount: number
}

/**
 * 按与 list 相同的筛选条件汇总扫描设备在线与 Agent 激活计数
 * POST /api/mark/exams/scan-devices/summary
 */
export function summarizeScannerDevices(
  request: ExamScannerDeviceQueryRequest,
): Promise<ExamScannerDeviceSummaryResponse> {
  return http.post<ExamScannerDeviceSummaryResponse>('/api/mark/exams/scan-devices/summary', request)
}

/**
 * 查询当前租户扫描设备物理位置选项
 * POST /api/mark/exams/scan-devices/locations
 */
export function listScannerDeviceLocations(): Promise<ExamScannerDeviceLocationOptionResponse[]> {
  return http.post<ExamScannerDeviceLocationOptionResponse[]>(
    '/api/mark/exams/scan-devices/locations',
    {},
  )
}

/**
 * 创建扫描设备（HTTP_PUSH 模式自动生成 push_token）
 * POST /api/mark/exams/scan-devices/create
 */
export function createScannerDevice(
  request: ExamScannerDeviceCreateRequest,
): Promise<ExamScannerDeviceActivationHandoffResponse> {
  return http.post<ExamScannerDeviceActivationHandoffResponse>(
    '/api/mark/exams/scan-devices/create',
    request,
  )
}

/**
 * 更新扫描设备
 * POST /api/mark/exams/scan-devices/update
 */
export function updateScannerDevice(
  request: ExamScannerDeviceUpdateRequest,
): Promise<ExamScannerDeviceActivationHandoffResponse> {
  return http.post<ExamScannerDeviceActivationHandoffResponse>(
    '/api/mark/exams/scan-devices/update',
    request,
  )
}

/**
 * 删除扫描设备（逻辑删除）
 * POST /api/mark/exams/scan-devices/delete
 */
export function deleteScannerDevice(id: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scan-devices/delete', { id })
}

/**
 * 解绑扫描设备当前 Agent 端点
 * POST /api/mark/exams/scan-devices/agent-unbind
 */
export function unbindScannerDeviceAgent(id: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scan-devices/agent-unbind', { id })
}

/**
 * 查询扫描设备详情（HTTP_PUSH 模式包含明文 push_token 与推荐推送 URL）
 * POST /api/mark/exams/scan-devices/detail
 */
export function getScannerDeviceDetail(id: string): Promise<ExamScannerDeviceDetailResponse> {
  return http.post<ExamScannerDeviceDetailResponse>('/api/mark/exams/scan-devices/detail', { id })
}

/**
 * 重置扫描设备 push_token（仅 HTTP_PUSH 模式可用）
 * POST /api/mark/exams/scan-devices/reset-token
 */
export function resetScannerDevicePushToken(
  id: string,
): Promise<ExamScannerDeviceActivationHandoffResponse> {
  return http.post<ExamScannerDeviceActivationHandoffResponse>(
    '/api/mark/exams/scan-devices/reset-token',
    { id },
  )
}

/**
 * 生成扫描 Agent 一次性激活码
 * POST /api/mark/exams/scan-devices/activation-code/create
 */
export function createScannerActivationCode(
  request: ExamScannerActivationCodeCreateRequest,
): Promise<ExamScannerActivationCodeResponse> {
  return http.post<ExamScannerActivationCodeResponse>(
    '/api/mark/exams/scan-devices/activation-code/create',
    request,
  )
}

// listScanAttentions 定义在 @/apis/mark/exam，避免重复

// 考生名册分页查询见 @/apis/mark/exam-scope pageExamCandidates

/**
 * 批量确认试卷和考生身份绑定关系
 * POST /api/mark/exams/papers/batch-bind
 */
export function batchBindPapers(
  request: ExamPaperBatchBindRequest,
): Promise<ExamPaperBatchBindResponse> {
  return http.post<ExamPaperBatchBindResponse>('/api/mark/exams/papers/batch-bind', request)
}

// ─── 考试列表（供设备管理选择关联考试） ─────────────────────────────────

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface MarkExamPageQueryRequest extends QueryDto {
  /** 课程ID（可选筛选） */
  courseId?: string
  status?: ExamStatusCode
  academicYear?: string
  semester?: SemesterCode
  /** 班级 ID；按考试参考班级范围过滤 */
  classId?: string
  /** 参考院系 ID；按考试参考院系过滤 */
  referenceDepartmentId?: string
  /** 开课学年；用于跨考试分析按课程实际开课周期过滤 */
  teachingAcademicYear?: string
  /** 创建时间范围下界 */
  startTime?: string
  /** 创建时间范围上界 */
  endTime?: string
  /** 开课学期；用于跨考试分析按课程实际开课周期过滤 */
  teachingSemester?: SemesterCode
  keyword?: string
}

/**
 * 分页查询考试列表（ACTIVE 状态）
 * POST /api/mark/exams/page
 */
export function pageMarkExams(
  request: MarkExamPageQueryRequest,
): Promise<PageResult<ExamSummaryResponse>> {
  return http.post<PageResult<ExamSummaryResponse>>('/api/mark/exams/page', request)
}

const ACTIVE_SCANNER_DEVICE_PAGE_SIZE = 100

/** 扫描 Agent 端点在线（最近心跳在服务端超时窗口内）；scannerConnected 仅表示物理扫描仪连接，不能替代端点在线。 */
export function isScannerDeviceOnline(device: ExamScannerDeviceResponse): boolean {
  return device.endpointOnlineStatus === ScannerEndpointOnlineStatusCode.ONLINE
}

/** 分页拉取当前租户全部 ACTIVE 扫描设备。 */
export async function listActiveScannerDevices(): Promise<ExamScannerDeviceResponse[]> {
  const items: ExamScannerDeviceResponse[] = []
  let pageNum = 1
  while (true) {
    const result = await pageScannerDevices({
      pageNum,
      pageSize: ACTIVE_SCANNER_DEVICE_PAGE_SIZE,
      status: ScannerDeviceStatusCode.ACTIVE,
    })
    items.push(...result.list)
    if (items.length >= result.total) {
      break
    }
    pageNum += 1
  }
  return items
}
