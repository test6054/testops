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
  pushUrl: string
  pushPageUrl: string
  pushCommitUrl: string
  pushToken: string
  authorizationHeader: string
  defaultExamId?: string
  defaultClassIds: string[]
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
  examId: string
  declaredClassIds: string[]
  scannerDeviceId: string
  scannerStationId: string
  localScannerId: string
  dpi: number
  colorMode: 'COLOR' | 'GRAY' | 'LINEART'
  duplexMode: 'SIMPLEX' | 'DUPLEX'
  expectedPages?: number
  blankPageDetectionEnabled: boolean
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
  status: string
  scannedPages: number
  uploadedPages: number
  reported: boolean
  message: string
  pages: ScanPageInfo[]
}

export function getLocalAgentBaseUrl() {
  const value = import.meta.env.VITE_SCANNER_AGENT_URL
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/$/, '') : DEFAULT_AGENT_BASE_URL
}

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  return await localAgentGet<AgentHealthResponse>('/api/agent/health')
}

export async function listLocalScanners(): Promise<ScannerListResponse> {
  return await localAgentGet<ScannerListResponse>('/api/scanners')
}

export async function activateLocalAgent(payload: ActivateLocalAgentRequest): Promise<ScannerAgentActivateResponse> {
  return await localAgentPost<ScannerAgentActivateResponse, ActivateLocalAgentRequest>('/api/agent/activate', payload)
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
  return await localAgentPost<ScanJobResponse, Record<string, never>>(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/cancel`, {})
}

export async function retryUpload(scanJobId: string): Promise<ScanJobResponse> {
  return await localAgentPost<ScanJobResponse, Record<string, never>>(`/api/scan-jobs/${encodeURIComponent(scanJobId)}/retry-upload`, {})
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
    const message = result.message || `本地 Scanner Agent 请求失败：${result.code || response.status}`
    const busyError = tryParseBusyError(message)
    if (busyError) {
      throw busyError
    }
    throw new Error(message)
  }
  return result.data
}
