import type { ExamScannerKioskContextVO, ScannerKioskScanMode } from './scanner-kiosk'

const DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:18761'

export interface LocalApiResult<T> {
  success: boolean
  code: string
  message: string
  data?: T
  traceId: string
}

export interface AgentHealthResponse {
  status: string
  agentVersion: string
  machineCode: string
  bound: boolean
  scannerConnected: boolean
  pendingUploadJobs: number
  diagnosticStatus: string
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
  /** edu-mark 整批推送相对路径（multipart 网络扫描仪入口） */
  pushUrl: string
  /** edu-mark 逐页 JSON 上报相对路径（断点续传主链） */
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
  kioskLockEnabled?: boolean
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
  const activeJobId = match ? match[1].trim() : '未知'
  return new ScannerBusyError(message, activeJobId)
}

export interface StartScanJobRequest {
  context: ExamScannerKioskContextVO
  localScannerId: string
  expectedPages?: number
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  /**
   * 是否替换目标页（仅 SUPPLEMENT 模式有效）。
   * true 表示后端会把同一 (paperInstance, templatePageNo) 上的旧扫描页置为 SUPERSEDED，
   * false 表示纯追加补扫（保留旧页）。
   */
  replaceTargetPage?: boolean
}

export interface ScanPageInfo {
  pageNo: number
  status: string
  sizeBytes: number
  diagnostic?: string
  capturedAt: string
  uploadedAt?: string
}

export interface ScanJobResponse {
  scanJobId: string
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  /** 是否替换目标页（仅 SUPPLEMENT 模式生效） */
  replaceTargetPage?: boolean
  status: string
  scannedPages: number
  uploadedPages: number
  reported: boolean
  message: string
  pages: ScanPageInfo[]
}

export function getLocalAgentBaseUrl() {
  const value = import.meta.env.VITE_SCANNER_AGENT_URL
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/\/$/, '')
    : DEFAULT_AGENT_BASE_URL
}

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  return await localAgentGet<AgentHealthResponse>('/api/agent/health')
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  return await localAgentGet<ScannerListResponse>('/api/scanners')
}

export async function activateLocalAgent(
  payload: ActivateLocalAgentRequest,
): Promise<ScannerAgentActivateResponse> {
  return await localAgentPost<ScannerAgentActivateResponse, ActivateLocalAgentRequest>(
    '/api/agent/activate',
    payload,
  )
}

export async function unbindLocalAgent(): Promise<{ success: boolean }> {
  return await localAgentPost<{ success: boolean }, Record<string, never>>('/api/agent/unbind', {})
}

export async function startScanJob(payload: StartScanJobRequest): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, StartScanJobRequest>('/api/scan-jobs/start', payload)
}

export async function getScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentGet<ScanJobResponse>(`/api/scan-jobs/${encodeURIComponent(scanJobId)}`)
}

export async function cancelScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/cancel`,
    {},
  )
}

export async function retryUpload(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-upload`,
    {},
  )
}

/**
 * 暂停指定扫描任务（plan §3.3）。Agent 端将状态切换为 Paused，扫描循环停止追加页面，
 * UploadWorker 也跳过该任务，直到调用 resumeScanJob 恢复。
 */
export async function pauseScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/pause`,
    {},
  )
}

/**
 * 恢复被暂停的扫描任务（plan §3.3）。仅 Paused 任务可被恢复；其它状态原样返回。
 */
export async function resumeScanJob(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/resume`,
    {},
  )
}

/**
 * 结束本批次（plan §3.3）。手工停止仍在扫描的任务并把已采集页面交给上传链路，
 * 不丢弃已扫页面（与 cancelScanJob 不同）。
 */
export async function endBatch(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/end-batch`,
    {},
  )
}

/**
 * 重试 commit（plan §3.3）。把已 push 但 commit 未确认的任务重新放回 Retrying。
 * 利用后端 reportId / batchExternalNo 唯一约束的幂等性。
 */
export async function retryCommit(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-commit`,
    {},
  )
}

/**
 * 删除尚未上报后端的 Agent 本地扫描任务（plan §M3）。仅清理本地 metadata + 影像文件，
 * 不调用后端废弃接口。已 Reported 任务请改用 discardScanJob。
 */
export async function deleteScanJob(scanJobId: string): Promise<boolean> {
  return await localAgentPost<boolean, Record<string, never>>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/delete`,
    {},
  )
}

/**
 * 废弃已上报的扫描任务（plan §M3）：调用 Agent，
 * 由 Agent 联动后端 /scanner/kiosk/batch/discard 把扫描批次置为 DISCARDED，
 * 后端确认后清理 Agent 本地任务数据。
 *
 * @param scanJobId Agent 本地扫描任务 ID
 * @param discardReason 废弃原因（必填，1-255 字）
 */
export async function discardScanJob(
  scanJobId: string,
  discardReason: string,
): Promise<boolean> {
  return await localAgentPost<boolean, { scanJobId: string, discardReason: string }>(
    `/api/scan-jobs/${encodeURIComponent(scanJobId)}/discard`,
    { scanJobId, discardReason },
  )
}

export function getPageImageUrl(scanJobId: string, pageNo: number): string {
  return `${getLocalAgentBaseUrl()}/api/scan-jobs/${encodeURIComponent(scanJobId)}/pages/${pageNo}/image`
}

export function openDiagnosticsExport() {
  window.open(`${getLocalAgentBaseUrl()}/api/diagnostics/export`, '_blank', 'noopener,noreferrer')
}

async function localAgentGet<T>(path: string): Promise<T> {
  const response = await fetch(`${getLocalAgentBaseUrl()}${path}`, {
    method: 'GET',
  })
  return await parseLocalAgentResponse<T>(response)
}

async function localAgentPost<T, TPayload>(path: string, payload: TPayload): Promise<T> {
  const response = await fetch(`${getLocalAgentBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return await parseLocalAgentResponse<T>(response)
}

async function parseLocalAgentResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let result: LocalApiResult<T>
  try {
    result = JSON.parse(text) as LocalApiResult<T>
  } catch {
    throw new Error(text || `本地 Scanner Agent 响应格式错误：${response.status}`)
  }
  if (!response.ok || !result.success || result.data === undefined) {
    const message
      = result.message || `本地 Scanner Agent 请求失败：${result.code || response.status}`
    const busyError = tryParseBusyError(message)
    if (busyError) {
      throw busyError
    }
    throw new Error(message)
  }
  return result.data
}
