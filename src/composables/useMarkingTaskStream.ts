import type { Ref } from 'vue'
import type { MarkingTaskStreamEventVO, MarkingTaskStreamSubscribeScopeCode } from '@/apis/mark/marking-task-stream'
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  listRecentMarkingTaskEvents,
  MarkingTaskStreamFatalAuthError,
  subscribeMarkingTaskStream
} from '@/apis/mark/marking-task-stream'
import { useAuthStore } from '@/stores/modules/auth'
import { toUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'

/** SSE 连接阶段 */
export type MarkingTaskStreamConnectionPhase = 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'failed'

const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 60_000
const MAX_RECONNECT_ATTEMPTS = 20

export interface UseMarkingTaskStreamOptions {
  filter: () => {
    examId: string
    sessionId?: string
    scope: MarkingTaskStreamSubscribeScopeCode
  }
  when?: () => boolean
  initialLimit?: number
  onEvent?: (event: MarkingTaskStreamEventVO) => void
}

export interface UseMarkingTaskStreamReturn {
  ready: Ref<boolean>
  connectionPhase: Ref<MarkingTaskStreamConnectionPhase>
  error: Ref<Error | null>
  lastEventId: Ref<string | undefined>
  latestExamProgress: Ref<{ pendingCount?: number, submittedCount?: number } | null>
  start: () => Promise<void>
  stop: () => void
  refresh: () => Promise<void>
}

function compareEventId(a: string | undefined, b: string | undefined): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  try {
    const ba = BigInt(a)
    const bb = BigInt(b)
    if (ba > bb) return 1
    if (ba < bb) return -1
    return 0
  }
  catch {
    return a.localeCompare(b)
  }
}

export function useMarkingTaskStream(
  options: UseMarkingTaskStreamOptions,
): UseMarkingTaskStreamReturn {
  const authStore = useAuthStore()
  const initialLimit = options.initialLimit ?? 50

  const ready = ref(false)
  const connectionPhase = ref<MarkingTaskStreamConnectionPhase>('idle')
  const error = ref<Error | null>(null)
  const lastEventId = ref<string | undefined>(undefined)
  const latestExamProgress = ref<{ pendingCount?: number, submittedCount?: number } | null>(null)

  let isActive = false
  let controller: AbortController | null = null
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let tokenListenerActive = false

  const onTokenRefreshed = () => {
    if (!isActive) return
    void refresh()
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function absorbEvent(event: MarkingTaskStreamEventVO): void {
    if (event.eventId && compareEventId(event.eventId, lastEventId.value) > 0) {
      lastEventId.value = event.eventId
    }
    if (event.pendingCount !== undefined || event.submittedCount !== undefined) {
      latestExamProgress.value = {
        pendingCount: event.pendingCount,
        submittedCount: event.submittedCount,
      }
    }
    options.onEvent?.(event)
  }

  async function fetchRecent(useCursor: boolean): Promise<void> {
    const filter = options.filter()
    if (!filter.examId) return
    try {
      const list = await listRecentMarkingTaskEvents({
        examId: filter.examId,
        sessionId: filter.sessionId,
        scope: filter.scope,
        afterEventId: useCursor ? lastEventId.value : undefined,
        limit: initialLimit,
      })
      for (const event of list) {
        absorbEvent(event)
      }
    }
    catch (err) {
      if (useCursor && ready.value && isActive) {
        error.value = toUserError(err, '阅卷任务事件补差失败')
        return
      }
      markFailed(err, '阅卷任务实时事件加载失败')
    }
  }

  function markFailed(err: unknown, fallbackMessage: string): void {
    error.value = toUserError(err, fallbackMessage)
    connectionPhase.value = 'failed'
    ready.value = false
  }

  function abortConnection(): void {
    if (controller) {
      controller.abort()
      controller = null
    }
  }

  function scheduleReconnect(): void {
    clearReconnectTimer()
    if (!isActive) return
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      connectionPhase.value = 'failed'
      ready.value = false
      return
    }
    if (typeof document !== 'undefined' && document.hidden) {
      connectionPhase.value = 'reconnecting'
      ready.value = false
      return
    }
    const delay = Math.min(INITIAL_RECONNECT_MS * (2 ** reconnectAttempt), MAX_RECONNECT_MS)
    reconnectAttempt += 1
    connectionPhase.value = 'reconnecting'
    ready.value = false
    reconnectTimer = setTimeout(() => {
      void connectStream()
    }, delay)
  }

  async function connectStream(): Promise<void> {
    if (!isActive) return
    const filter = options.filter()
    if (!filter.examId) return

    abortConnection()
    connectionPhase.value = reconnectAttempt === 0 ? 'connecting' : 'reconnecting'

    await fetchRecent(reconnectAttempt > 0)

    controller = subscribeMarkingTaskStream(filter, {
      onReady: () => {
        ready.value = true
        connectionPhase.value = 'ready'
        error.value = null
        reconnectAttempt = 0
        void fetchRecent(true)
      },
      onEvent: (event) => {
        absorbEvent(event)
      },
      onError: (err) => {
        if (err instanceof MarkingTaskStreamFatalAuthError) {
          markFailed(err, '阅卷任务实时订阅鉴权失败')
          stop()
          return
        }
        abortConnection()
        scheduleReconnect()
      },
      onClose: () => {
        ready.value = false
        if (isActive && connectionPhase.value !== 'failed') {
          scheduleReconnect()
        }
      },
      onAuthRefreshRequired: async () => {
        const refreshed = await authStore.refreshTokenAutomatically()
        if (!refreshed) {
          markFailed(null, '阅卷任务实时订阅失败，请刷新页面后重试')
          stop()
        }
      },
    })
  }

  async function start(): Promise<void> {
    if (isActive) return
    if (options.when && !options.when()) return
    isActive = true
    reconnectAttempt = 0
    error.value = null
    if (!tokenListenerActive) {
      mittBus.on('auth:token-refreshed', onTokenRefreshed)
      tokenListenerActive = true
    }
    await connectStream()
  }

  function stop(): void {
    isActive = false
    clearReconnectTimer()
    abortConnection()
    if (tokenListenerActive) {
      mittBus.off('auth:token-refreshed', onTokenRefreshed)
      tokenListenerActive = false
    }
    ready.value = false
    connectionPhase.value = 'idle'
    lastEventId.value = undefined
    latestExamProgress.value = null
  }

  async function refresh(): Promise<void> {
    stop()
    await start()
  }

  function onVisibilityChange(): void {
    if (!isActive) return
    if (document.hidden) {
      clearReconnectTimer()
      return
    }
    if (!ready.value && connectionPhase.value !== 'failed') {
      void connectStream()
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    stop()
  })

  return {
    ready: computed(() => ready.value),
    connectionPhase,
    error,
    lastEventId,
    latestExamProgress,
    start,
    stop,
    refresh,
  }
}
