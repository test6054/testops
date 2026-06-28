import type {AgentWireJsonObject} from './scanner-agent-local-wire';
import type {
  ExamScannerKioskContextVO,
  ExamScannerScanConfigVO,
  ScannerKioskScanMode,
} from './scanner-kiosk'
import { runContractGuard, throwUserFacing } from '@/utils/contract-guard'
import {

  LOCAL_AGENT_WIRE_ERROR,
  requireAgentWireBoolean,
  requireAgentWireInt32,
  requireAgentWireInt64,
  requireAgentWireNullableString,
  requireAgentWireObject,
  requireAgentWireString,
  requireAgentWireStringArray,
  requireOptionalAgentWireInt32,
  requireOptionalAgentWireString
} from './scanner-agent-local-wire'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:18761'
export const LOCAL_AGENT_UNAVAILABLE_ERROR = '本地扫描服务未连接，请确认一体机组件已启动'
const LOCAL_AGENT_RESPONSE_ERROR = LOCAL_AGENT_WIRE_ERROR
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
  /** 当前机器码未绑定服务端端点，需要重新激活 */
  rebindRequired: boolean
  /** 最近一次成功心跳的本地时间（ISO 字符串） */
  lastHeartbeatAt: string | null
  /** 服务端是否公告了可下载的 Agent 更新包 */
  updateAvailable: boolean
  /** 本地更新包状态 */
  updateStatus: AgentUpdateStatus
  /** 可更新或已下载的 Agent 版本号 */
  updatePackageVersion: string
  /** 更新包文件名 */
  updatePackageFileName: string
  /** 更新包下载完成时间（ISO 字符串） */
  updateDownloadedAt: string | null
  /** 更新下载或安装诊断信息 */
  updateDiagnosticMessage: string
  /** 更新包已下载且当前可触发自动安装 */
  updateInstallable: boolean
  /** 是否存在仍占用工作台、应阻断重新激活的本地或服务端扫描任务 */
  workspaceBlocked: boolean
  /** 本地 SCANNING / PAUSED 等仍占用工作台的任务（旧 Agent 无 workspaceBlocked 时的兜底） */
  localWorkspaceBlocked: boolean
}

export type AgentHealthStatus = 'RUNNING'

export const AGENT_HEALTH_STATUS_LABEL: Record<AgentHealthStatus, string> = {
  RUNNING: '运行中',
}

export type AgentDiagnosticStatus = 'OK' | 'WARNING'

export type AgentUpdateStatus
  = | 'NONE'
    | 'AVAILABLE'
    | 'DOWNLOADING'
    | 'DOWNLOADED'
    | 'INSTALLING'
    | 'INSTALLED'
    | 'FAILED'

export const AGENT_UPDATE_STATUS_LABEL: Record<AgentUpdateStatus, string> = {
  NONE: '无更新',
  AVAILABLE: '可下载',
  DOWNLOADING: '下载中',
  DOWNLOADED: '已下载',
  INSTALLING: '安装中',
  INSTALLED: '已安装',
  FAILED: '更新失败',
}

export interface LocalScannerAgentInstallUpdateResponse {
  installing: boolean
  packageVersion: string
  packageFileName: string
}

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

export type LocalScanPageSide = 'FRONT' | 'BACK'

/** 统一文档采集业务场景；与 edu-mark DocumentBusinessScene 一致 */
export type ScannerBusinessScene
  = | 'EXAM_DIRECT_SCAN'
    | 'EXAM_ARCHIVE'
    | 'COURSE_ASSESSMENT_ARCHIVE'
    | 'TEACHER_PORTFOLIO'
    | 'FULLTEXT_IMPORT'

/** 试卷直扫互斥识别链路；与 edu-mark DirectScanProviderChain 一致 */
export type DirectScanProviderChain = 'BAIDU_QWEN' | 'PADDLE_LOCAL'

export type ScannerOutputContainerFormat = 'PDF'
export type ScannerPageImageFormat = 'PNG' | 'JPEG'
export type ScannerBlankPagePolicy = 'BACK_BLANK' | 'SEPARATOR' | 'REPORT_ONLY' | 'REVIEW_REQUIRED'

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
  preferredLocalScannerId?: string
  allowedTaskKinds?: string
}

/** 本机 Agent 绑定 push_token 会话，供 Kiosk 浏览器与 DeviceBinding 对齐 */
export interface KioskBrowserAuthResponse {
  pushAuthorizationHeader: string
  tenantId?: string
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  gatewayBaseUrl: string
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
  allowedTaskKinds?: string
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
  /** 扫描任务类型，默认 EXAM_MARKING */
  taskKind?: 'EXAM_MARKING' | 'EXAM_ARCHIVE' | 'PORTFOLIO_COLLECT'
  /** 后端 work-order/start 签发的批次外部号 */
  batchExternalNo: string
  /** 后端 work-order/start 签发的扫描报告 ID */
  reportId: string
  /** 统一文档采集业务场景 */
  businessScene: ScannerBusinessScene
  /** 业务对象 ID；试卷直扫默认使用 examId */
  businessRefId: string
  /** 试卷直扫识别链路；非 EXAM_DIRECT_SCAN 场景不传 */
  providerChain?: DirectScanProviderChain
  /** 扫描产物容器格式，首期固定 PDF */
  outputContainerFormat: ScannerOutputContainerFormat
  /** 逐页图像格式 */
  pageImageFormat: ScannerPageImageFormat
  /** 空白页处置策略，禁止 SILENT_DROP */
  blankPagePolicy: ScannerBlankPagePolicy
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
  /** work-order/start 响应中服务端冻结的扫描参数 */
  resolvedScanConfig: ExamScannerScanConfigVO
}

/** EXAM_ARCHIVE / PORTFOLIO_COLLECT 文档采集开扫请求（不依赖考试 kiosk 上下文）。 */
export interface DocumentStartScanJobRequest {
  taskKind: 'EXAM_ARCHIVE' | 'PORTFOLIO_COLLECT'
  localScannerId: string
  batchExternalNo: string
  reportId: string
  businessScene: ScannerBusinessScene
  businessRefId: string
  scannerDeviceId: string
  scannerStationId: string
  archiveBatchMode?: 'MERGED' | 'PER_PAGE'
  outputContainerFormat: ScannerOutputContainerFormat
  pageImageFormat: ScannerPageImageFormat
  blankPagePolicy: ScannerBlankPagePolicy
  resolvedScanConfig: ExamScannerScanConfigVO
}

export interface ScanPageInfo {
  captureSeq: number
  pageNo: number
  sheetNo: number
  pageSide: LocalScanPageSide
  pageSideLabel: string
  status: LocalScanPageStatus
  /** Agent ScanPageInfo.SizeBytes（C# long），HTTP 边界为十进制字符串 */
  sizeBytes: string
  diagnostic?: string
  capturedAt: string
  uploadedAt?: string
  /** Agent ScanPageInfo.UploadedFileId，浏览器边界为字符串 */
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
  duplexMode: ExamScannerScanConfigVO['duplexMode']
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

export async function getAgentKioskBrowserAuth(): Promise<KioskBrowserAuthResponse> {
  const payload = await localAgentGet('/api/agent/kiosk-browser-auth')
  return normalizeAgentPayload(() => validateKioskBrowserAuthResponse(payload))
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  const payload = await localAgentGet('/api/scanners')
  return normalizeAgentPayload(() => validateScannerListResponse(payload))
}

export async function setPreferredLocalScanner(localScannerId: string): Promise<void> {
  await localAgentPost('/api/agent/preferred-scanner', { localScannerId })
}

export async function activateLocalAgent(
  request: ActivateLocalAgentRequest,
): Promise<ScannerAgentActivateResponse> {
  const payload = await localAgentPost('/api/agent/activate', request)
  return normalizeAgentPayload(() => validateScannerAgentActivateResponse(payload))
}

export async function installAgentUpdate(): Promise<LocalScannerAgentInstallUpdateResponse> {
  const payload = await localAgentPost('/api/agent/update/install', {})
  return normalizeAgentPayload(() => validateLocalScannerAgentInstallUpdateResponse(payload))
}

export async function startScanJob(request: StartScanJobRequest): Promise<ScanJobResponse> {
  const payload = await localAgentPost('/api/scan-jobs/start', request)
  return normalizeAgentPayload(() => validateScanJobResponse(payload))
}

export async function startDocumentScanJob(request: DocumentStartScanJobRequest): Promise<ScanJobResponse> {
  const payload = await localAgentPost('/api/scan-jobs/start', {
    ...request,
    scanMode: 'DIRECT',
    replaceTargetPage: false,
  })
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
 * 不调用后端废弃接口；若任务已有逐页上传副作用，必须走教师端废弃后端批次的 discard 链路。
 */
export async function deleteScanJob(scanJobId: string): Promise<boolean> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/delete`, {
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
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  if (!isLocalAgentJsonValue(parsed)) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  const envelope = normalizeAgentPayload(() => validateLocalApiResult(parsed, response))
  if (!response.ok || !envelope.success) {
    const message = envelope.message
    const busyError = tryParseBusyError(message)
    if (busyError) {
      throw busyError
    }
    throwUserFacing(message || LOCAL_AGENT_REQUEST_ERROR)
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

function requireObject(value: LocalAgentJsonValue): AgentWireJsonObject {
  return requireAgentWireObject(value)
}

function isLocalAgentJsonValue(value: unknown): value is LocalAgentJsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return true
  }
  if (Array.isArray(value)) {
    return value.every(isLocalAgentJsonValue)
  }
  if (typeof value !== 'object') {
    return false
  }
  return Object.values(value).every(isLocalAgentJsonValue)
}

function requireScanMode(value: AgentWireJsonObject, field: string): ScannerKioskScanMode {
  const fieldValue = value[field]
  if (fieldValue !== 'DIRECT' && fieldValue !== 'SUPPLEMENT') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireScannerDuplexMode(
  value: AgentWireJsonObject,
  field: string,
): ExamScannerScanConfigVO['duplexMode'] {
  const fieldValue = value[field]
  if (fieldValue !== 'SIMPLEX' && fieldValue !== 'DUPLEX') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireAgentHealthStatus(value: AgentWireJsonObject, field: string): AgentHealthStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'RUNNING') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireAgentDiagnosticStatus(
  value: AgentWireJsonObject,
  field: string,
): AgentDiagnosticStatus {
  const fieldValue = value[field]
  if (fieldValue !== 'OK' && fieldValue !== 'WARNING') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function requireScanJobStatus(value: AgentWireJsonObject, field: string): LocalScanJobStatus {
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

function requireScanPageStatus(value: AgentWireJsonObject, field: string): LocalScanPageStatus {
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

function requireScanPageSide(value: AgentWireJsonObject, field: string): LocalScanPageSide {
  const fieldValue = value[field]
  if (fieldValue !== 'FRONT' && fieldValue !== 'BACK') {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function validateLocalApiResult(value: LocalAgentJsonValue, response: Response): LocalApiResult {
  const result = requireObject(value)
  const envelope: LocalApiResult = {
    success: requireAgentWireBoolean(result, 'success'),
    code: requireAgentWireString(result, 'code'),
    message: requireAgentWireString(result, 'message'),
    traceId: requireAgentWireString(result, 'traceId'),
  }
  if (Object.hasOwn(result, 'data')) {
    envelope.data = result.data
  }
  if (response.ok && envelope.success && !Object.hasOwn(result, 'data')) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return envelope
}

function requireAgentUpdateStatus(value: AgentWireJsonObject, field: string): AgentUpdateStatus {
  const fieldValue = value[field]
  if (
    fieldValue !== 'NONE'
    && fieldValue !== 'AVAILABLE'
    && fieldValue !== 'DOWNLOADING'
    && fieldValue !== 'DOWNLOADED'
    && fieldValue !== 'INSTALLING'
    && fieldValue !== 'INSTALLED'
    && fieldValue !== 'FAILED'
  ) {
    throwUserFacing(LOCAL_AGENT_RESPONSE_ERROR)
  }
  return fieldValue
}

function validateLocalScannerAgentInstallUpdateResponse(
  value: LocalAgentJsonValue,
): LocalScannerAgentInstallUpdateResponse {
  const result = requireObject(value)
  return {
    installing: requireAgentWireBoolean(result, 'installing'),
    packageVersion: requireAgentWireString(result, 'packageVersion'),
    packageFileName: requireAgentWireString(result, 'packageFileName'),
  }
}

function validateAgentHealthResponse(value: LocalAgentJsonValue): AgentHealthResponse {
  const result = requireObject(value)
  return {
    status: requireAgentHealthStatus(result, 'status'),
    agentVersion: requireAgentWireString(result, 'agentVersion'),
    machineCode: requireAgentWireString(result, 'machineCode'),
    bound: requireAgentWireBoolean(result, 'bound'),
    scannerConnected: requireAgentWireBoolean(result, 'scannerConnected'),
    pendingUploadJobs: requireAgentWireInt32(result, 'pendingUploadJobs'),
    diagnosticStatus: requireAgentDiagnosticStatus(result, 'diagnosticStatus'),
    diagnosticMessage: requireAgentWireString(result, 'diagnosticMessage'),
    upgradeRequired: requireAgentWireBoolean(result, 'upgradeRequired'),
    minimumAgentVersion: requireAgentWireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireAgentWireString(result, 'latestAgentVersion'),
    minimumClientVersion: requireAgentWireString(result, 'minimumClientVersion'),
    latestClientVersion: requireAgentWireString(result, 'latestClientVersion'),
    scanAllowed: requireAgentWireBoolean(result, 'scanAllowed'),
    tokenResetRequired: requireAgentWireBoolean(result, 'tokenResetRequired'),
    rebindRequired: requireAgentWireBoolean(result, 'rebindRequired'),
    lastHeartbeatAt: requireAgentWireNullableString(result, 'lastHeartbeatAt'),
    updateAvailable: requireAgentWireBoolean(result, 'updateAvailable'),
    updateStatus: requireAgentUpdateStatus(result, 'updateStatus'),
    updatePackageVersion: requireAgentWireString(result, 'updatePackageVersion'),
    updatePackageFileName: requireAgentWireString(result, 'updatePackageFileName'),
    updateDownloadedAt: requireAgentWireNullableString(result, 'updateDownloadedAt'),
    updateDiagnosticMessage: requireAgentWireString(result, 'updateDiagnosticMessage'),
    updateInstallable: requireAgentWireBoolean(result, 'updateInstallable'),
    workspaceBlocked: 'workspaceBlocked' in result && result.workspaceBlocked === true,
    localWorkspaceBlocked: 'localWorkspaceBlocked' in result && result.localWorkspaceBlocked === true,
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
    localScannerId: requireAgentWireString(result, 'localScannerId'),
    displayName: requireAgentWireString(result, 'displayName'),
    driverType: requireAgentWireString(result, 'driverType'),
    supportsAdf: requireAgentWireBoolean(result, 'supportsAdf'),
    supportsDuplex: requireAgentWireBoolean(result, 'supportsDuplex'),
    available: requireAgentWireBoolean(result, 'available'),
  }
  const maxDpi = requireOptionalAgentWireInt32(result, 'maxDpi')
  if (maxDpi !== undefined) {
    scanner.maxDpi = maxDpi
  }
  const diagnostic = requireOptionalAgentWireString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    scanner.diagnostic = diagnostic
  }
  return scanner
}

function validateAgentSetupContextResponse(value: LocalAgentJsonValue): AgentSetupContextResponse {
  const result = requireObject(value)
  const payload: AgentSetupContextResponse = {
    defaultGatewayBaseUrl: requireAgentWireString(result, 'defaultGatewayBaseUrl'),
    bound: requireAgentWireBoolean(result, 'bound'),
  }
  const scannerDeviceId = requireOptionalAgentWireString(result, 'scannerDeviceId')
  if (scannerDeviceId !== undefined) {
    payload.scannerDeviceId = scannerDeviceId
  }
  const scannerStationId = requireOptionalAgentWireString(result, 'scannerStationId')
  if (scannerStationId !== undefined) {
    payload.scannerStationId = scannerStationId
  }
  const deviceName = requireOptionalAgentWireString(result, 'deviceName')
  if (deviceName !== undefined) {
    payload.deviceName = deviceName
  }
  const gatewayBaseUrl = requireOptionalAgentWireString(result, 'gatewayBaseUrl')
  if (gatewayBaseUrl !== undefined) {
    payload.gatewayBaseUrl = gatewayBaseUrl
  }
  const activatedAt = requireOptionalAgentWireString(result, 'activatedAt')
  if (activatedAt !== undefined) {
    payload.activatedAt = activatedAt
  }
  const preferredLocalScannerId = requireOptionalAgentWireString(result, 'preferredLocalScannerId')
  if (preferredLocalScannerId !== undefined) {
    payload.preferredLocalScannerId = preferredLocalScannerId
  }
  const allowedTaskKinds = requireOptionalAgentWireString(result, 'allowedTaskKinds')
  if (allowedTaskKinds !== undefined) {
    payload.allowedTaskKinds = allowedTaskKinds
  }
  return payload
}

function validateKioskBrowserAuthResponse(value: LocalAgentJsonValue): KioskBrowserAuthResponse {
  const result = requireObject(value)
  const payload: KioskBrowserAuthResponse = {
    pushAuthorizationHeader: requireAgentWireString(result, 'pushAuthorizationHeader'),
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    deviceName: requireAgentWireString(result, 'deviceName'),
    gatewayBaseUrl: requireAgentWireString(result, 'gatewayBaseUrl'),
  }
  const tenantId = requireOptionalAgentWireString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  return payload
}

function validateScannerAgentActivateResponse(
  value: LocalAgentJsonValue,
): ScannerAgentActivateResponse {
  const result = requireObject(value)
  const payload: ScannerAgentActivateResponse = {
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    deviceName: requireAgentWireString(result, 'deviceName'),
    gatewayBaseUrl: requireAgentWireString(result, 'gatewayBaseUrl'),
    pushPageUrl: requireAgentWireString(result, 'pushPageUrl'),
    pushCommitUrl: requireAgentWireString(result, 'pushCommitUrl'),
    pushToken: requireAgentWireString(result, 'pushToken'),
    pushAuthorizationHeader: requireAgentWireString(result, 'pushAuthorizationHeader'),
    storageUploadUrl: requireAgentWireString(result, 'storageUploadUrl'),
    storageUploadToken: requireAgentWireString(result, 'storageUploadToken'),
    storageUploadAuthorizationHeader: requireAgentWireString(result, 'storageUploadAuthorizationHeader'),
    kioskLockEnabled: requireAgentWireBoolean(result, 'kioskLockEnabled'),
    activatedAt: requireAgentWireString(result, 'activatedAt'),
    minimumAgentVersion: requireAgentWireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireAgentWireString(result, 'latestAgentVersion'),
  }
  const tenantId = requireOptionalAgentWireString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  const allowedTaskKinds = requireOptionalAgentWireString(result, 'allowedTaskKinds')
  if (allowedTaskKinds !== undefined) {
    payload.allowedTaskKinds = allowedTaskKinds
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
    scanJobId: requireAgentWireString(result, 'scanJobId'),
    examId: requireAgentWireString(result, 'examId'),
    declaredClassIds: requireAgentWireStringArray(result, 'declaredClassIds'),
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    batchExternalNo: requireAgentWireString(result, 'batchExternalNo'),
    scanMode: requireScanMode(result, 'scanMode'),
    status: requireScanJobStatus(result, 'status'),
    duplexMode: requireScannerDuplexMode(result, 'duplexMode'),
    scannedPages: requireAgentWireInt32(result, 'scannedPages'),
    uploadedPages: requireAgentWireInt32(result, 'uploadedPages'),
    reported: requireAgentWireBoolean(result, 'reported'),
    replaceTargetPage: requireAgentWireBoolean(result, 'replaceTargetPage'),
    message: requireAgentWireString(result, 'message'),
    pages: pages.map((item) => validateScanPageInfo(item)),
  }
  const scanBatchId = requireOptionalAgentWireString(result, 'scanBatchId')
  if (scanBatchId !== undefined) {
    payload.scanBatchId = scanBatchId
  }
  const targetPageNo = requireOptionalAgentWireInt32(result, 'targetPageNo')
  if (targetPageNo !== undefined) {
    payload.targetPageNo = targetPageNo
  }
  const supplementReason = requireOptionalAgentWireString(result, 'supplementReason')
  if (supplementReason !== undefined) {
    payload.supplementReason = supplementReason
  }
  return payload
}

function validateScanPageInfo(value: LocalAgentJsonValue): ScanPageInfo {
  const result = requireObject(value)
  const page: ScanPageInfo = {
    captureSeq: requireAgentWireInt32(result, 'captureSeq'),
    pageNo: requireAgentWireInt32(result, 'pageNo'),
    sheetNo: requireAgentWireInt32(result, 'sheetNo'),
    pageSide: requireScanPageSide(result, 'pageSide'),
    pageSideLabel: requireAgentWireString(result, 'pageSideLabel'),
    status: requireScanPageStatus(result, 'status'),
    sizeBytes: requireAgentWireInt64(result, 'sizeBytes'),
    capturedAt: requireAgentWireString(result, 'capturedAt'),
  }
  const diagnostic = requireOptionalAgentWireString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    page.diagnostic = diagnostic
  }
  const uploadedAt = requireOptionalAgentWireString(result, 'uploadedAt')
  if (uploadedAt !== undefined) {
    page.uploadedAt = uploadedAt
  }
  const uploadedFileId = requireOptionalAgentWireString(result, 'uploadedFileId')
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
