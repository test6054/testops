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
  examId?: string
  scannerDeviceId?: string
  scannerStationId?: string
  scannerIp?: string
  pageCount?: number
  sourceFileIds?: string[]
  reportId?: string
  batchExternalNo?: string
  scanStartTime?: string
  scanEndTime?: string
  status?: ScanEventStatusCode
  scanBatchId?: string
  /** 事件入库时间，前端展示主时间 */
  createTime?: string
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
}

/**
 * 增量查询最近扫描事件
 * POST /api/mark/scan-live/recent
 */
export function listRecentScanEvents(
  payload: ScanLiveQueryPayload,
): Promise<ScanLiveEventVO[]> {
  return http.post<ScanLiveEventVO[]>('/api/mark/scan-live/recent', payload)
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

  void fetchEventSource(url, {
    method: 'GET',
    signal: controller.signal,
    // 关键：fetch-event-source 默认会在 visibility 变化时关闭流，这里关闭以保持长连接
    openWhenHidden: true,
    headers: buildAuthHeaders(),
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        return
      }
      // 401/403/5xx：抛出后由 onerror 处理；同步抛出让库不再重连
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
          const parsed = JSON.parse(message.data) as ScanLiveEventVO
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
 * 单独抽出便于在每次 fetch-event-source 重连时重新读取最新 token。
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
