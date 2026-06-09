/**
 * 扫描实时看板 API - 对接 edu-mark 模块 ScanLiveStreamController
 *
 * 后端规则：
 * - SSE 端点：GET /api/mark/sse/scan-live/subscribe（含 /sse/ 触发后端 GlobalExceptionHandler 静默处理客户端断开）
 * - 增量查询：POST /api/mark/scan-live/recent，返回扫描事件视图列表
 * - 鉴权：教师 Web 使用 JWT；一体机使用 Agent 激活后的 push_token（与 kiosk API 同源）
 * - 视野：教师 JWT 可按过滤器查看同租户扫描事件；一体机 push_token 必须同时传 scannerDeviceId 与 scannerStationId，
 *   且两者必须等于 token 绑定设备和工位，禁止跨工位订阅或回填。
 */
import { fetchEventSource } from '@microsoft/fetch-event-source'
import http from '@/config/axios'
import {
  buildMarkScannerStationAuthHeaders,
  hasMarkScannerJwtAuth,
  hasMarkScannerStationAuth,
  KIOSK_BROWSER_SESSION_LOST_MESSAGE
} from '@/utils/kiosk-auth'

/** SSE 鉴权不可恢复失败：一体机 push_token 无效或缺失，禁止自动重连。 */
export class ScanLiveFatalAuthError extends Error {
  readonly fatal = true

  constructor(message: string) {
    super(message)
    this.name = 'ScanLiveFatalAuthError'
  }
}

/** SSE 扫描事件状态码 - 对应后端 ScanEventStatus 枚举 */
export type ScanEventStatusCode = 'PENDING' | 'BATCHED' | 'INVALID'

/** 来源文件引用 - 对应后端 ExamFileRefVO */
export interface ExamFileRefVO {
  fileId: string
  fileName: string
}

/** 扫描事件视图 - 对应 ScanLiveEventResponse */
export interface ScanLiveEventVO {
  /** 扫描事件ID（用作 SSE 重连补差的 afterEventId 游标） */
  eventId: string
  examId: string
  examName: string
  examNo: string
  scannerDeviceId: string
  scannerStationId: string
  scannerIp?: string
  pageCount: number
  sourceFiles: ExamFileRefVO[]
  sourceFileCount: number
  reportId?: string
  batchExternalNo?: string
  scanStartTime?: string
  scanEndTime?: string
  status: ScanEventStatusCode
  scanBatchId?: string
  /** 事件入库时间，前端展示主时间 */
  createTime: string
}

/** 增量查询请求 - 对应 ScanLiveQueryRequest；push_token 会话必须声明绑定设备和工位 */
export interface ScanLiveQueryRequest {
  examId?: string
  scannerStationId?: string
  scannerDeviceId?: string
  /** 增量游标：返回 id > afterEventId 的事件；不传时取最近 limit 条 */
  afterEventId?: string
  /** 1-200，默认 50 */
  limit?: number
}

/** SSE 订阅过滤器（query 参数）；push_token 会话必须声明绑定设备和工位 */
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
  onError?: (err: Error) => void
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
  request: ScanLiveQueryRequest,
): Promise<ScanLiveEventVO[]> {
  return http.post<ScanLiveEventVO[]>('/api/mark/scan-live/recent', request)
}

/**
 * 订阅扫描实时事件 SSE 流。
 *
 * 实现要点：
 * - 使用 fetch-event-source 替代浏览器原生 EventSource，以便在 fetch 请求里携带 Bearer token；
 * - 库内置自动重连，断线后会重新发起 fetch；调用方可在重连时通过 onReady 触发增量补差。
 *
 * @param filter   过滤器。教师 JWT 会话可空维度不过滤；一体机 push_token 会话必须传绑定 scannerStationId / scannerDeviceId。
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

  if (!hasMarkScannerStationAuth()) {
    handler.onError?.(new Error('扫描实时订阅缺少鉴权，请先登录或完成一体机 Agent 激活'))
    return controller
  }

  let retryWithFreshToken = false
  void fetchEventSource(url, {
    method: 'GET',
    signal: controller.signal,
    // 关键：fetch-event-source 默认会在 visibility 变化时关闭流，这里关闭以保持长连接
    openWhenHidden: true,
    headers: buildAuthHeaders(),
    fetch: async (input, init) => {
      if (retryWithFreshToken && hasMarkScannerJwtAuth()) {
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
      const contentType = response.headers.get('content-type') ?? ''
      if (response.ok && contentType.includes('text/event-stream')) {
        return
      }
      if (response.status === 401 || response.status === 403) {
        if (hasMarkScannerJwtAuth()) {
          retryWithFreshToken = true
          throw new Error('扫描实时连接暂时不可用，正在尝试重连')
        }
        const authErr = new ScanLiveFatalAuthError(KIOSK_BROWSER_SESSION_LOST_MESSAGE)
        handler.onError?.(authErr)
        controller.abort()
        throw authErr
      }
      throw new Error('扫描实时连接暂时不可用，正在尝试重连')
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
          const parsed: ScanLiveEventVO = JSON.parse(message.data)
          handler.onEvent(parsed)
        }
        catch (err) {
          handler.onError?.(new Error('扫描实时消息读取失败，正在等待下一次更新'))
        }
      }
    },
    onerror(err) {
      if (err instanceof ScanLiveFatalAuthError) {
        throw err
      }
      handler.onError?.(err instanceof Error ? err : new Error('SSE 订阅连接失败'))
      return 5000
    },
    onclose() {
      handler.onClose?.()
    },
  })

  return controller
}

/**
 * 构造 SSE 请求的鉴权 header（JWT 或一体机 push_token）。
 */
function buildAuthHeaders(): Record<string, string> {
  return buildMarkScannerStationAuthHeaders({
    Accept: 'text/event-stream',
  })
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
