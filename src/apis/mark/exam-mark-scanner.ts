/**
 * 阅卷-扫描设备管理 API - 对接 edu-mark/ExamMarkController 的 /scan-devices/* 端点
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端（保持与其他模块一致）
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

/** 接入模式编码 - 对应后端 ScannerInterfaceMode 枚举 */
export type ScannerInterfaceModeCode = 'HTTP_PUSH' | 'SANE_PULL'

/** 接入模式文案映射 */
export const SCANNER_INTERFACE_MODE_LABEL: Record<ScannerInterfaceModeCode, string> = {
  HTTP_PUSH: 'HTTP 推送',
  SANE_PULL: 'SANE 主动采集',
}

/** 接入模式徽标颜色（统一 BadgeTone） */
export const SCANNER_INTERFACE_MODE_COLOR: Record<ScannerInterfaceModeCode, BadgeTone> = {
  HTTP_PUSH: 'blue',
  SANE_PULL: 'green',
}

/** 设备状态编码 */
export type ScannerDeviceStatusCode = 'ACTIVE' | 'INACTIVE' | 'DISABLED'

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

/** 扫描设备查询请求 - 对应 ExamScannerDeviceQueryRequest */
export interface ExamScannerDeviceQueryPayload {
  status?: string
  scannerDeviceIdKeyword?: string
  interfaceMode?: ScannerInterfaceModeCode
}

/** 扫描设备视图 - 对应 ExamScannerDeviceResponse */
export interface ExamScannerDeviceVO {
  id: string
  scannerDeviceId?: string
  scannerStationId?: string
  scannerIp?: string
  deviceName?: string
  status?: ScannerDeviceStatusCode
  interfaceMode?: ScannerInterfaceModeCode
  pushTokenMasked?: string
  saneHost?: string
  sanePort?: number
  saneDeviceName?: string
  saneResolution?: number
  saneColorMode?: string
  saneDuplexMode?: string
  defaultExamId?: string
  defaultClassIds?: string[]
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
  diagnosticStatus?: string
  diagnosticMessage?: string
  lastHeartbeatAt?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

/** 扫描 Agent 激活码创建请求 */
export interface ExamScannerActivationCodeCreatePayload {
  deviceId: string
  expireMinutes?: number
}

/** 扫描 Agent 激活码响应 */
export interface ExamScannerActivationCodeVO {
  id: string
  scannerDeviceId?: string
  scannerStationId?: string
  activationCode?: string
  status?: string
  expireAt?: string
}

/** 扫描设备详情视图 - 对应 ExamScannerDeviceDetailResponse */
export interface ExamScannerDeviceDetailVO extends ExamScannerDeviceVO {
  pushToken?: string
  pushUrl?: string
  authorizationHeader?: string
}

/** 扫描设备 token 响应 - 对应 ExamScannerDeviceTokenResponse */
export interface ExamScannerDeviceTokenVO {
  id: string
  pushToken?: string
  pushUrl?: string
  authorizationHeader?: string
}

/** 扫描设备创建请求 - 对应 ExamScannerDeviceCreateRequest */
export interface ExamScannerDeviceCreatePayload {
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  interfaceMode: ScannerInterfaceModeCode
  scannerIp?: string
  status?: ScannerDeviceStatusCode
  /** SANE_PULL 模式必填 */
  saneHost?: string
  sanePort?: number
  saneDeviceName?: string
  saneResolution?: number
  saneColorMode?: ScannerColorModeCode
  saneDuplexMode?: ScannerDuplexModeCode
  /** HTTP_PUSH 模式可选 */
  defaultExamId?: string
  defaultClassIds?: string[]
  manufacturer?: string
  model?: string
  location?: string
  remark?: string
}

/** 扫描设备更新请求 - 对应 ExamScannerDeviceUpdateRequest */
export interface ExamScannerDeviceUpdatePayload {
  id: string
  deviceName: string
  interfaceMode: ScannerInterfaceModeCode
  scannerIp?: string
  status?: ScannerDeviceStatusCode
  saneHost?: string
  sanePort?: number
  saneDeviceName?: string
  saneResolution?: number
  saneColorMode?: ScannerColorModeCode
  saneDuplexMode?: ScannerDuplexModeCode
  defaultExamId?: string
  defaultClassIds?: string[]
  manufacturer?: string
  model?: string
  location?: string
  remark?: string
}

/** SANE 主动采集触发请求 - 对应 ExamScannerSaneTriggerRequest */
export interface ExamScannerSaneTriggerPayload {
  deviceId: string
  examId: string
  declaredClassIds: string[]
  expectedPages: number
  batchExternalNo?: string
  resolutionOverride?: number
  colorModeOverride?: ScannerColorModeCode
  duplexModeOverride?: ScannerDuplexModeCode
}

/** SANE 主动采集触发响应 - 对应 ExamScannerSaneTriggerResponse */
export interface ExamScannerSaneTriggerVO {
  scanBatchId: string
  fileId?: string
  fileIds?: string[]
  pageCount?: number
  fileHash?: string
}

/** 扫描异常类型编码 */
export type ScanAttentionTypeCode
  = | 'QUALITY_BLOCK'
    | 'PROCESSING_BLOCK'
    | 'DUPLICATE_PENDING'
    | 'RECOGNITION_REVIEW'

// ScanAttentionQueryPayload / ScanAttentionItemVO 定义在 @/apis/mark/exam，避免重复

// ExamCandidateVO 定义在 @/apis/mark/exam，避免重复

/** 试卷身份批量绑定单项请求 - 对应 ExamPaperBatchBindItemRequest */
export interface ExamPaperBatchBindItemPayload {
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId: string
  attemptStatus?: 'NORMAL' | 'MAKEUP' | 'RETAKE' | string
  attemptNo?: string
}

/** 试卷身份批量绑定请求 - 对应 ExamPaperBatchBindRequest */
export interface ExamPaperBatchBindPayload {
  examId: string
  scanBatchId: string
  items: ExamPaperBatchBindItemPayload[]
}

/** 试卷身份批量绑定单项结果 - 对应 ExamPaperBatchBindItemResponse */
export interface ExamPaperBatchBindItemResultVO {
  paperInstanceId?: string
  success?: boolean
  errorMessage?: string
}

/** 试卷身份批量绑定结果 - 对应 ExamPaperBatchBindResponse */
export interface ExamPaperBatchBindResultVO {
  successCount?: number
  failureCount?: number
  items?: ExamPaperBatchBindItemResultVO[]
}

/**
 * 列出当前租户的扫描设备
 * POST /api/mark/exams/scan-devices/list
 */
export function listScannerDevices(
  payload?: ExamScannerDeviceQueryPayload,
): Promise<ExamScannerDeviceVO[]> {
  return http.post<ExamScannerDeviceVO[]>('/api/mark/exams/scan-devices/list', payload ?? {})
}

/**
 * 创建扫描设备（HTTP_PUSH 模式自动生成 push_token）
 * POST /api/mark/exams/scan-devices/create
 */
export function createScannerDevice(
  payload: ExamScannerDeviceCreatePayload,
): Promise<ExamScannerDeviceTokenVO> {
  return http.post<ExamScannerDeviceTokenVO>('/api/mark/exams/scan-devices/create', payload)
}

/**
 * 更新扫描设备
 * POST /api/mark/exams/scan-devices/update
 */
export function updateScannerDevice(payload: ExamScannerDeviceUpdatePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scan-devices/update', payload)
}

/**
 * 删除扫描设备（逻辑删除）
 * POST /api/mark/exams/scan-devices/delete
 */
export function deleteScannerDevice(id: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scan-devices/delete', { id })
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
export function resetScannerDevicePushToken(id: string): Promise<ExamScannerDeviceTokenVO> {
  return http.post<ExamScannerDeviceTokenVO>('/api/mark/exams/scan-devices/reset-token', { id })
}

/**
 * 生成扫描 Agent 一次性激活码
 * POST /api/mark/exams/scan-devices/activation-code/create
 */
export function createScannerActivationCode(
  payload: ExamScannerActivationCodeCreatePayload,
): Promise<ExamScannerActivationCodeVO> {
  return http.post<ExamScannerActivationCodeVO>(
    '/api/mark/exams/scan-devices/activation-code/create',
    payload,
  )
}

/**
 * 触发 SANE 主动采集（仅 SANE_PULL 模式可用）
 * POST /api/mark/exams/scan-devices/sane-scan
 */
export function triggerSaneScan(
  payload: ExamScannerSaneTriggerPayload,
): Promise<ExamScannerSaneTriggerVO> {
  return http.post<ExamScannerSaneTriggerVO>('/api/mark/exams/scan-devices/sane-scan', payload)
}

// listScanAttentions 定义在 @/apis/mark/exam，避免重复

// listExamCandidates 定义在 @/apis/mark/exam，避免重复

/**
 * 批量确认试卷和考生身份绑定关系
 * POST /api/mark/exams/papers/batch-bind
 */
export function batchBindPapers(
  payload: ExamPaperBatchBindPayload,
): Promise<ExamPaperBatchBindResultVO> {
  return http.post<ExamPaperBatchBindResultVO>('/api/mark/exams/papers/batch-bind', payload)
}

// ─── 考试列表（供设备管理选择关联考试） ─────────────────────────────────

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface MarkExamSummaryVO {
  examId: string
  examName: string
  examNo?: string
  status: string
  statusMessage?: string
  examStartTime?: string
  examEndTime?: string
  createTime?: string
}

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface MarkExamPageQueryPayload {
  pageNum: number
  pageSize: number
  status?: string
  createUserId?: string | null
  keyword?: string
}

/** 分页结果 */
export interface MarkExamPageResult {
  list: MarkExamSummaryVO[]
  total: number
}

/**
 * 分页查询考试列表（ACTIVE 状态）
 * POST /api/mark/exams/page
 */
export function pageMarkExams(
  payload: MarkExamPageQueryPayload,
): Promise<MarkExamPageResult> {
  return http.post<MarkExamPageResult>('/api/mark/exams/page', payload)
}
