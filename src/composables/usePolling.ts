import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue'

export interface PollingRuntimeOptions {
  /** 轮询间隔（毫秒） */
  intervalMs: number
  /** 是否应继续轮询 */
  when: boolean
  /** 启动轮询时是否立即 tick 一次 */
  immediate?: boolean
}

export interface UsePollingOptions {
  /** 动态读取轮询参数（列表状态变化后需重新 syncPolling） */
  getOptions: () => PollingRuntimeOptions
  /** 页面不可见时暂停（document.hidden） */
  pauseWhenDocumentHidden?: boolean
}

/**
 * 组件级轮询：onMounted/onActivated 恢复，onDeactivated/onBeforeUnmount 暂停。
 * 适用于 keepAlive 缓存页与 quality 列表异步任务刷新。
 */
export function usePolling(
  tick: () => void | Promise<void>,
  options: UsePollingOptions,
) {
  let timer: ReturnType<typeof setInterval> | null = null
  let lifecycleActive = false
  let tickInFlight = false
  let activeIntervalMs = 0

  function stopTimer(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  async function runTick(): Promise<void> {
    if (tickInFlight) {
      return
    }
    tickInFlight = true
    try {
      await tick()
    }
    finally {
      tickInFlight = false
    }
  }

  function isDocumentPaused(): boolean {
    if (!options.pauseWhenDocumentHidden) {
      return false
    }
    return typeof document !== 'undefined' && document.hidden
  }

  /** 根据 when 与生命周期状态同步 interval */
  function syncPolling(): void {
    if (!lifecycleActive || isDocumentPaused()) {
      stopTimer()
      return
    }
    const runtime = options.getOptions()
    if (runtime.when) {
      if (timer !== null && activeIntervalMs !== runtime.intervalMs) {
        stopTimer()
      }
      if (timer === null) {
        activeIntervalMs = runtime.intervalMs
        if (runtime.immediate) {
          void runTick()
        }
        timer = setInterval(() => {
          void runTick()
        }, runtime.intervalMs)
      }
    }
    else {
      stopTimer()
    }
  }

  function pause(): void {
    lifecycleActive = false
    stopTimer()
  }

  function resume(): void {
    lifecycleActive = true
    syncPolling()
  }

  function onVisibilityChange(): void {
    syncPolling()
  }

  onMounted(() => {
    resume()
    if (options.pauseWhenDocumentHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onActivated(() => {
    resume()
  })

  onDeactivated(() => {
    pause()
  })

  onBeforeUnmount(() => {
    pause()
    if (options.pauseWhenDocumentHidden && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return {
    syncPolling,
    pause,
    resume,
  }
}
