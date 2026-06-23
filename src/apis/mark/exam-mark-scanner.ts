/**
 * 阅卷-扫描设备管理 API - 对接 edu-mark/ExamMarkController 的 /scan-devices/* 端点
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端（保持与其他模块一致）
 */
import type { ExamStatusCode } from './exam'
import type { ScanAttentionTypeCode } from './exam-scan'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'
import { readPageList, readPageTotal } from '@/utils/page-result'

/** 接入模式编码 - 对应后端 ScannerInterfaceMode 枚举 */
export type ScannerInterfaceModeCode = 'HTTP_PUSH'

/** 接入模式文案映射 */
export const SCANNER_INTERFACE_MODE_LABEL: Record<ScannerInterfaceModeCode, string> = {
  HTTP_PUSH: '一体机 Agent',
}

/** 接入模式徽标颜色（统一 BadgeTone） */
export const SCANNER_INTERFACE_MODE_COLOR: Record<ScannerInterfaceModeCode, BadgeTone> = {
  HTTP_PUSH: 'blue',
}

/** 设备状态编码 */
export type ScannerDeviceStatusCode = 'ACTIVE' | 'INACTIVE' | 'DISABLED'

/** 扫描 Agent 激活码状态编码 */
export type ScannerActivationCodeStatusCode = 'UNUSED' | 'USED' | 'EXPIRED'

/** 设备状态文案 */
export const SCANNER_DEVICE_STATUS_LABEL: Record<ScannerDeviceStatusCode, string> = {
  ACTIVE: '启用',
  INACTIVE: '停用',
  DISABLED: '禁用',
}

/** 设备状态颜色（统一 BadgeTone） */
export const SCANNER_DEVICE_STATUS_COLOR: Record<ScannerDeviceStatusCode, BadgeTone> = {
  ACTIVE: 'green',
  INACTIVE: 'orange',
  DISABLED: 'red',
}

/** Agent 在线状态编码 */
export type ScannerEndpointOnlineStatusCode = 'ONLINE' | 'OFFLINE'

/** 扫描 Agent 诊断状态编码 */
export type ScannerAgentDiagnosticStatusCode = 'OK' | 'WARNING' | 'ERROR' | 'AGENT_OFFLINE'

/** Agent 在线状态文案 */
export const SCANNER_ENDPOINT_ONLINE_STATUS_LABEL: Record<ScannerEndpointOnlineStatusCode, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
}

/** Agent 在线状态颜色 */
export const SCANNER_ENDPOINT_ONLINE_STATUS_COLOR: Record<ScannerEndpointOnlineStatusCode, BadgeTone> = {
  ONLINE: 'green',
  OFFLINE: 'orange',
}

/** 色彩模式 */
export type ScannerColorModeCode = 'COLOR' | 'GRAY' | 'LINEART'

/** 双面模式 */
export type ScannerDuplexModeCode = 'SIMPLEX' | 'DUPLEX'

/** 扫描设备分页查询请求 - 对应 ExamScannerDeviceQueryRequest */
export interface ExamScannerDeviceQueryRequest extends QueryDto {
  status?: ScannerDeviceStatusCode
  scannerDeviceIdKeyword?: string
  location?: string
  interfaceMode?: ScannerInterfaceModeCode
}

/** 扫描设备物理位置筛选项 - 对应 ExamScannerDeviceLocationOptionResponse */
export interface ExamScannerDeviceLocationOptionVO {
  location: string
}

/** 扫描设备视图 - 对应 ExamScannerDeviceResponse */
export interface ExamScannerDeviceVO {
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
  lastSeenAt?: string
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
  lastHeartbeatAt?: string
  kioskLockEnabled: boolean
  remark?: string
  createTime?: string
  updateTime?: string
}

/** 扫描 Agent 激活码创建请求 */
export interface ExamScannerActivationCodeCreateRequest {
  deviceId: string
  expireMinutes?: number
}

/** 扫描 Agent 激活码响应 */
export interface ExamScannerActivationCodeVO {
  id: string
  scannerDeviceId: string
  scannerStationId: string
  activationCode: string
  status: ScannerActivationCodeStatusCode
  expireAt: string
}

/** 扫描设备详情视图 - 对应 ExamScannerDeviceDetailResponse */
export interface ExamScannerDeviceDetailVO extends ExamScannerDeviceVO {
  pushToken?: string
  pushUrl?: string
  authorizationHeader?: string
}

/** 扫描设备激活码交接响应 - 对应 ExamScannerDeviceActivationHandoffResponse */
export interface ExamScannerDeviceActivationHandoffVO {
  id: string
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  activationCode?: string
  expireAt?: string
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
}

// ScanAttentionQueryRequest / ScanAttentionItemVO 定义在 @/apis/mark/exam，避免重复
export type { ScanAttentionTypeCode }

// ExamCandidateVO 定义在 @/apis/mark/exam，避免重复

/** 试卷身份批量绑定单项请求 - 对应 ExamPaperBatchBindItemRequest */
export interface ExamPaperBatchBindItemRequest {
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId: string
  attemptStatus: 'NORMAL' | 'MAKEUP' | 'RETAKE'
  attemptNo?: string
}

/** 试卷身份批量绑定请求 - 对应 ExamPaperBatchBindRequest */
export interface ExamPaperBatchBindRequest {
  examId: string
  scanBatchId: string
  items: ExamPaperBatchBindItemRequest[]
}

/** 试卷身份批量绑定单项结果 - 对应 ExamPaperBatchBindItemResponse */
export type ExamPaperBatchBindItemResultVO
  = | {
    paperInstanceId: string
    success: true
    errorMessage?: undefined
  }
  | {
  paperInstanceId: string
    success: false
    errorMessage: string
  }

/** 试卷身份批量绑定结果 - 对应 ExamPaperBatchBindResponse */
export interface ExamPaperBatchBindResultVO {
  successCount: number
  failureCount: number
  items: ExamPaperBatchBindItemResultVO[]
}

/**
 * 分页查询当前租户的扫描设备
 * POST /api/mark/exams/scan-devices/list
 */
export function pageScannerDevices(
  request: ExamScannerDeviceQueryRequest,
): Promise<PageResult<ExamScannerDeviceVO>> {
  return http.post<PageResult<ExamScannerDeviceVO>>('/api/mark/exams/scan-devices/list', request)
}

/**
 * 查询当前租户扫描设备物理位置选项
 * POST /api/mark/exams/scan-devices/locations
 */
export function listScannerDeviceLocations(): Promise<ExamScannerDeviceLocationOptionVO[]> {
  return http.post<ExamScannerDeviceLocationOptionVO[]>('/api/mark/exams/scan-devices/locations', {})
}

/**
 * 创建扫描设备（HTTP_PUSH 模式自动生成 push_token）
 * POST /api/mark/exams/scan-devices/create
 */
export function createScannerDevice(
  request: ExamScannerDeviceCreateRequest,
): Promise<ExamScannerDeviceActivationHandoffVO> {
  return http.post<ExamScannerDeviceActivationHandoffVO>('/api/mark/exams/scan-devices/create', request)
}

/**
 * 更新扫描设备
 * POST /api/mark/exams/scan-devices/update
 */
export function updateScannerDevice(
  request: ExamScannerDeviceUpdateRequest,
): Promise<ExamScannerDeviceActivationHandoffVO> {
  return http.post<ExamScannerDeviceActivationHandoffVO>('/api/mark/exams/scan-devices/update', request)
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
export function getScannerDeviceDetail(id: string): Promise<ExamScannerDeviceDetailVO> {
  return http.post<ExamScannerDeviceDetailVO>('/api/mark/exams/scan-devices/detail', { id })
}

/**
 * 重置扫描设备 push_token（仅 HTTP_PUSH 模式可用）
 * POST /api/mark/exams/scan-devices/reset-token
 */
export function resetScannerDevicePushToken(id: string): Promise<ExamScannerDeviceActivationHandoffVO> {
  return http.post<ExamScannerDeviceActivationHandoffVO>('/api/mark/exams/scan-devices/reset-token', { id })
}

/**
 * 生成扫描 Agent 一次性激活码
 * POST /api/mark/exams/scan-devices/activation-code/create
 */
export function createScannerActivationCode(
  request: ExamScannerActivationCodeCreateRequest,
): Promise<ExamScannerActivationCodeVO> {
  return http.post<ExamScannerActivationCodeVO>(
    '/api/mark/exams/scan-devices/activation-code/create',
    request,
  )
}

// listScanAttentions 定义在 @/apis/mark/exam，避免重复

// listExamCandidates 定义在 @/apis/mark/exam，避免重复

/**
 * 批量确认试卷和考生身份绑定关系
 * POST /api/mark/exams/papers/batch-bind
 */
export function batchBindPapers(
  request: ExamPaperBatchBindRequest,
): Promise<ExamPaperBatchBindResultVO> {
  return http.post<ExamPaperBatchBindResultVO>('/api/mark/exams/papers/batch-bind', request)
}

// ─── 考试列表（供设备管理选择关联考试） ─────────────────────────────────

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface MarkExamSummaryVO {
  examId: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  createTime?: string
}

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface MarkExamPageQueryRequest extends QueryDto {
  /** 课程ID（可选筛选） */
  courseId?: string
  status?: ExamStatusCode
  academicYear?: string
  semester?: string
  createUserId?: string | null
  keyword?: string
}

/**
 * 分页查询考试列表（ACTIVE 状态）
 * POST /api/mark/exams/page
 */
export function pageMarkExams(
  request: MarkExamPageQueryRequest,
): Promise<PageResult<MarkExamSummaryVO>> {
  return http.post<PageResult<MarkExamSummaryVO>>('/api/mark/exams/page', request)
}

const ACTIVE_SCANNER_DEVICE_PAGE_SIZE = 100

/** 扫描 Agent 端点在线，或扫描组件已连接，视为当前可监控设备。 */
export function isScannerDeviceOnline(device: ExamScannerDeviceVO): boolean {
  return device.endpointOnlineStatus === 'ONLINE' || device.scannerConnected === true
}

/** 分页拉取当前租户全部 ACTIVE 扫描设备。 */
export async function listActiveScannerDevices(): Promise<ExamScannerDeviceVO[]> {
  const items: ExamScannerDeviceVO[] = []
  let pageNum = 1
  while (true) {
    const result = await pageScannerDevices({
      pageNum,
      pageSize: ACTIVE_SCANNER_DEVICE_PAGE_SIZE,
      status: 'ACTIVE',
    })
    items.push(...readPageList(result, '扫描设备列表加载失败'))
    if (items.length >= readPageTotal(result, '扫描设备列表加载失败')) {
      break
    }
    pageNum += 1
  }
  return items
}
