/**
 * 扫描实时看板 composable：管理 SSE 订阅、断线补差、滚动缓冲区，并按需托管页级账本补差。
 */
import type { Ref } from 'vue'
import type { ScanLiveEventVO, ScanLiveSubscribeFilter } from '@/apis/mark/scan-live'
import type {
  ExamScannerPageLedgerRequest,
  ExamScannerPageLedgerVO,
} from '@/apis/mark/scanner-kiosk'
import { computed, ref } from 'vue'
import {
  listRecentScanEvents,
  ScanLiveFatalAuthError,
  subscribeScanLive,
} from '@/apis/mark/scan-live'
import { fetchScannerPageLedger } from '@/apis/mark/scanner-kiosk'
import { useAuthStore } from '@/stores/modules/auth'
import { toUserError } from '@/utils/error-handler'
import {
  hasMarkScannerStationAuth,
  resolveMarkScannerStationAuthHeaders,
} from '@/utils/kiosk-auth'
import mittBus from '@/utils/mitt'

/** SSE 连接阶段：重连中不向外抛 toast 级错误 */
export type ScanLiveConnectionPhase = 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'failed'

export interface UseScanLiveStreamOptions {
  filter: () => ScanLiveSubscribeFilter
  initialLimit?: number
  maxEvents?: number
  ledgerFilter?: () => ExamScannerPageLedgerRequest | null
}

export interface UseScanLiveStreamReturn {
  events: Ref<ScanLiveEventVO[]>
  ready: Ref<boolean>
  isStreaming: Ref<boolean>
  connectionPhase: Ref<ScanLiveConnectionPhase>
  error: Ref<Error | null>
  lastEventId: Ref<string | undefined>
  tokenRefreshListenerActive: Ref<boolean>
  ledger: Ref<ExamScannerPageLedgerVO | null>
  ledgerError: Ref<Error | null>
  ledgerLoading: Ref<boolean>
  start: () => Promise<void>
  stop: () => void
  refresh: () => Promise<void>
  refreshLedger: () => Promise<void>
}

export function useScanLiveStream(
  options: UseScanLiveStreamOptions,
): UseScanLiveStreamReturn {
  const authStore = useAuthStore()
  const initialLimit = options.initialLimit ?? 50
  const maxEvents = options.maxEvents ?? 200

  const events = ref<ScanLiveEventVO[]>([]) as Ref<ScanLiveEventVO[]>
  const ready = ref(false)
  const isStreaming = ref(false)
  const connectionPhase = ref<ScanLiveConnectionPhase>('idle')
  const error = ref<Error | null>(null)
  const lastEventId = ref<string | undefined>(undefined)

  const ledger = ref<ExamScannerPageLedgerVO | null>(null) as Ref<ExamScannerPageLedgerVO | null>
  const ledgerError = ref<Error | null>(null)
  const ledgerLoading = ref(false)
  let ledgerRequestToken = 0

  const knownEventIds = new Set<string>()
  let controller: AbortController | null = null

  const onTokenRefreshed = () => {
    if (!isStreaming.value) {
      return
    }
    void refresh()
  }

  const tokenRefreshListenerActive = ref(false)

  function appendEvents(incoming: ScanLiveEventVO[]): void {
    if (incoming.length === 0) {
      return
    }
    const merged: ScanLiveEventVO[] = [...events.value]
    for (const event of incoming) {
      if (!event.eventId) continue
      if (knownEventIds.has(event.eventId)) {
        continue
      }
      knownEventIds.add(event.eventId)
      merged.push(event)
      if (compareEventId(event.eventId, lastEventId.value) > 0) {
        lastEventId.value = event.eventId
      }
    }
    merged.sort((a, b) => compareEventId(b.eventId, a.eventId))
    if (merged.length > maxEvents) {
      const dropped = merged.splice(maxEvents)
      for (const item of dropped) {
        knownEventIds.delete(item.eventId)
      }
    }
    events.value = merged
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

  function markTransientReconnect(): void {
    error.value = null
    connectionPhase.value = 'reconnecting'
    ready.value = false
  }

  function markFailed(err: unknown, fallbackMessage: string): void {
    error.value = toUserError(err, fallbackMessage)
    connectionPhase.value = 'failed'
    ready.value = false
  }

  async function refreshLedger(): Promise<void> {
    if (!options.ledgerFilter) {
      return
    }
    if (!hasMarkScannerStationAuth()) {
      ledger.value = null
      ledgerError.value = null
      return
    }
    const filter = options.ledgerFilter()
    if (!filter) {
      ledger.value = null
      ledgerError.value = null
      return
    }
    const token = ++ledgerRequestToken
    ledgerLoading.value = true
    try {
      const vo = await fetchScannerPageLedger(filter)
      if (token !== ledgerRequestToken) {
        return
      }
      ledger.value = vo
      ledgerError.value = null
    }
    catch (err) {
      if (token !== ledgerRequestToken) {
        return
      }
      ledgerError.value = toUserError(err, '扫描页级账本加载失败')
    }
    finally {
      if (token === ledgerRequestToken) {
        ledgerLoading.value = false
      }
    }
  }

  async function fetchHistory(useCursor: boolean): Promise<void> {
    try {
      const filter = options.filter()
      const list = await listRecentScanEvents({
        examId: filter.examId,
        scannerStationId: filter.scannerStationId,
        scannerDeviceId: filter.scannerDeviceId,
        afterEventId: useCursor ? lastEventId.value : undefined,
        limit: initialLimit,
      })
      appendEvents(list)
    }
    catch (err) {
      // SSE 已就绪后的增量补差失败不应把连接标为 failed，实时流仍可继续
      if (useCursor && ready.value && isStreaming.value) {
        error.value = toUserError(err, '扫描事件补差失败')
        return
      }
      markFailed(err, '扫描实时事件加载失败')
    }
  }

  async function start(): Promise<void> {
    if (isStreaming.value) {
      return
    }
    if (!hasMarkScannerStationAuth()) {
      connectionPhase.value = 'idle'
      return
    }
    isStreaming.value = true
    ready.value = false
    error.value = null
    connectionPhase.value = 'connecting'

    if (
      !tokenRefreshListenerActive.value
      && resolveMarkScannerStationAuthHeaders().source === 'jwt'
    ) {
      mittBus.on('auth:token-refreshed', onTokenRefreshed)
      tokenRefreshListenerActive.value = true
    }

    await Promise.all([fetchHistory(false), refreshLedger()])

    const filter = options.filter()
    controller = subscribeScanLive(filter, {
      onReady: () => {
        ready.value = true
        connectionPhase.value = 'ready'
        error.value = null
        void fetchHistory(true)
        void refreshLedger()
      },
      onEvent: (event) => {
        appendEvents([event])
      },
      onError: (err) => {
        if (err instanceof ScanLiveFatalAuthError) {
          markFailed(err, '扫描实时订阅鉴权失败')
          stop()
          return
        }
        markTransientReconnect()
      },
      onClose: () => {
        ready.value = false
        if (isStreaming.value && connectionPhase.value !== 'failed') {
          connectionPhase.value = 'reconnecting'
        }
      },
      onAuthRefreshRequired: async () => {
        if (resolveMarkScannerStationAuthHeaders().source !== 'jwt') {
          return
        }
        const refreshed = await authStore.refreshTokenAutomatically()
        if (!refreshed) {
          markFailed(null, '扫描实时订阅失败，请刷新页面后重试')
          stop()
        }
      },
    })
  }

  function stop(): void {
    if (controller) {
      controller.abort()
      controller = null
    }
    if (tokenRefreshListenerActive.value) {
      mittBus.off('auth:token-refreshed', onTokenRefreshed)
      tokenRefreshListenerActive.value = false
    }
    isStreaming.value = false
    ready.value = false
    connectionPhase.value = 'idle'
    events.value = []
    knownEventIds.clear()
    lastEventId.value = undefined
    ledgerRequestToken++
    ledger.value = null
    ledgerError.value = null
    ledgerLoading.value = false
  }

  async function refresh(): Promise<void> {
    stop()
    events.value = []
    knownEventIds.clear()
    lastEventId.value = undefined
    error.value = null
    await start()
  }

  return {
    events,
    ready: computed(() => ready.value) as Ref<boolean>,
    isStreaming: computed(() => isStreaming.value) as Ref<boolean>,
    connectionPhase,
    error,
    lastEventId,
    tokenRefreshListenerActive,
    ledger,
    ledgerError,
    ledgerLoading,
    start,
    stop,
    refresh,
    refreshLedger,
  }
}
