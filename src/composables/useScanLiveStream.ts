/**
 * 扫描实时看板 composable：管理 SSE 订阅、断线补差、滚动缓冲区，并按需托管页级账本补差。
 *
 * 用法示例：
 *   const { events, ready, error, isStreaming, refresh, start, stop, ledger, refreshLedger }
 *     = useScanLiveStream({
 *         filter: () => ({ examId: selectedExamId.value, scannerDeviceId: deviceId.value, scannerStationId: stationId.value }),
 *         ledgerFilter: () => batchExternalNo.value
 *           ? { examId: selectedExamId.value, scannerDeviceId: deviceId.value, scannerStationId: stationId.value, batchExternalNo: batchExternalNo.value }
 *           : null,
 *       })
 *   onMounted(start)
 *   onBeforeUnmount(stop)
 *   watch(() => selectedExamId.value, () => refresh())
 *   watch(() => batchExternalNo.value, () => refreshLedger())
 *
 * 设计要点：
 * - filter 通过 getter 函数传入，外部状态变化时调用 refresh() 重新订阅；
 * - 启动时先 listRecentScanEvents 拉历史，再 subscribeScanLive；ready 之后用最大 eventId 做断线补差；
 * - 内部维护 eventId Set 去重，避免历史回填和 SSE 推送重叠时双倍展示；
 * - 缓冲区上限 maxEvents（默认 200），按 createTime + eventId 倒序保留最新 N 条；
 * - 页级账本补差：当 options.ledgerFilter 返回非空时，start / onReady / onError(重连成功后)
 *   / refresh / refreshLedger 都会调用 fetchScannerPageLedger 拉当前批次页级状态快照，承担断线 / 切换批次
 *   时的"补差刷新"角色；ledger 与 events 是两个互补视图，前端按 batchExternalNo + pageNo + sha256
 *   对账，不通过数组下标猜测。
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
import { resolveMarkScannerStationAuthHeaders } from '@/utils/kiosk-auth'
import mittBus from '@/utils/mitt'

export interface UseScanLiveStreamOptions {
  /** 过滤器 getter，每次 refresh/补差时会重新求值 */
  filter: () => ScanLiveSubscribeFilter
  /** 历史回填条数，默认 50 */
  initialLimit?: number
  /** 滚动缓冲区上限，默认 200 */
  maxEvents?: number
  /**
   * 页级账本补差 getter；返回 null 时不拉账本（如当前还未选择批次）。
   * 当返回非空时，start / onReady / refresh / refreshLedger 都会触发 fetchScannerPageLedger。
   */
  ledgerFilter?: () => ExamScannerPageLedgerRequest | null
}

export interface UseScanLiveStreamReturn {
  /** 按 eventId 倒序的事件列表，最新在前 */
  events: Ref<ScanLiveEventVO[]>
  /** SSE 是否已就绪（收到 ready 事件） */
  ready: Ref<boolean>
  /** SSE 是否在订阅中（start 后到 stop/onError 之前） */
  isStreaming: Ref<boolean>
  /** 最近一次错误 */
  error: Ref<Error | null>
  /** 已收到的最大 eventId，用作断线补差游标 */
  lastEventId: Ref<string | undefined>
  /** 是否已注册 token 刷新事件监听 */
  tokenRefreshListenerActive: Ref<boolean>
  /** 当前批次页级账本快照；options.ledgerFilter 缺省或返回 null 时为 null */
  ledger: Ref<ExamScannerPageLedgerVO | null>
  /** ledger 拉取过程中的最近一次错误（不影响 SSE 流） */
  ledgerError: Ref<Error | null>
  /** ledger 是否正在请求中（视图可用于显示骨架/loading） */
  ledgerLoading: Ref<boolean>
  /** 启动订阅 + 历史回填 + 页级账本初次拉取 */
  start: () => Promise<void>
  /** 停止订阅，清空 ledger */
  stop: () => void
  /** 重新订阅（先 stop，再 start，常用于过滤器变化） */
  refresh: () => Promise<void>
  /** 手动刷新页级账本（切换批次 / 用户主动刷新时调用） */
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
  const error = ref<Error | null>(null)
  const lastEventId = ref<string | undefined>(undefined)

  /** 页级账本：当前批次的逐页状态快照 */
  const ledger = ref<ExamScannerPageLedgerVO | null>(null) as Ref<ExamScannerPageLedgerVO | null>
  const ledgerError = ref<Error | null>(null)
  const ledgerLoading = ref(false)
  /**
   * 标识当前正在进行的 ledger 请求序号。当并发触发（如 onReady + watch refresh 同时发起）时，
   * 后发请求覆盖先发请求；先发请求回调用此 token 判断是否已被作废，避免回填旧数据。
   */
  let ledgerRequestToken = 0

  /** 已知 eventId 集合，避免重复 push */
  const knownEventIds = new Set<string>()
  /** 当前订阅的 AbortController */
  let controller: AbortController | null = null

  /**
   * token 刷新事件监听器。该函换需要保持同一引用才能成功 off，因此提出为变量。
   * 触发时立即调用 refresh()：stop 后 refetch 历史 + 重建 SSE 连接，使用代入的新 token。
   */
  const onTokenRefreshed = () => {
    if (!isStreaming.value) {
      // 未 start 或已 stop，没有必要重连
      return
    }
    void refresh()
  }

  /** 监听器是否已绑定到 mittBus，防重复注册。 */
  const tokenRefreshListenerActive = ref(false)

  /**
   * 把一组事件合并到 events 列表（去重 + 上限裁剪 + 重排）。
   * 排序规则：先按 eventId 数字降序，无法解析时退回字符串比较——eventId 为后端 Long 单调递增，字符串比较仅在异常场景兜底。
   */
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

  /**
   * 比较两个 eventId（字符串形式的 Long）的大小：a 大于 b 返回正数，相等返回 0，小于返回负数。
   * 优先用 BigInt 精确比较，BigInt 不可用时退化到字符串比较。
   */
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
      // BigInt 解析失败时降级为字符串比较，仅作兜底
      return a.localeCompare(b)
    }
  }

  /**
   * 拉取当前批次页级账本。
   *
   * <p>触发时机：start 初进、onReady 重连后、外部 refresh、外部手动调用 refreshLedger。
   * 仅当 options.ledgerFilter 返回非空时执行；ledger filter 未配置或返回 null 时把 ledger 置 null
   * 并直接返回。请求过程通过 ledgerRequestToken 做并发互斥，保证最后一次发起的响应胜出，
   * 避免切换批次时早发请求覆盖晚发请求。</p>
   */
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
        // 已被更新的请求作废，丢弃旧响应
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

  /**
   * 拉取历史事件（启动 / SSE ready 后断线补差）。
   * 当 lastEventId 存在时按增量游标拉，否则按 initialLimit 拉最近 N 条。
   */
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
      error.value = toUserError(err, '扫描实时事件加载失败')
    }
  }

  async function start(): Promise<void> {
    if (isStreaming.value) {
      return
    }
    if (!hasMarkScannerStationAuth()) {
      return
    }
    isStreaming.value = true
    ready.value = false
    error.value = null

    // 教师 Web 才订阅 JWT 续期；一体机 push_token 无 refresh 语义。
    if (
      !tokenRefreshListenerActive.value
      && resolveMarkScannerStationAuthHeaders().source === 'jwt'
    ) {
      mittBus.on('auth:token-refreshed', onTokenRefreshed)
      tokenRefreshListenerActive.value = true
    }

    // 启动时先拉历史，让看板立即有数据；同时初次拉一份页级账本（若 ledgerFilter 配置）
    await Promise.all([fetchHistory(false), refreshLedger()])

    const filter = options.filter()
    controller = subscribeScanLive(filter, {
      onReady: () => {
        ready.value = true
        // 收到 ready 后做一次断线补差：拿历史与 SSE 之间的窗口期事件 + 当前批次页级账本快照
        void fetchHistory(true)
        void refreshLedger()
      },
      onEvent: (event) => {
        appendEvents([event])
      },
      onError: (err) => {
        error.value = toUserError(err, '扫描实时订阅失败')
        ready.value = false
        if (err instanceof ScanLiveFatalAuthError) {
          stop()
        }
      },
      onClose: () => {
        ready.value = false
      },
      onAuthRefreshRequired: async () => {
        if (resolveMarkScannerStationAuthHeaders().source !== 'jwt') {
          return
        }
        const refreshed = await authStore.refreshTokenAutomatically()
        if (!refreshed) {
          error.value = toUserError(null, '扫描实时订阅失败，请刷新页面后重试')
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
    // 注销 token 刷新监听器，避免组件卸载后还收到事件触发主动 refresh。
    if (tokenRefreshListenerActive.value) {
      mittBus.off('auth:token-refreshed', onTokenRefreshed)
      tokenRefreshListenerActive.value = false
    }
    isStreaming.value = false
    ready.value = false
    // 作废所有 in-flight ledger 请求，避免 stop 后旧响应误填
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
    await start()
  }

  return {
    events,
    ready: computed(() => ready.value) as Ref<boolean>,
    isStreaming: computed(() => isStreaming.value) as Ref<boolean>,
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
