import type {
  ExamScannerKioskContextVO,
  ExamScannerScanConfigVO,
  ScannerKioskScanMode,
} from './scanner-kiosk'
import { runContractGuard, throwUserFacing } from '@/utils/contract-guard'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:18761'
const LOCAL_AGENT_UNAVAILABLE_ERROR = '本地扫描服务未连接，请确认一体机组件已启动'
const LOCAL_AGENT_RESPONSE_ERROR = '本地扫描服务响应异常，请检查扫描服务后重试'
const LOCAL_AGENT_REQUEST_ERROR = '本地扫描服务处理失败，请检查扫描服务后重试'

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

export const AGENT_HEALTH_STATUS_LABEL: Record<AgentHealthStatus, string> = {
  RUNNING: '运行中',
}

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
  maxDpi?: number
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

export interface AgentSetupContextResponse {
  defaultGatewayBaseUrl: string
  bound: boolean
  scannerDeviceId?: string
  scannerStationId?: string
  deviceName?: string
  gatewayBaseUrl?: string
  activatedAt?: string
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
 * 浏览器无法连接本机 Agent 进程时抛出的错误。
 * 该状态属于一体机现场连接状态，不等同于后端服务不可用或用户会话失效。
 */
export class LocalAgentUnavailableError extends Error {
  readonly agentBaseUrl: string

  constructor(agentBaseUrl: string) {
    super(LOCAL_AGENT_UNAVAILABLE_ERROR)
    this.name = 'LocalAgentUnavailableError'
    this.agentBaseUrl = agentBaseUrl
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
  /** 后端 /scanner/kiosk/batch/start 签发的扫描报告 ID */
  reportId: string
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
  /** batch/start 响应中服务端冻结的扫描参数 */
  resolvedScanConfig: ExamScannerScanConfigVO
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
  /** 当前工作台考试 ID，本地任务恢复必须按考试隔离。 */
  examId: string
  /** edu-mark 绑定的扫描设备 ID，本地任务恢复必须按设备隔离。 */
  scannerDeviceId: string
  /** edu-mark 绑定的扫描站点 ID，本地任务恢复必须按站点隔离。 */
  scannerStationId: string
  includeTerminal?: boolean
}

export function getLocalAgentBaseUrl() {
  const value = import.meta.env.VITE_SCANNER_AGENT_URL
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/\/$/, '')
    : DEFAULT_AGENT_BASE_URL
}

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  const payload = await localAgentGet('/api/agent/health')
  return normalizeAgentPayload(() => validateAgentHealthResponse(payload))
}

export async function getAgentSetupContext(): Promise<AgentSetupContextResponse> {
  const payload = await localAgentGet('/api/agent/setup-context')
  return normalizeAgentPayload(() => validateAgentSetupContextResponse(payload))
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  const payload = await localAgentGet('/api/scanners')
  return normalizeAgentPayload(() => validateScannerListResponse(payload))
}

export async function activateLocalAgent(
  request: ActivateLocalAgentRequest,
): Promise<ScannerAgentActivateResponse> {
  const payload = await localAgentPost('/api/agent/activate', request)
  return normalizeAgentPayload(() => validateScannerAgentActivateResponse(payload))
}

export async function startScanJob(request: StartScanJobRequest): Promise<ScanJobResponse> {
  const payload = await localAgentPost('/api/scan-jobs/start', request)
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

export async function getScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentGet(`/api/scan-jobs/${encodeURIComponent(scanJobId)}`)
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

export async function listScanJobs(params: ListScanJobsParams): Promise<ScanJobListResponse> {
  if (!params.examId.trim() || !params.scannerDeviceId.trim() || !params.scannerStationId.trim()) {
    throwUserFacing('当前考试、扫描设备或扫描站点缺失，无法恢复本地扫描任务')
  }
  const query = new URLSearchParams()
  query.set('examId', params.examId.trim())
  query.set('scannerDeviceId', params.scannerDeviceId.trim())
  query.set('scannerStationId', params.scannerStationId.trim())
  if (typeof params.includeTerminal === 'boolean') {
    query.set('includeTerminal', String(params.includeTerminal))
  }
  const payload = await localAgentGet(`/api/scan-jobs?${query.toString()}`)
  return normalizeAgentPayload(() => validateScanJobListResponse(payload))
}

export async function cancelScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/cancel`, {})
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

export async function retryUpload(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-upload`,
    {},
  )
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

/**
 * 暂停指定扫描任务。Agent 端将状态切换为 Paused，扫描循环停止追加页面，
 * UploadWorker 也跳过该任务，直到调用 resumeScanJob 恢复。
 */
export async function pauseScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/pause`, {})
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

/**
 * 恢复被暂停的扫描任务。仅 Paused 任务可被恢复，其它状态由 Agent 返回业务错误。
 */
export async function resumeScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/resume`, {})
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

/**
 * 结束本批次。手工停止仍在扫描的任务并把已采集页面交给上传链路，
 * 不丢弃已扫页面（与 cancelScanJob 不同）。
 */
export async function endBatch(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/end-batch`,
    {},
  )
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

/**
 * 重试 commit。把已 push 但 commit 未确认的任务重新放回 Retrying。
 * 利用后端 reportId / batchExternalNo 唯一约束的幂等性。
 */
export async function retryCommit(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-commit`,
    {},
  )
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

/**
 * 删除尚未上报后端的 Agent 本地扫描任务。仅清理本地 metadata + 影像文件，
 * 不调用后端废弃接口；若任务已有逐页上传副作用，必须先由前端成功关闭工作台并丢弃后端 pending 页。
 */
export async function deleteScanJob(scanJobId: string, backendPendingCleared = false): Promise<boolean> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/delete`, {
    backendPendingCleared,
  })
  return normalizeAgentPayload(() => validateBooleanResult(payload))
}

/**
 * 废弃已上报的扫描任务：后端批次已由前端用户态废弃成功后，
 * Agent 仅清理本地任务数据。
 *
 * @param scanJobId Agent 本地扫描任务 ID
 * @param discardReason 废弃原因（必填，1-255 字）
 */
export async function discardScanJob(scanJobId: string, discardReason: string): Promise<boolean> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/discard`, {
    discardReason,
  })
  return normalizeAgentPayload(() => validateBooleanResult(payload))
}

export function getPageImageUrl(scanJobId: string, pageNo: number): string {
  return `${getLocalAgentBaseUrl()}/api/scan-jobs/${encodeURIComponent(scanJobId)}/pages/${pageNo}/image`
}

async function localAgentGet(path: string): Promise<LocalAgentJsonValue> {
  const response = await requestLocalAgent(path, {
    method: 'GET',
  })
  return await parseLocalAgentResponse(response)
}

async function localAgentPost(path: string, requestBody: object): Promise<LocalAgentJsonValue> {
  const response = await requestLocalAgent(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  return await parseLocalAgentResponse(response)
}

async function requestLocalAgent(path: string, init: RequestInit): Promise<Response> {
  const agentBaseUrl = getLocalAgentBaseUrl()
  try {
    return await fetch(`${agentBaseUrl}${path}`, init)
  } catch (error) {
    if (isFetchNetworkFailure(error)) {
      throw new LocalAgentUnavailableError(agentBaseUrl)
    }
    throw error
  }
}

function isFetchNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError || error instanceof DOMException
}

async function parseLocalAgentResponse(response: Response): Promise<LocalAgentJsonValue> {
  const text = await response.text()
  let parsed: LocalAgentJsonValue
  try {
    parsed = JSON.parse(text) as LocalAgentJsonValue
  } catch {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  const envelope = normalizeAgentPayload(() => validateLocalApiResult(parsed, response))
  if (!response.ok || !envelope.success) {
    const message = envelope.message
    const busyError = tryParseBusyError(message)
    if (busyError) {
      throw busyError
    }
    throwUserFacing(LOCAL_AGENT_REQUEST_ERROR)
  }
  if (!Object.hasOwn(envelope, 'data')) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  const data = envelope.data
  if (data === undefined) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return data
}

function normalizeAgentPayload<T>(action: () => T): T {
  let result!: T
  runContractGuard(() => {
    result = action()
  }, LOCAL_AGENT_RESPONSE_ERROR)
  return result
}

function requireObject(value: LocalAgentJsonValue): LocalAgentJsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return value
}

function requireString(value: LocalAgentJsonObject, field: string): string {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'string') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireBoolean(value: LocalAgentJsonObject, field: string): boolean {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'boolean') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireNumber(value: LocalAgentJsonObject, field: string): number {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireStringArray(value: LocalAgentJsonObject, field: string): string[] {
  const fieldValue = value[field]
  if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue as string[]
}

function requireOptionalString(value: LocalAgentJsonObject, field: string): string | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  if (typeof fieldValue !== 'string') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireOptionalNumber(value: LocalAgentJsonObject, field: string): number | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireNullableString(value: LocalAgentJsonObject, field: string): string | null {
  const fieldValue = value[field]
  if (fieldValue === undefined || fieldValue === null) {
    return null
  }
  if (typeof fieldValue !== 'string') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireScanMode(value: LocalAgentJsonObject, field: string): ScannerKioskScanMode {
  const fieldValue = value[field]
  if (fieldValue !== 'DIRECT' && fieldValue !== 'SUPPLEMENT' && fieldValue !== 'ARCHIVE') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireAgentHealthStatus(value: LocalAgentJsonObject, field: string): AgentHealthStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'RUNNING') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireAgentDiagnosticStatus(
  value: LocalAgentJsonObject,
  field: string,
): AgentDiagnosticStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'OK' && fieldValue !== 'WARNING') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
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
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
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
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function validateLocalApiResult(value: LocalAgentJsonValue, response: Response): LocalApiResult {
  const result = requireObject(value)
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
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return envelope
}

function validateAgentHealthResponse(value: LocalAgentJsonValue): AgentHealthResponse {
  const result = requireObject(value)
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
  const result = requireObject(value)
  const devices = result.devices
  if (!Array.isArray(devices)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return {
    devices: devices.map((item) => validateScannerDeviceInfo(item)),
  }
}

function validateScannerDeviceInfo(value: LocalAgentJsonValue): ScannerDeviceInfo {
  const result = requireObject(value)
  const scanner: ScannerDeviceInfo = {
    localScannerId: requireString(result, 'localScannerId'),
    displayName: requireString(result, 'displayName'),
    driverType: requireString(result, 'driverType'),
    supportsAdf: requireBoolean(result, 'supportsAdf'),
    supportsDuplex: requireBoolean(result, 'supportsDuplex'),
    available: requireBoolean(result, 'available'),
  }
  const maxDpi = requireOptionalNumber(result, 'maxDpi')
  if (maxDpi !== undefined) {
    scanner.maxDpi = maxDpi
  }
  const diagnostic = requireOptionalString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    scanner.diagnostic = diagnostic
  }
  return scanner
}

function validateAgentSetupContextResponse(value: LocalAgentJsonValue): AgentSetupContextResponse {
  const result = requireObject(value)
  const payload: AgentSetupContextResponse = {
    defaultGatewayBaseUrl: requireString(result, 'defaultGatewayBaseUrl'),
    bound: requireBoolean(result, 'bound'),
  }
  const scannerDeviceId = requireOptionalString(result, 'scannerDeviceId')
  if (scannerDeviceId !== undefined) {
    payload.scannerDeviceId = scannerDeviceId
  }
  const scannerStationId = requireOptionalString(result, 'scannerStationId')
  if (scannerStationId !== undefined) {
    payload.scannerStationId = scannerStationId
  }
  const deviceName = requireOptionalString(result, 'deviceName')
  if (deviceName !== undefined) {
    payload.deviceName = deviceName
  }
  const gatewayBaseUrl = requireOptionalString(result, 'gatewayBaseUrl')
  if (gatewayBaseUrl !== undefined) {
    payload.gatewayBaseUrl = gatewayBaseUrl
  }
  const activatedAt = requireOptionalString(result, 'activatedAt')
  if (activatedAt !== undefined) {
    payload.activatedAt = activatedAt
  }
  return payload
}

function validateScannerAgentActivateResponse(
  value: LocalAgentJsonValue,
): ScannerAgentActivateResponse {
  const result = requireObject(value)
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
    kioskLockEnabled: requireBoolean(result, 'kioskLockEnabled'),
    activatedAt: requireString(result, 'activatedAt'),
    minimumAgentVersion: requireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireString(result, 'latestAgentVersion'),
  }
  const tenantId = requireOptionalString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  return payload
}

function validateScanJobResponse(value: LocalAgentJsonValue): ScanJobResponse {
  return validateScanJobResponsePayload(value)
}

function validateScanJobListResponse(value: LocalAgentJsonValue): ScanJobListResponse {
  const result = requireObject(value)
  const jobs = result.jobs
  if (!Array.isArray(jobs)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return {
    jobs: jobs.map((item) => validateScanJobResponsePayload(item)),
  }
}

function validateScanJobResponsePayload(value: LocalAgentJsonValue): ScanJobResponse {
  const result = requireObject(value)
  const pages = result.pages
  if (!Array.isArray(pages)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
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
    pages: pages.map((item) => validateScanPageInfo(item)),
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

function validateScanPageInfo(value: LocalAgentJsonValue): ScanPageInfo {
  const result = requireObject(value)
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
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return value
}
