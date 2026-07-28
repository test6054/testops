/**
 * 阅卷任务 SSE API - 对接 edu-mark MarkingTaskStreamController（契约见 RW 方案 §6.7）
 */
import type { MarkingTaskStatusCode } from './marking-organization'
import type { MarkingTaskStreamEventTypeCode } from '@/types/enums/marking-task-stream-event-type-enum'
import type { MarkingTaskStreamSubscribeScopeCode } from '@/types/enums/marking-task-stream-subscribe-scope-enum'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import http from '@/config/axios'
import { useAuthStore } from '@/stores/modules/auth'

import { getValidToken } from '@/utils/auth'
import { readMarkingTaskStreamEvent } from '@/wire/mark/marking-task-stream-wire'

export {
  ALL_MARKING_TASK_STREAM_EVENT_TYPE_CODES,
  MarkingTaskStreamEventTypeCode,
  MarkingTaskStreamEventTypeDescription,
} from '@/types/enums/marking-task-stream-event-type-enum'

export {
  ALL_MARKING_TASK_STREAM_SUBSCRIBE_SCOPE_CODES,
  MarkingTaskStreamSubscribeScopeCode,
  MarkingTaskStreamSubscribeScopeDescription,
} from '@/types/enums/marking-task-stream-subscribe-scope-enum'

/** 阅卷任务 SSE 事件 - 对应 MarkingTaskStreamEventResponse */
export interface MarkingTaskStreamEventVO {
  eventId: string
  eventType: MarkingTaskStreamEventTypeCode
  examId: string
  sessionId?: string
  taskId?: string
  reviewerUserId?: string
  taskStatus?: MarkingTaskStatusCode
  occurredAt: string
  /** exam Topic 组级待处理任务数 */
  pendingCount?: number
  /** exam Topic 组级已提交任务数 */
  submittedCount?: number
}

/** 增量查询请求 - 对应 MarkingTaskStreamQueryRequest */
export interface MarkingTaskStreamQueryRequest {
  examId: string
  sessionId?: string
  /** 与 subscribe scope 一致；GROUP_LEADER 查 exam Topic 进度事件 */
  scope?: MarkingTaskStreamSubscribeScopeCode
  afterEventId?: string
  limit?: number
}

/** SSE 订阅参数 */
export interface MarkingTaskStreamSubscribeFilter {
  examId: string
  sessionId?: string
  scope: MarkingTaskStreamSubscribeScopeCode
}

export class MarkingTaskStreamFatalAuthError extends Error {
  readonly fatal = true

  constructor(message: string) {
    super(message)
    this.name = 'MarkingTaskStreamFatalAuthError'
  }
}

export interface MarkingTaskStreamHandler {
  onReady?: () => void
  onEvent: (event: MarkingTaskStreamEventVO) => void
  onError?: (err: Error) => void
  onClose?: () => void
  onAuthRefreshRequired?: () => Promise<void>
}

/**
 * 增量查询最近阅卷任务 SSE 事件。
 * POST /api/mark/marking-task/recent
 */
export function listRecentMarkingTaskEvents(
  request: MarkingTaskStreamQueryRequest,
): Promise<MarkingTaskStreamEventVO[]> {
  return http.post<MarkingTaskStreamEventVO[]>('/api/mark/marking-task/recent', request)
}

async function buildMarkingStreamAuthHeaders(): Promise<Record<string, string>> {
  const token = getValidToken()
  if (!token) {
    throw new MarkingTaskStreamFatalAuthError('阅卷任务实时订阅缺少鉴权，请重新登录')
  }
  return {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  }
}

function normalizedHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {}
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

/**
 * 订阅阅卷任务 SSE 流。
 * GET /api/mark/sse/marking-task/subscribe
 */
export function subscribeMarkingTaskStream(
  filter: MarkingTaskStreamSubscribeFilter,
  handler: MarkingTaskStreamHandler,
): AbortController {
  const controller = new AbortController()
  const params = new URLSearchParams()
  params.set('examId', filter.examId)
  if (filter.sessionId) {
    params.set('sessionId', filter.sessionId)
  }
  params.set('scope', filter.scope)
  const url = `/api/mark/sse/marking-task/subscribe?${params.toString()}`

  let jwtAuthRetried = false
  let retryWithFreshToken = false

  void fetchEventSource(url, {
    method: 'GET',
    signal: controller.signal,
    openWhenHidden: true,
    fetch: async (input, init) => {
      if (retryWithFreshToken) {
        retryWithFreshToken = false
        await handler.onAuthRefreshRequired?.()
      }
      const authHeaders = await buildMarkingStreamAuthHeaders()
      return fetch(input, {
        ...init,
        headers: {
          ...normalizedHeaders(init?.headers),
          ...authHeaders,
        },
      })
    },
    async onopen(response) {
      const contentType = response.headers.get('content-type') ?? ''
      if (response.ok && contentType.includes('text/event-stream')) {
        return
      }
      if (response.status === 401 || response.status === 403) {
        if (!jwtAuthRetried) {
          jwtAuthRetried = true
          retryWithFreshToken = true
          throw new Error('阅卷任务实时连接暂时不可用，正在尝试重连')
        }
        const authErr = new MarkingTaskStreamFatalAuthError('阅卷任务实时订阅鉴权失败')
        handler.onError?.(authErr)
        controller.abort()
        throw authErr
      }
      throw new Error('阅卷任务实时连接暂时不可用，正在尝试重连')
    },
    onmessage(message) {
      if (!message.event || !message.data) return
      if (message.event === 'ready') {
        handler.onReady?.()
        return
      }
      if (message.event === 'marking-task') {
        try {
          handler.onEvent(readMarkingTaskStreamEvent(message.data))
        } catch (err) {
          handler.onError?.(err instanceof Error ? err : new Error('阅卷任务实时消息解析失败'))
        }
      }
    },
    onerror(err) {
      if (err instanceof MarkingTaskStreamFatalAuthError) {
        throw err
      }
      handler.onError?.(err instanceof Error ? err : new Error('阅卷任务 SSE 连接失败'))
      return 5000
    },
    onclose() {
      handler.onClose?.()
    },
  })

  return controller
}

export async function refreshMarkingTaskStreamToken(): Promise<boolean> {
  const authStore = useAuthStore()
  return authStore.refreshTokenAutomatically()
}
