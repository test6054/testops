import type { ExamScannerKioskContextVO, ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type { AgentDiagnosticStatusCode } from '@/types/enums/agent-diagnostic-status-enum'
import type { AgentHealthStatusCode } from '@/types/enums/agent-health-status-enum'
import type { AgentUpdateStatusCode } from '@/types/enums/agent-update-status-enum'
import type { ArchiveScanBatchModeCode } from '@/types/enums/archive-scan-batch-mode-enum'
import type { DirectScanProviderChainCode } from '@/types/enums/direct-scan-provider-chain-enum'
import type { LocalScanJobStatusCode } from '@/types/enums/local-scan-job-status-enum'
import type { LocalScanPageStatusCode } from '@/types/enums/local-scan-page-status-enum'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import type { ScannerBusinessSceneCode } from '@/types/enums/scanner-business-scene-enum'
import { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import { rejectUserError } from '@/utils/error-handler'
import {
  readAgentHealthResponse,
  readAgentSetupContextResponse,
  readBooleanResult,
  readKioskBrowserAuthResponse,
  readLocalAgentResponseData,
  readLocalScannerAgentInstallUpdateResponse,
  readScanJobListResponse,
  readScanJobResponse,
  readScannerAgentActivateResponse,
  readScannerListResponse,
} from '@/wire/mark/scanner-agent-local-codec'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:18761'
export const LOCAL_AGENT_UNAVAILABLE_ERROR = '本地扫描服务未连接，请确认一体机组件已启动'

export type LocalAgentJsonValue
   = string | number | boolean | null | LocalAgentJsonObject | LocalAgentJsonValue[]

export interface LocalAgentJsonObject {
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
  status: AgentHealthStatusCode
  agentVersion: string
  machineCode: string
  bound: boolean
  scannerConnected: boolean
  pendingUploadJobs: number
  diagnosticStatus: AgentDiagnosticStatusCode
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
  updateStatus: AgentUpdateStatusCode
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
}

export {
  AgentDiagnosticStatusCode,
  AgentDiagnosticStatusDescription,
  ALL_AGENT_DIAGNOSTIC_STATUS_CODES,
} from '@/types/enums/agent-diagnostic-status-enum'
export {
  AgentHealthStatusCode,
  AgentHealthStatusDescription,
  ALL_AGENT_HEALTH_STATUS_CODES,
} from '@/types/enums/agent-health-status-enum'
export {
  AgentUpdateStatusCode,
  AgentUpdateStatusDescription,
  ALL_AGENT_UPDATE_STATUS_CODES,
} from '@/types/enums/agent-update-status-enum'

export interface LocalScannerAgentInstallUpdateResponse {
  installing: boolean
  packageVersion: string
  packageFileName: string
}

export {
  ALL_DIRECT_SCAN_PROVIDER_CHAIN_CODES,
  DirectScanProviderChainCode,
} from '@/types/enums/direct-scan-provider-chain-enum'
export {
  ALL_LOCAL_SCAN_JOB_STATUS_CODES,
  LocalScanJobStatusCode,
  LocalScanJobStatusDescription,
} from '@/types/enums/local-scan-job-status-enum'

export {
  ALL_LOCAL_SCAN_PAGE_STATUS_CODES,
  KioskSyntheticScanPageStatusCode,
  KioskSyntheticScanPageStatusDescription,
  LocalScanPageStatusCode,
  LocalScanPageStatusDescription,
} from '@/types/enums/local-scan-page-status-enum'
export {
  ALL_SCANNER_BUSINESS_SCENE_CODES,
  ScannerBusinessSceneCode,
} from '@/types/enums/scanner-business-scene-enum'

export type LocalScanPageSide = 'FRONT' | 'BACK'

/** 本地扫描 Agent 输出容器格式。 */
export enum ScannerOutputContainerFormat {
  PDF = 'PDF',
}

/** 本地扫描 Agent 逐页图像格式。 */
export enum ScannerPageImageFormat {
  PNG = 'PNG',
  JPEG = 'JPEG',
}
/** 本地扫描 Agent 空白页处置策略。 */
export enum ScannerBlankPagePolicyCode {
  BACK_BLANK = 'BACK_BLANK',
  SEPARATOR = 'SEPARATOR',
  REPORT_ONLY = 'REPORT_ONLY',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

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
  catalogDiagnostic?: string
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

export interface LocalScannerAgentActivateResponse {
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
  /** 扫描任务类型，默认 EXAM_MARKING */
  taskKind?: ScanTaskKindCode
  /** 后端 work-order/start 签发的批次外部号 */
  batchExternalNo: string
  /** 后端 work-order/start 签发的扫描报告 ID */
  reportId: string
  /** 统一文档采集业务场景 */
  businessScene: ScannerBusinessSceneCode
  /** 业务对象 ID；试卷直扫默认使用 examId */
  businessRefId: string
  /** 试卷直扫识别链路；非 EXAM_DIRECT_SCAN 场景不传 */
  providerChain?: DirectScanProviderChainCode
  /** 扫描产物容器格式，首期固定 PDF */
  outputContainerFormat: ScannerOutputContainerFormat
  /** 逐页图像格式 */
  pageImageFormat: ScannerPageImageFormat
  /** 空白页处置策略，禁止 SILENT_DROP */
  blankPagePolicy: ScannerBlankPagePolicyCode
  expectedPages?: number
  scanMode: ScannerKioskScanModeCode
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
  taskKind: ScanTaskKindCode
  localScannerId: string
  batchExternalNo: string
  reportId: string
  businessScene: ScannerBusinessSceneCode
  businessRefId: string
  scannerDeviceId: string
  scannerStationId: string
  archiveBatchMode?: ArchiveScanBatchModeCode
  outputContainerFormat: ScannerOutputContainerFormat
  pageImageFormat: ScannerPageImageFormat
  blankPagePolicy: ScannerBlankPagePolicyCode
  resolvedScanConfig: ExamScannerScanConfigVO
}

export interface ScanPageInfo {
  captureSeq: number
  pageNo: number
  sheetNo: number
  pageSide: LocalScanPageSide
  pageSideLabel: string
  status: LocalScanPageStatusCode
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
  scanMode: ScannerKioskScanModeCode
  targetPageNo?: number
  supplementReason?: string
  /** 是否替换目标页（仅 SUPPLEMENT 模式生效） */
  replaceTargetPage: boolean
  status: LocalScanJobStatusCode
  duplexMode: ExamScannerScanConfigVO['duplexMode']
  scannedPages: number
  uploadedPages: number
  reported: boolean
  message: string
  /** Agent commit 后：自动页登记是否被阻断 */
  pageRegisterBlocked?: boolean
  pageRegisterDiagnostic?: string
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

export interface ListDocumentScanJobsParams {
  taskKind: ScanTaskKindCode
  scannerDeviceId: string
  scannerStationId: string
  /** 可选：精确匹配后端 IN_PROGRESS 工单的 batchExternalNo。 */
  batchExternalNo?: string
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
  return readAgentHealthResponse(payload)
}

export async function getAgentSetupContext(): Promise<AgentSetupContextResponse> {
  const payload = await localAgentGet('/api/agent/setup-context')
  return readAgentSetupContextResponse(payload)
}

export async function getAgentKioskBrowserAuth(): Promise<KioskBrowserAuthResponse> {
  const payload = await localAgentGet('/api/agent/kiosk-browser-auth')
  return readKioskBrowserAuthResponse(payload)
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  const payload = await localAgentGet('/api/scanners')
  return readScannerListResponse(payload)
}

export async function setPreferredLocalScanner(localScannerId: string): Promise<void> {
  await localAgentPost('/api/agent/preferred-scanner', { localScannerId })
}

export async function activateLocalAgent(
  request: ActivateLocalAgentRequest,
): Promise<LocalScannerAgentActivateResponse> {
  const payload = await localAgentPost('/api/agent/activate', request)
  return readScannerAgentActivateResponse(payload)
}

export async function installAgentUpdate(): Promise<LocalScannerAgentInstallUpdateResponse> {
  const payload = await localAgentPost('/api/agent/update/install', {})
  return readLocalScannerAgentInstallUpdateResponse(payload)
}

export async function startScanJob(request: StartScanJobRequest): Promise<ScanJobResponse> {
  const payload = await localAgentPost('/api/scan-jobs/start', request)
  return readScanJobResponse(payload)
}

export async function startDocumentScanJob(
  request: DocumentStartScanJobRequest,
): Promise<ScanJobResponse> {
  const payload = await localAgentPost('/api/scan-jobs/start', {
    ...request,
    scanMode: ScannerKioskScanModeCode.DIRECT,
    replaceTargetPage: false,
  })
  return readScanJobResponse(payload)
}

export async function getScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentGet(`/api/scan-jobs/${encodeURIComponent(scanJobId)}`)
  return readScanJobResponse(payload)
}

export async function listScanJobs(params: ListScanJobsParams): Promise<ScanJobListResponse> {
  if (!params.examId.trim() || !params.scannerDeviceId.trim() || !params.scannerStationId.trim()) {
    return rejectUserError('当前考试、扫描设备或扫描站点缺失，无法恢复本地扫描任务')
  }
  const query = new URLSearchParams()
  query.set('examId', params.examId.trim())
  query.set('scannerDeviceId', params.scannerDeviceId.trim())
  query.set('scannerStationId', params.scannerStationId.trim())
  if (typeof params.includeTerminal === 'boolean') {
    query.set('includeTerminal', String(params.includeTerminal))
  }
  const payload = await localAgentGet(`/api/scan-jobs?${query.toString()}`)
  return readScanJobListResponse(payload)
}

/** 归档 / 档案袋文档采集任务列表；不依赖考试 kiosk 上下文。 */
export async function listDocumentScanJobs(
  params: ListDocumentScanJobsParams,
): Promise<ScanJobListResponse> {
  if (!params.scannerDeviceId.trim() || !params.scannerStationId.trim()) {
    return rejectUserError('扫描设备或扫描站点缺失，无法恢复本地文档采集任务')
  }
  const query = new URLSearchParams()
  query.set('taskKind', params.taskKind)
  query.set('scannerDeviceId', params.scannerDeviceId.trim())
  query.set('scannerStationId', params.scannerStationId.trim())
  if (params.batchExternalNo?.trim()) {
    query.set('batchExternalNo', params.batchExternalNo.trim())
  }
  if (typeof params.includeTerminal === 'boolean') {
    query.set('includeTerminal', String(params.includeTerminal))
  }
  const payload = await localAgentGet(`/api/scan-jobs?${query.toString()}`)
  return readScanJobListResponse(payload)
}

export async function cancelScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/cancel`, {})
  return readScanJobResponse(payload)
}

export async function retryUpload(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-upload`,
    {},
  )
  return readScanJobResponse(payload)
}

/**
 * 暂停指定扫描任务。Agent 端将状态切换为 Paused，扫描循环停止追加页面，
 * UploadWorker 也跳过该任务，直到调用 resumeScanJob 恢复。
 */
export async function pauseScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/pause`, {})
  return readScanJobResponse(payload)
}

/**
 * 恢复被暂停的扫描任务。仅 Paused 任务可被恢复，其它状态由 Agent 返回业务错误。
 */
export async function resumeScanJob(scanJobId: string): Promise<ScanJobResponse> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/resume`, {})
  return readScanJobResponse(payload)
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
  return readScanJobResponse(payload)
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
  return readScanJobResponse(payload)
}

/**
 * 删除尚未上报后端的 Agent 本地扫描任务。仅清理本地 metadata + 影像文件，
 * 不调用后端废弃接口；若任务已有逐页上传副作用，必须走教师端废弃后端批次的 discard 链路。
 */
export async function deleteScanJob(scanJobId: string): Promise<boolean> {
  const payload = await localAgentPost(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/delete`, {})
  return readBooleanResult(payload)
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
  return readBooleanResult(payload)
}

export function getPageImageUrl(scanJobId: string, pageNo: number): string {
  return `${getLocalAgentBaseUrl()}/api/scan-jobs/${encodeURIComponent(scanJobId)}/pages/${pageNo}/image`
}

async function localAgentGet(path: string): Promise<LocalAgentJsonValue> {
  const response = await requestLocalAgent(path, {
    method: 'GET',
  })
  return await readLocalAgentResponseData(response, tryParseBusyError)
}

async function localAgentPost(path: string, requestBody: object): Promise<LocalAgentJsonValue> {
  const response = await requestLocalAgent(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  return await readLocalAgentResponseData(response, tryParseBusyError)
}

async function requestLocalAgent(path: string, init: RequestInit): Promise<Response> {
  const agentBaseUrl = getLocalAgentBaseUrl()
  try {
    return await fetch(`${agentBaseUrl}${path}`, init)
  } catch {
    throw new LocalAgentUnavailableError(agentBaseUrl)
  }
}
