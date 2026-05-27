/**
 * 阅卷-扫描设备管理 API - 对接 edu-mark/ExamMarkController 的 /scan-devices/* 端点
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端（保持与其他模块一致）
 */
import type { ExamStatusCode, ScanAttentionTypeCode } from './exam'
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
  scannerDeviceId: string
  scannerStationId: string
  scannerIp?: string
  deviceName: string
  status: ScannerDeviceStatusCode
  interfaceMode: ScannerInterfaceModeCode
  pushTokenMasked?: string
  saneHost?: string
  sanePort?: number
  saneDeviceName?: string
  saneResolution?: number
  saneColorMode?: ScannerColorModeCode
  saneDuplexMode?: ScannerDuplexModeCode
  defaultExamId?: string
  defaultClassIds: string[]
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
  kioskLockEnabled: boolean
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
  scannerDeviceId: string
  scannerStationId: string
  activationCode: string
  status: string
  expireAt: string
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
  pushToken: string
  pushUrl: string
  authorizationHeader: string
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
  /** 一体机 Kiosk 锁是否启用 */
  kioskLockEnabled: boolean
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
  /** 一体机 Kiosk 锁是否启用 */
  kioskLockEnabled: boolean
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
  pageCount: number
  fileHash?: string
}

// ScanAttentionQueryPayload / ScanAttentionItemVO 定义在 @/apis/mark/exam，避免重复
export type { ScanAttentionTypeCode }

// ExamCandidateVO 定义在 @/apis/mark/exam，避免重复

/** 试卷身份批量绑定单项请求 - 对应 ExamPaperBatchBindItemRequest */
export interface ExamPaperBatchBindItemPayload {
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId: string
  attemptStatus: 'NORMAL' | 'MAKEUP' | 'RETAKE'
  attemptNo?: string
}

/** 试卷身份批量绑定请求 - 对应 ExamPaperBatchBindRequest */
export interface ExamPaperBatchBindPayload {
  examId: string
  scanBatchId: string
  items: ExamPaperBatchBindItemPayload[]
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
 * 列出当前租户的扫描设备
 * POST /api/mark/exams/scan-devices/list
 */
export function listScannerDevices(
  payload: ExamScannerDeviceQueryPayload,
): Promise<ExamScannerDeviceVO[]> {
  return http.post<unknown>('/api/mark/exams/scan-devices/list', payload)
    .then(validateScannerDeviceList)
}

/**
 * 创建扫描设备（HTTP_PUSH 模式自动生成 push_token）
 * POST /api/mark/exams/scan-devices/create
 */
export function createScannerDevice(
  payload: ExamScannerDeviceCreatePayload,
): Promise<ExamScannerDeviceTokenVO> {
  return http.post<unknown>('/api/mark/exams/scan-devices/create', payload)
    .then(validateScannerDeviceToken)
}

/**
 * 更新扫描设备
 * POST /api/mark/exams/scan-devices/update
 */
export function updateScannerDevice(payload: ExamScannerDeviceUpdatePayload): Promise<boolean> {
  return http.post<unknown>('/api/mark/exams/scan-devices/update', payload)
    .then(validateBooleanResult)
}

/**
 * 删除扫描设备（逻辑删除）
 * POST /api/mark/exams/scan-devices/delete
 */
export function deleteScannerDevice(id: string): Promise<boolean> {
  return http.post<unknown>('/api/mark/exams/scan-devices/delete', { id })
    .then(validateBooleanResult)
}

/**
 * 解绑扫描设备当前 Agent 端点
 * POST /api/mark/exams/scan-devices/agent-unbind
 */
export function unbindScannerDeviceAgent(id: string): Promise<boolean> {
  return http.post<unknown>('/api/mark/exams/scan-devices/agent-unbind', { id })
    .then(validateBooleanResult)
}

/**
 * 查询扫描设备详情（HTTP_PUSH 模式包含明文 push_token 与推荐推送 URL）
 * POST /api/mark/exams/scan-devices/detail
 */
export function getScannerDeviceDetail(id: string): Promise<ExamScannerDeviceDetailVO> {
  return http.post<unknown>('/api/mark/exams/scan-devices/detail', { id })
    .then(validateScannerDeviceDetail)
}

/**
 * 重置扫描设备 push_token（仅 HTTP_PUSH 模式可用）
 * POST /api/mark/exams/scan-devices/reset-token
 */
export function resetScannerDevicePushToken(id: string): Promise<ExamScannerDeviceTokenVO> {
  return http.post<unknown>('/api/mark/exams/scan-devices/reset-token', { id })
    .then(validateScannerDeviceToken)
}

/**
 * 生成扫描 Agent 一次性激活码
 * POST /api/mark/exams/scan-devices/activation-code/create
 */
export function createScannerActivationCode(
  payload: ExamScannerActivationCodeCreatePayload,
): Promise<ExamScannerActivationCodeVO> {
  return http.post<unknown>(
    '/api/mark/exams/scan-devices/activation-code/create',
    payload,
  ).then(validateScannerActivationCode)
}

/**
 * 触发 SANE 主动采集（仅 SANE_PULL 模式可用）
 * POST /api/mark/exams/scan-devices/sane-scan
 */
export function triggerSaneScan(
  payload: ExamScannerSaneTriggerPayload,
): Promise<ExamScannerSaneTriggerVO> {
  return http.post<unknown>('/api/mark/exams/scan-devices/sane-scan', payload)
    .then(validateSaneTriggerResult)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateBooleanResult(value: unknown): boolean {
  return requireBoolean(value, '操作结果')
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalFiniteNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalSanePort(value: unknown, fieldName: string): number | undefined {
  const port = optionalFiniteNumber(value, fieldName)
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return port
}

function optionalSaneResolution(value: unknown, fieldName: string): number | undefined {
  const resolution = optionalFiniteNumber(value, fieldName)
  if (resolution !== undefined && resolution < 300) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return resolution
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireStringList(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalStringList(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireInterfaceMode(value: unknown, fieldName: string): ScannerInterfaceModeCode {
  if (value !== 'HTTP_PUSH' && value !== 'SANE_PULL') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireDeviceStatus(value: unknown, fieldName: string): ScannerDeviceStatusCode {
  if (value !== 'ACTIVE' && value !== 'INACTIVE' && value !== 'DISABLED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireExamStatus(value: unknown, fieldName: string): ExamStatusCode {
  if (value !== 'ACTIVE' && value !== 'CLOSED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalEndpointOnlineStatus(
  value: unknown,
  fieldName: string,
): ScannerEndpointOnlineStatusCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== 'ONLINE' && value !== 'OFFLINE') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalScannerColorMode(
  value: unknown,
  fieldName: string,
): ScannerColorModeCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== 'COLOR' && value !== 'GRAY' && value !== 'LINEART') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalScannerDuplexMode(
  value: unknown,
  fieldName: string,
): ScannerDuplexModeCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== 'SIMPLEX' && value !== 'DUPLEX') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateScannerDevice(value: unknown): ExamScannerDeviceVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描设备接口返回格式错误')
  }
  const device = value as Record<string, unknown>
  return {
    id: requireString(device.id, '扫描设备 ID'),
    scannerDeviceId: requireString(device.scannerDeviceId, '扫描设备业务 ID'),
    scannerStationId: requireString(device.scannerStationId, '扫描站点 ID'),
    scannerIp: optionalString(device.scannerIp, '扫描仪 IP'),
    deviceName: requireString(device.deviceName, '扫描设备名称'),
    status: requireDeviceStatus(device.status, '扫描设备状态'),
    interfaceMode: requireInterfaceMode(device.interfaceMode, '扫描接入模式'),
    pushTokenMasked: optionalString(device.pushTokenMasked, 'push_token 掩码'),
    saneHost: optionalString(device.saneHost, 'SANE 主机'),
    sanePort: optionalSanePort(device.sanePort, 'SANE 端口'),
    saneDeviceName: optionalString(device.saneDeviceName, 'SANE 设备名'),
    saneResolution: optionalSaneResolution(device.saneResolution, 'SANE 分辨率'),
    saneColorMode: optionalScannerColorMode(device.saneColorMode, 'SANE 色彩模式'),
    saneDuplexMode: optionalScannerDuplexMode(device.saneDuplexMode, 'SANE 双面模式'),
    defaultExamId: optionalString(device.defaultExamId, '默认考试 ID'),
    defaultClassIds: requireStringList(device.defaultClassIds, '默认归属班级 ID'),
    manufacturer: optionalString(device.manufacturer, '设备厂商'),
    model: optionalString(device.model, '设备型号'),
    location: optionalString(device.location, '设备位置'),
    lastSeenAt: optionalString(device.lastSeenAt, '最近通讯时间'),
    endpointOnlineStatus: optionalEndpointOnlineStatus(device.endpointOnlineStatus, 'Agent 在线状态'),
    endpointMachineCode: optionalString(device.endpointMachineCode, 'Agent 机器码'),
    endpointName: optionalString(device.endpointName, 'Agent 端点名称'),
    agentVersion: optionalString(device.agentVersion, 'Agent 版本'),
    clientVersion: optionalString(device.clientVersion, 'WebView2 客户端版本'),
    scannerConnected: optionalBoolean(device.scannerConnected, '本地扫描仪连接状态'),
    pendingJobCount: optionalFiniteNumber(device.pendingJobCount, '本地待处理任务数'),
    pendingUploadPageCount: optionalFiniteNumber(device.pendingUploadPageCount, '待上传页数'),
    diagnosticStatus: optionalString(device.diagnosticStatus, 'Agent 诊断状态'),
    diagnosticMessage: optionalString(device.diagnosticMessage, 'Agent 诊断信息'),
    lastHeartbeatAt: optionalString(device.lastHeartbeatAt, '最近心跳时间'),
    kioskLockEnabled: requireBoolean(device.kioskLockEnabled, 'Kiosk 防误触锁'),
    remark: optionalString(device.remark, '设备维护备注'),
    createTime: optionalString(device.createTime, '创建时间'),
    updateTime: optionalString(device.updateTime, '更新时间'),
  }
}

function validateScannerDeviceList(value: unknown): ExamScannerDeviceVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('扫描设备列表接口返回格式错误')
  }
  return value.map(validateScannerDevice)
}

function validateScannerDeviceToken(value: unknown): ExamScannerDeviceTokenVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描设备 token 接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    id: requireString(result.id, '扫描设备 ID'),
    pushToken: requireString(result.pushToken, 'push_token'),
    pushUrl: requireString(result.pushUrl, '推送 URL'),
    authorizationHeader: requireString(result.authorizationHeader, 'Authorization 请求头'),
  }
}

function validateScannerDeviceDetail(value: unknown): ExamScannerDeviceDetailVO {
  const device = validateScannerDevice(value)
  const detail = value as Record<string, unknown>
  return {
    ...device,
    pushToken: optionalString(detail.pushToken, '明文 push_token'),
    pushUrl: optionalString(detail.pushUrl, '推荐推送 URL'),
    authorizationHeader: optionalString(detail.authorizationHeader, '推荐 Authorization 请求头'),
  }
}

function validateScannerActivationCode(value: unknown): ExamScannerActivationCodeVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描 Agent 激活码接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    id: requireString(result.id, '激活码 ID'),
    scannerDeviceId: requireString(result.scannerDeviceId, '扫描设备业务 ID'),
    scannerStationId: requireString(result.scannerStationId, '扫描站点 ID'),
    activationCode: requireString(result.activationCode, '激活码'),
    status: requireString(result.status, '激活码状态'),
    expireAt: requireString(result.expireAt, '激活码过期时间'),
  }
}

function validateSaneTriggerResult(value: unknown): ExamScannerSaneTriggerVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('SANE 采集结果接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    scanBatchId: requireString(result.scanBatchId, '扫描批次 ID'),
    fileId: optionalString(result.fileId, '扫描文件 ID'),
    fileIds: optionalStringList(result.fileIds, '扫描文件 ID 列表'),
    pageCount: requireFiniteNumber(result.pageCount, '扫描页数'),
    fileHash: optionalString(result.fileHash, '扫描文件哈希'),
  }
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
  return http.post<unknown>('/api/mark/exams/papers/batch-bind', payload)
    .then(validateBatchBindResult)
}

// ─── 考试列表（供设备管理选择关联考试） ─────────────────────────────────

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface MarkExamSummaryVO {
  examId: string
  examName: string
  examNo?: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  createTime?: string
}

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface MarkExamPageQueryPayload {
  pageNum: number
  pageSize: number
  /** 课程ID（可选筛选） */
  courseId?: string
  status?: ExamStatusCode
  academicYear?: string
  semester?: string
  createUserId?: string | null
  keyword?: string
}

/** 分页结果 */
export interface MarkExamPageResult {
  list: MarkExamSummaryVO[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
}

/**
 * 分页查询考试列表（ACTIVE 状态）
 * POST /api/mark/exams/page
 */
export function pageMarkExams(
  payload: MarkExamPageQueryPayload,
): Promise<MarkExamPageResult> {
  return http.post<unknown>('/api/mark/exams/page', payload)
    .then(validateMarkExamPageResult)
}

function validateBatchBindItemResult(value: unknown): ExamPaperBatchBindItemResultVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('批量绑定单项结果接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  const success = requireBoolean(result.success, '绑定结果')
  const paperInstanceId = requireString(result.paperInstanceId, '试卷实例 ID')
  if (!success) {
    return {
      paperInstanceId,
      success,
      errorMessage: requireString(result.errorMessage, '失败原因'),
    }
  }
  return {
    paperInstanceId,
    success,
  }
}

function validateBatchBindResult(value: unknown): ExamPaperBatchBindResultVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('批量绑定结果接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  const items = result.items
  if (!Array.isArray(items)) {
    throw new TypeError('批量绑定明细接口返回格式错误')
  }
  return {
    successCount: requireFiniteNumber(result.successCount, '批量绑定成功数'),
    failureCount: requireFiniteNumber(result.failureCount, '批量绑定失败数'),
    items: items.map(validateBatchBindItemResult),
  }
}

function validateMarkExamSummary(value: unknown): MarkExamSummaryVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考试列表项接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    examId: requireString(result.examId, '考试 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: optionalString(result.examNo, '考试编号'),
    academicYear: optionalString(result.academicYear, '学年'),
    semester: optionalString(result.semester, '学期'),
    status: requireExamStatus(result.status, '考试状态'),
    statusMessage: requireString(result.statusMessage, '考试状态文案'),
    examStartTime: optionalString(result.examStartTime, '考试开始时间'),
    examEndTime: optionalString(result.examEndTime, '考试结束时间'),
    createTime: optionalString(result.createTime, '创建时间'),
  }
}

function validateMarkExamPageResult(value: unknown): MarkExamPageResult {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考试分页接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  const list = result.list
  if (!Array.isArray(list)) {
    throw new TypeError('考试分页列表接口返回格式错误')
  }
  return {
    list: list.map(validateMarkExamSummary),
    total: requireFiniteNumber(result.total, '考试分页总数'),
    pageNum: requireFiniteNumber(result.pageNum, '考试分页页码'),
    pageSize: requireFiniteNumber(result.pageSize, '考试分页每页数量'),
    pages: requireFiniteNumber(result.pages, '考试分页总页数'),
  }
}
