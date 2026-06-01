import type { ExamScannerKioskContextVO, ScannerKioskScanMode } from './scanner-kiosk'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:18761'

type LocalAgentJsonValue
  = | string
    | number
    | boolean
    | null
    | LocalAgentJsonObject
    | LocalAgentJsonValue[]

interface LocalAgentJsonObject {
  [key: string]: LocalAgentJsonValue | undefined
}

export interface LocalApiResult {
  success: boolean
  code: string
  message: string
  data?: LocalAgentJsonValue
  traceId: string
}

export interface AgentHealthResponse {
  status: AgentHealthStatus
  agentVersion: string
  machineCode: string
  bound: boolean
  scannerConnected: boolean
  pendingUploadJobs: number
  diagnosticStatus: AgentDiagnosticStatus
  diagnosticMessage: string
  /** 服务端要求 Agent / WebView2 客户端升级时为 true */
  upgradeRequired: boolean
  /** 服务端要求的 Agent 最低版本 */
  minimumAgentVersion: string
  /** 服务端公告的 Agent 最新版本 */
  latestAgentVersion: string
  /** 服务端要求的 WebView2 客户端最低版本 */
  minimumClientVersion: string
  /** 服务端公告的 WebView2 客户端最新版本 */
  latestClientVersion: string
  /** 服务端最近一次心跳是否允许扫描 */
  scanAllowed: boolean
  /** 服务端要求重置 token，需要重新激活 */
  tokenResetRequired: boolean
  /** 最近一次成功心跳的本地时间（ISO 字符串） */
  lastHeartbeatAt: string | null
}

export type AgentHealthStatus = 'RUNNING'

export type AgentDiagnosticStatus = 'OK' | 'WARNING'

export type LocalScanJobStatus
  = | 'CREATED'
    | 'SCANNING'
    | 'PAUSED'
    | 'READYTOUPLOAD'
    | 'UPLOADING'
    | 'REPORTED'
    | 'FAILED'
    | 'RETRYING'
    | 'CANCELLED'

export type LocalScanPageStatus
  = | 'CAPTURED'
    | 'PREPROCESSED'
    | 'UPLOADING'
    | 'UPLOADED'
    | 'FAILED'
    | 'DELETED'

export interface ScannerDeviceInfo {
  localScannerId: string
  displayName: string
  driverType: string
  supportsAdf: boolean
  supportsDuplex: boolean
  available: boolean
  diagnostic?: string
}

export interface ScannerListResponse {
  devices: ScannerDeviceInfo[]
}

export interface ActivateLocalAgentRequest {
  gatewayBaseUrl: string
  activationCode: string
  endpointName: string
}

export interface ScannerAgentActivateResponse {
  scannerDeviceId: string
  scannerStationId: string
  tenantId?: string
  deviceName: string
  gatewayBaseUrl: string
  /** edu-mark 逐页上报相对路径（断点续传主链） */
  pushPageUrl: string
  /** edu-mark 批次提交相对路径 */
  pushCommitUrl: string
  /** 设备级 push token（edu-mark 验签） */
  pushToken: string
  /** edu-mark 推送接口 Authorization 请求头模板，例如 "Bearer xxx" */
  pushAuthorizationHeader: string
  /** edu-storage 扫描页上传相对路径 */
  storageUploadUrl: string
  /** edu-storage 设备级上传 token（edu-storage 验签） */
  storageUploadToken: string
  /** edu-storage 上传 Authorization 请求头模板 */
  storageUploadAuthorizationHeader: string
  defaultExamId?: string
  defaultClassIds: string[]
  /** 一体机 Kiosk 锁是否启用 */
  kioskLockEnabled: boolean
  activatedAt: string
  minimumAgentVersion: string
  latestAgentVersion: string
}

/**
 * 扫描仪正在执行其他任务时本地 Agent 抛出的错误。
 * 由于 SingleFlightGate 同一时刻只允许一个扫描，并发请求会立即被拒绝并返回当前活动 jobId。
 */
export class ScannerBusyError extends Error {
  readonly activeJobId: string

  constructor(message: string, activeJobId: string) {
    super(message)
    this.name = 'ScannerBusyError'
    this.activeJobId = activeJobId
  }
}

/**
 * 从 Agent 返回的错误消息中识别 BUSY 提示并提取活动 jobId。
 * Agent 抛出的格式为：扫描仪正在执行其他扫描任务（{activeJobId}），请等待完成后重试。
 */
function tryParseBusyError(message: string): ScannerBusyError | null {
  if (!message) {
    return null
  }
  if (!message.includes('扫描仪正在执行其他扫描任务')) {
    return null
  }
  const match = message.match(/[（(]([^（）()]+)[）)]/)
  if (!match || !match[1].trim()) {
    return null
  }
  const activeJobId = match[1].trim()
  return new ScannerBusyError(message, activeJobId)
}

export interface StartScanJobRequest {
  context: ExamScannerKioskContextVO
  localScannerId: string
  /** 后端 /scanner/kiosk/batch/start 签发的批次外部号 */
  batchExternalNo: string
  expectedPages?: number
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  /**
   * 是否替换目标页（仅 SUPPLEMENT 模式有效）。
   * true 表示后端会把同一 (paperInstance, templatePageNo) 上的旧扫描页置为 SUPERSEDED，
   * false 表示纯追加补扫（保留旧页）。
   */
  replaceTargetPage: boolean
}

export interface ScanPageInfo {
  pageNo: number
  status: LocalScanPageStatus
  sizeBytes: number
  diagnostic?: string
  capturedAt: string
  uploadedAt?: string
  uploadedFileId?: string
}

export interface ScanJobResponse {
  scanJobId: string
  /** 当前扫描任务所属考试 ID，Agent 边界按字符串返回 */
  examId: string
  /** 当前扫描任务声明的班级范围，顺序必须与 Kiosk 上下文一致 */
  declaredClassIds: string[]
  scannerDeviceId: string
  scannerStationId: string
  batchExternalNo: string
  scanBatchId?: string
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  /** 是否替换目标页（仅 SUPPLEMENT 模式生效） */
  replaceTargetPage: boolean
  status: LocalScanJobStatus
  scannedPages: number
  uploadedPages: number
  reported: boolean
  message: string
  pages: ScanPageInfo[]
}

export interface ScanJobListResponse {
  jobs: ScanJobResponse[]
}

export interface ListScanJobsParams {
  examId?: string
  scannerDeviceId?: string
  scannerStationId?: string
  includeTerminal?: boolean
}

export function getLocalAgentBaseUrl() {
  const value = import.meta.env.VITE_SCANNER_AGENT_URL
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/\/$/, '')
    : DEFAULT_AGENT_BASE_URL
}

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  return validateAgentHealthResponse(await localAgentGet('/api/agent/health'))
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  return validateScannerListResponse(await localAgentGet('/api/scanners'))
}

export async function activateLocalAgent(
  request: ActivateLocalAgentRequest,
): Promise<ScannerAgentActivateResponse> {
  return validateScannerAgentActivateResponse(await localAgentPost('/api/agent/activate', request))
}

export async function unbindLocalAgent(): Promise<{ success: boolean }> {
  return validateSuccessObject(await localAgentPost('/api/agent/unbind', {}))
}

export async function startScanJob(request: StartScanJobRequest): Promise<ScanJobResponse> {
  return validateScanJobResponse(await localAgentPost('/api/scan-jobs/start', request))
}

export async function getScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentGet(`/api/scan-jobs/${encodeURIComponent(scanJobId)}`),
  )
}

export async function listScanJobs(params: ListScanJobsParams = {}): Promise<ScanJobListResponse> {
  const query = new URLSearchParams()
  if (params.examId) {
    query.set('examId', params.examId)
  }
  if (params.scannerDeviceId) {
    query.set('scannerDeviceId', params.scannerDeviceId)
  }
  if (params.scannerStationId) {
    query.set('scannerStationId', params.scannerStationId)
  }
  if (typeof params.includeTerminal === 'boolean') {
    query.set('includeTerminal', String(params.includeTerminal))
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return validateScanJobListResponse(await localAgentGet(`/api/scan-jobs${suffix}`))
}

export async function cancelScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/cancel`, {}),
  )
}

export async function retryUpload(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-upload`, {}),
  )
}

/**
 * 暂停指定扫描任务。Agent 端将状态切换为 Paused，扫描循环停止追加页面，
 * UploadWorker 也跳过该任务，直到调用 resumeScanJob 恢复。
 */
export async function pauseScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/pause`, {}),
  )
}

/**
 * 恢复被暂停的扫描任务。仅 Paused 任务可被恢复；其它状态原样返回。
 */
export async function resumeScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/resume`, {}),
  )
}

/**
 * 结束本批次。手工停止仍在扫描的任务并把已采集页面交给上传链路，
 * 不丢弃已扫页面（与 cancelScanJob 不同）。
 */
export async function endBatch(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/end-batch`, {}),
  )
}

/**
 * 重试 commit。把已 push 但 commit 未确认的任务重新放回 Retrying。
 * 利用后端 reportId / batchExternalNo 唯一约束的幂等性。
 */
export async function retryCommit(scanJobId: string): Promise<ScanJobResponse> {
  return validateScanJobResponse(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-commit`, {}),
  )
}

/**
 * 删除尚未上报后端的 Agent 本地扫描任务。仅清理本地 metadata + 影像文件，
 * 不调用后端废弃接口；已上报任务必须先由前端废弃服务端批次，成功后再清理 Agent 本地任务。
 */
export async function deleteScanJob(scanJobId: string): Promise<boolean> {
  return validateBooleanResult(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/delete`, {}),
  )
}

/**
 * 废弃已上报的扫描任务：后端批次已由前端用户态废弃成功后，
 * Agent 仅清理本地任务数据。
 *
 * @param scanJobId Agent 本地扫描任务 ID
 * @param discardReason 废弃原因（必填，1-255 字）
 */
export async function discardScanJob(scanJobId: string, discardReason: string): Promise<boolean> {
  return validateBooleanResult(
    await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/discard`, {
      discardReason,
    }),
  )
}

export function getPageImageUrl(scanJobId: string, pageNo: number): string {
  return `${getLocalAgentBaseUrl()}/api/scan-jobs/${encodeURIComponent(scanJobId)}/pages/${pageNo}/image`
}

export function openDiagnosticsExport() {
  window.open(`${getLocalAgentBaseUrl()}/api/diagnostics/export`, '_blank', 'noopener,noreferrer')
}

async function localAgentGet(path: string): Promise<LocalAgentJsonValue> {
  const response = await fetch(`${getLocalAgentBaseUrl()}${path}`, {
    method: 'GET',
  })
  return await parseLocalAgentResponse(response)
}

async function localAgentPost(path: string, requestBody: object): Promise<LocalAgentJsonValue> {
  const response = await fetch(`${getLocalAgentBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  return await parseLocalAgentResponse(response)
}

async function parseLocalAgentResponse(response: Response): Promise<LocalAgentJsonValue> {
  const text = await response.text()
  let parsed: LocalAgentJsonValue
  try {
    parsed = JSON.parse(text) as LocalAgentJsonValue
  } catch {
    throw new Error(text || '本地 Scanner Agent 响应格式错误')
  }
  const envelope = validateLocalApiResult(parsed, response)
  if (!response.ok || !envelope.success) {
    const message = envelope.message || '本地 Scanner Agent 请求失败'
    const busyError = tryParseBusyError(message)
    if (busyError) {
      throw busyError
    }
    throw new Error(message)
  }
  if (!Object.hasOwn(envelope, 'data')) {
    throw new TypeError('本地 Scanner Agent 成功响应缺少 data 字段')
  }
  const data = envelope.data
  if (data === undefined) {
    throw new TypeError('本地 Scanner Agent 成功响应 data 字段不能为空')
  }
  return data
}

function requireObject(value: LocalAgentJsonValue, field: string): LocalAgentJsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是对象`)
  }
  return value
}

function requireString(value: LocalAgentJsonObject, field: string): string {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'string') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是字符串`)
  }
  return fieldValue
}

function requireBoolean(value: LocalAgentJsonObject, field: string): boolean {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'boolean') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是布尔值`)
  }
  return fieldValue
}

function requireNumber(value: LocalAgentJsonObject, field: string): number {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是有效数字`)
  }
  return fieldValue
}

function requireStringArray(value: LocalAgentJsonObject, field: string): string[] {
  const fieldValue = value[field]
  if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是字符串数组`)
  }
  return fieldValue as string[]
}

function requireOptionalString(value: LocalAgentJsonObject, field: string): string | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  if (typeof fieldValue !== 'string') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是字符串`)
  }
  return fieldValue
}

function requireOptionalNumber(value: LocalAgentJsonObject, field: string): number | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是有效数字`)
  }
  return fieldValue
}

function requireNullableString(value: LocalAgentJsonObject, field: string): string | null {
  const fieldValue = value[field]
  if (fieldValue === undefined || fieldValue === null) {
    return null
  }
  if (typeof fieldValue !== 'string') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是字符串或 null`)
  }
  return fieldValue
}

function requireScanMode(value: LocalAgentJsonObject, field: string): ScannerKioskScanMode {
  const fieldValue = value[field]
  if (fieldValue !== 'DIRECT' && fieldValue !== 'SUPPLEMENT' && fieldValue !== 'ARCHIVE') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 扫描模式不合法`)
  }
  return fieldValue
}

function requireAgentHealthStatus(value: LocalAgentJsonObject, field: string): AgentHealthStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'RUNNING') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 运行状态不合法`)
  }
  return fieldValue
}

function requireAgentDiagnosticStatus(
  value: LocalAgentJsonObject,
  field: string,
): AgentDiagnosticStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'OK' && fieldValue !== 'WARNING') {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 诊断状态不合法`)
  }
  return fieldValue
}

function requireScanJobStatus(value: LocalAgentJsonObject, field: string): LocalScanJobStatus {
  const fieldValue = value[field]
  if (
    fieldValue !== 'CREATED'
    && fieldValue !== 'SCANNING'
    && fieldValue !== 'PAUSED'
    && fieldValue !== 'READYTOUPLOAD'
    && fieldValue !== 'UPLOADING'
    && fieldValue !== 'REPORTED'
    && fieldValue !== 'FAILED'
    && fieldValue !== 'RETRYING'
    && fieldValue !== 'CANCELLED'
  ) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是合法扫描任务状态`)
  }
  return fieldValue
}

function requireScanPageStatus(value: LocalAgentJsonObject, field: string): LocalScanPageStatus {
  const fieldValue = value[field]
  if (
    fieldValue !== 'CAPTURED'
    && fieldValue !== 'PREPROCESSED'
    && fieldValue !== 'UPLOADING'
    && fieldValue !== 'UPLOADED'
    && fieldValue !== 'FAILED'
    && fieldValue !== 'DELETED'
  ) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field} 必须是合法扫描页状态`)
  }
  return fieldValue
}

function validateLocalApiResult(value: LocalAgentJsonValue, response: Response): LocalApiResult {
  const result = requireObject(value, 'response')
  const envelope: LocalApiResult = {
    success: requireBoolean(result, 'success'),
    code: requireString(result, 'code'),
    message: requireString(result, 'message'),
    traceId: requireString(result, 'traceId'),
  }
  if (Object.hasOwn(result, 'data')) {
    envelope.data = result.data
  }
  if (response.ok && envelope.success && !Object.hasOwn(result, 'data')) {
    throw new TypeError('本地 Scanner Agent 成功响应缺少 data 字段')
  }
  return envelope
}

function validateAgentHealthResponse(value: LocalAgentJsonValue): AgentHealthResponse {
  const result = requireObject(value, 'agentHealth')
  return {
    status: requireAgentHealthStatus(result, 'status'),
    agentVersion: requireString(result, 'agentVersion'),
    machineCode: requireString(result, 'machineCode'),
    bound: requireBoolean(result, 'bound'),
    scannerConnected: requireBoolean(result, 'scannerConnected'),
    pendingUploadJobs: requireNumber(result, 'pendingUploadJobs'),
    diagnosticStatus: requireAgentDiagnosticStatus(result, 'diagnosticStatus'),
    diagnosticMessage: requireString(result, 'diagnosticMessage'),
    upgradeRequired: requireBoolean(result, 'upgradeRequired'),
    minimumAgentVersion: requireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireString(result, 'latestAgentVersion'),
    minimumClientVersion: requireString(result, 'minimumClientVersion'),
    latestClientVersion: requireString(result, 'latestClientVersion'),
    scanAllowed: requireBoolean(result, 'scanAllowed'),
    tokenResetRequired: requireBoolean(result, 'tokenResetRequired'),
    lastHeartbeatAt: requireNullableString(result, 'lastHeartbeatAt'),
  }
}

function validateScannerListResponse(value: LocalAgentJsonValue): ScannerListResponse {
  const result = requireObject(value, 'scannerList')
  const devices = result.devices
  if (!Array.isArray(devices)) {
    throw new TypeError('本地 Scanner Agent 响应字段 devices 必须是数组')
  }
  return {
    devices: devices.map((item, index) => validateScannerDeviceInfo(item, `devices[${index}]`)),
  }
}

function validateScannerDeviceInfo(value: LocalAgentJsonValue, field: string): ScannerDeviceInfo {
  const result = requireObject(value, field)
  const scanner: ScannerDeviceInfo = {
    localScannerId: requireString(result, 'localScannerId'),
    displayName: requireString(result, 'displayName'),
    driverType: requireString(result, 'driverType'),
    supportsAdf: requireBoolean(result, 'supportsAdf'),
    supportsDuplex: requireBoolean(result, 'supportsDuplex'),
    available: requireBoolean(result, 'available'),
  }
  const diagnostic = requireOptionalString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    scanner.diagnostic = diagnostic
  }
  return scanner
}

function validateScannerAgentActivateResponse(
  value: LocalAgentJsonValue,
): ScannerAgentActivateResponse {
  const result = requireObject(value, 'agentActivation')
  const payload: ScannerAgentActivateResponse = {
    scannerDeviceId: requireString(result, 'scannerDeviceId'),
    scannerStationId: requireString(result, 'scannerStationId'),
    deviceName: requireString(result, 'deviceName'),
    gatewayBaseUrl: requireString(result, 'gatewayBaseUrl'),
    pushPageUrl: requireString(result, 'pushPageUrl'),
    pushCommitUrl: requireString(result, 'pushCommitUrl'),
    pushToken: requireString(result, 'pushToken'),
    pushAuthorizationHeader: requireString(result, 'pushAuthorizationHeader'),
    storageUploadUrl: requireString(result, 'storageUploadUrl'),
    storageUploadToken: requireString(result, 'storageUploadToken'),
    storageUploadAuthorizationHeader: requireString(result, 'storageUploadAuthorizationHeader'),
    defaultClassIds: requireStringArray(result, 'defaultClassIds'),
    kioskLockEnabled: requireBoolean(result, 'kioskLockEnabled'),
    activatedAt: requireString(result, 'activatedAt'),
    minimumAgentVersion: requireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireString(result, 'latestAgentVersion'),
  }
  const tenantId = requireOptionalString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  const defaultExamId = requireOptionalString(result, 'defaultExamId')
  if (defaultExamId !== undefined) {
    payload.defaultExamId = defaultExamId
  }
  return payload
}

function validateSuccessObject(value: LocalAgentJsonValue): { success: boolean } {
  const result = requireObject(value, 'successResult')
  return {
    success: requireBoolean(result, 'success'),
  }
}

function validateScanJobResponse(value: LocalAgentJsonValue): ScanJobResponse {
  return validateScanJobResponsePayload(value, 'scanJob')
}

function validateScanJobListResponse(value: LocalAgentJsonValue): ScanJobListResponse {
  const result = requireObject(value, 'scanJobList')
  const jobs = result.jobs
  if (!Array.isArray(jobs)) {
    throw new TypeError('本地 Scanner Agent 响应字段 jobs 必须是数组')
  }
  return {
    jobs: jobs.map((item, index) => validateScanJobResponsePayload(item, `jobs[${index}]`)),
  }
}

function validateScanJobResponsePayload(
  value: LocalAgentJsonValue,
  field: string,
): ScanJobResponse {
  const result = requireObject(value, field)
  const pages = result.pages
  if (!Array.isArray(pages)) {
    throw new TypeError(`本地 Scanner Agent 响应字段 ${field}.pages 必须是数组`)
  }
  const payload: ScanJobResponse = {
    scanJobId: requireString(result, 'scanJobId'),
    examId: requireString(result, 'examId'),
    declaredClassIds: requireStringArray(result, 'declaredClassIds'),
    scannerDeviceId: requireString(result, 'scannerDeviceId'),
    scannerStationId: requireString(result, 'scannerStationId'),
    batchExternalNo: requireString(result, 'batchExternalNo'),
    scanMode: requireScanMode(result, 'scanMode'),
    status: requireScanJobStatus(result, 'status'),
    scannedPages: requireNumber(result, 'scannedPages'),
    uploadedPages: requireNumber(result, 'uploadedPages'),
    reported: requireBoolean(result, 'reported'),
    replaceTargetPage: requireBoolean(result, 'replaceTargetPage'),
    message: requireString(result, 'message'),
    pages: pages.map((item, index) => validateScanPageInfo(item, `${field}.pages[${index}]`)),
  }
  const scanBatchId = requireOptionalString(result, 'scanBatchId')
  if (scanBatchId !== undefined) {
    payload.scanBatchId = scanBatchId
  }
  const targetPageNo = requireOptionalNumber(result, 'targetPageNo')
  if (targetPageNo !== undefined) {
    payload.targetPageNo = targetPageNo
  }
  const supplementReason = requireOptionalString(result, 'supplementReason')
  if (supplementReason !== undefined) {
    payload.supplementReason = supplementReason
  }
  return payload
}

function validateScanPageInfo(value: LocalAgentJsonValue, field: string): ScanPageInfo {
  const result = requireObject(value, field)
  const page: ScanPageInfo = {
    pageNo: requireNumber(result, 'pageNo'),
    status: requireScanPageStatus(result, 'status'),
    sizeBytes: requireNumber(result, 'sizeBytes'),
    capturedAt: requireString(result, 'capturedAt'),
  }
  const diagnostic = requireOptionalString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    page.diagnostic = diagnostic
  }
  const uploadedAt = requireOptionalString(result, 'uploadedAt')
  if (uploadedAt !== undefined) {
    page.uploadedAt = uploadedAt
  }
  const uploadedFileId = requireOptionalString(result, 'uploadedFileId')
  if (uploadedFileId !== undefined) {
    page.uploadedFileId = uploadedFileId
  }
  return page
}

function validateBooleanResult(value: LocalAgentJsonValue): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError('本地 Scanner Agent 响应 data 必须是布尔值')
  }
  return value
}
