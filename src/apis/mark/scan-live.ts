/**
 * 扫描实时看板 API - 对接 edu-mark 模块 ScanLiveStreamController
 *
 * 后端规则：
 * - SSE 端点：GET /api/mark/sse/scan-live/subscribe（含 /sse/ 触发后端 GlobalExceptionHandler 静默处理客户端断开）
 * - 增量查询：POST /api/mark/scan-live/recent，返回扫描事件视图列表
 * - 鉴权：浏览器原生 EventSource 不支持自定义 header，必须使用 fetch-event-source 库
 *   在 fetch 请求里携带 Authorization Bearer token
 */
import { fetchEventSource } from '@microsoft/fetch-event-source'
import http from '@/config/axios'
import { getValidToken } from '@/utils/auth'

/** SSE 扫描事件状态码 - 对应后端 ScanEventStatus 枚举 */
export type ScanEventStatusCode = 'PENDING' | 'BATCHED'

/** 扫描事件视图 - 对应 ScanLiveEventResponse */
export interface ScanLiveEventVO {
  /** 扫描事件ID（用作 SSE 重连补差的 afterEventId 游标） */
  eventId: string
  examId: string
  scannerDeviceId: string
  scannerStationId: string
  scannerIp?: string
  pageCount: number
  sourceFileIds?: string[]
  reportId?: string
  batchExternalNo?: string
  scanStartTime?: string
  scanEndTime?: string
  status: ScanEventStatusCode
  scanBatchId?: string
  /** 事件入库时间，前端展示主时间 */
  createTime: string
}

/** 增量查询请求 - 对应 ScanLiveQueryRequest */
export interface ScanLiveQueryPayload {
  examId?: string
  scannerStationId?: string
  scannerDeviceId?: string
  /** 增量游标：返回 id > afterEventId 的事件；不传时取最近 limit 条 */
  afterEventId?: string
  /** 1-200，默认 50 */
  limit?: number
}

/** SSE 订阅过滤器（query 参数） */
export interface ScanLiveSubscribeFilter {
  examId?: string
  scannerStationId?: string
  scannerDeviceId?: string
}

/** SSE 订阅事件处理器 */
export interface ScanLiveStreamHandler {
  /** 收到 ready 事件后调用（连接建立后的同步点） */
  onReady?: () => void
  /** 收到 scan 事件 */
  onEvent: (event: ScanLiveEventVO) => void
  /** 连接错误（仅在不可恢复时触发，库内自动重连） */
  onError?: (err: unknown) => void
  /** 连接关闭（手动 abort 或服务端关闭流） */
  onClose?: () => void
  /** 重连前需要刷新鉴权 token 时调用 */
  onAuthRefreshRequired?: () => Promise<void>
}

/**
 * 增量查询最近扫描事件
 * POST /api/mark/scan-live/recent
 */
export function listRecentScanEvents(
  payload: ScanLiveQueryPayload,
): Promise<ScanLiveEventVO[]> {
  return http.post<unknown>('/api/mark/scan-live/recent', payload).then(validateScanLiveEventList)
}

/**
 * 订阅扫描实时事件 SSE 流。
 *
 * 实现要点：
 * - 使用 fetch-event-source 替代浏览器原生 EventSource，以便在 fetch 请求里携带 Bearer token；
 * - 库内置自动重连，断线后会重新发起 fetch；调用方可在重连时通过 onReady 触发增量补差。
 *
 * @param filter   过滤器（examId / scannerStationId / scannerDeviceId 任一为空表示该维度不过滤）
 * @param handler  事件回调
 * @returns AbortController：调用 .abort() 主动断开订阅
 */
export function subscribeScanLive(
  filter: ScanLiveSubscribeFilter,
  handler: ScanLiveStreamHandler,
): AbortController {
  const controller = new AbortController()
  const params = new URLSearchParams()
  if (filter.examId) {
    params.set('examId', filter.examId)
  }
  if (filter.scannerStationId) {
    params.set('scannerStationId', filter.scannerStationId)
  }
  if (filter.scannerDeviceId) {
    params.set('scannerDeviceId', filter.scannerDeviceId)
  }
  const url = `/api/mark/sse/scan-live/subscribe${params.toString() ? `?${params.toString()}` : ''}`

  let retryWithFreshToken = false
  void fetchEventSource(url, {
    method: 'GET',
    signal: controller.signal,
    // 关键：fetch-event-source 默认会在 visibility 变化时关闭流，这里关闭以保持长连接
    openWhenHidden: true,
    headers: buildAuthHeaders(),
    fetch: async (input, init) => {
      if (retryWithFreshToken) {
        retryWithFreshToken = false
        await handler.onAuthRefreshRequired?.()
      }
      return fetch(input, {
        ...init,
        headers: {
          ...buildAuthHeaders(),
          ...normalizedHeaders(init?.headers),
        },
      })
    },
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        return
      }
      if (response.status === 401 || response.status === 403) {
        retryWithFreshToken = true
      }
      // 非 SSE 响应抛出后由 onerror 统一进入受控重连
      throw new Error(`SSE 订阅失败：HTTP ${response.status}`)
    },
    onmessage(message) {
      if (!message.event || !message.data) {
        return
      }
      if (message.event === 'ready') {
        handler.onReady?.()
        return
      }
      if (message.event === 'scan') {
        try {
          const parsed = validateScanLiveEvent(JSON.parse(message.data))
          handler.onEvent(parsed)
        }
        catch (err) {
          handler.onError?.(err)
        }
      }
    },
    onerror(err) {
      handler.onError?.(err)
      // 默认抛出 -> 不重连；这里返回数字 -> 库会按毫秒间隔重连。控制 5 秒重连一次
      return 5000
    },
    onclose() {
      handler.onClose?.()
    },
  })

  return controller
}

/**
 * 构造 SSE 请求的鉴权 header。
 * fetch-event-source 重连前会再次调用自定义 fetch，因此普通断线重连也能读取最新 token。
 */
function buildAuthHeaders(): Record<string, string> {
  const token = getValidToken()
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function normalizedHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {}
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return headers
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`扫描实时事件缺少 ${fieldName}`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`扫描实时事件 ${fieldName} 格式错误`)
  }
  return value
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`扫描实时事件 ${fieldName} 格式错误`)
  }
  return value
}

function optionalStringList(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`扫描实时事件 ${fieldName} 格式错误`)
  }
  return value
}

function requireScanEventStatus(value: unknown): ScanEventStatusCode {
  if (value !== 'PENDING' && value !== 'BATCHED') {
    throw new TypeError('扫描实时事件 status 格式错误')
  }
  return value
}

function validateScanLiveEvent(value: unknown): ScanLiveEventVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描实时事件返回格式错误')
  }
  const record = value as Record<string, unknown>
  return {
    eventId: requireString(record.eventId, 'eventId'),
    examId: requireString(record.examId, 'examId'),
    scannerDeviceId: requireString(record.scannerDeviceId, 'scannerDeviceId'),
    scannerStationId: requireString(record.scannerStationId, 'scannerStationId'),
    scannerIp: optionalString(record.scannerIp, 'scannerIp'),
    pageCount: requireFiniteNumber(record.pageCount, 'pageCount'),
    sourceFileIds: optionalStringList(record.sourceFileIds, 'sourceFileIds'),
    reportId: optionalString(record.reportId, 'reportId'),
    batchExternalNo: optionalString(record.batchExternalNo, 'batchExternalNo'),
    scanStartTime: optionalString(record.scanStartTime, 'scanStartTime'),
    scanEndTime: optionalString(record.scanEndTime, 'scanEndTime'),
    status: requireScanEventStatus(record.status),
    scanBatchId: optionalString(record.scanBatchId, 'scanBatchId'),
    createTime: requireString(record.createTime, 'createTime'),
  }
}

function validateScanLiveEventList(value: unknown): ScanLiveEventVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('扫描实时事件列表返回格式错误')
  }
  return value.map(validateScanLiveEvent)
}
