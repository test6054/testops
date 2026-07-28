import { onScopeDispose } from 'vue'

/** 单次异步加载令牌：await 后用 isStale() 丢弃过期响应 */
export interface SequencedLoadToken {
  /** 本次加载序号 */
  generation: number
  /** 是否已被更新的 run/invalidate 取代 */
  isStale: () => boolean
}

export interface UseSequencedLoadOptions {
  /**
   * 调度防抖毫秒。
   * 用于 scope 联动等多值同一轮变更；0 表示不防抖。
   */
  debounceMs?: number
}

/**
 * 异步加载序号守卫原语（与 exam-list / score-finalize 同构）。
 * 不取消 in-flight 请求，仅通过 generation 丢弃过期副作用。
 */
export function useSequencedLoad(options?: UseSequencedLoadOptions) {
  let generation = 0
  const debounceMs = options?.debounceMs ?? 0
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function cancelScheduled(): void {
    if (debounceTimer == null) {
      return
    }
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  function begin(): SequencedLoadToken {
    const current = ++generation
    return {
      generation: current,
      isStale: () => current !== generation,
    }
  }

  function getGeneration(): number {
    return generation
  }

  /** 递增序号使一切 in-flight token 立即过期，并取消未触发的防抖 */
  function invalidate(): void {
    generation += 1
    cancelScheduled()
  }

  async function run(
    loadFn: (token: SequencedLoadToken) => void | Promise<void>,
  ): Promise<void> {
    const token = begin()
    await loadFn(token)
  }

  /** 取消防抖后立即 run */
  function runNow(loadFn: (token: SequencedLoadToken) => void | Promise<void>): void {
    cancelScheduled()
    void run(loadFn)
  }

  /** 防抖调度；debounceMs 为 0 时等同 runNow */
  function schedule(loadFn: (token: SequencedLoadToken) => void | Promise<void>): void {
    if (debounceMs <= 0) {
      runNow(loadFn)
      return
    }
    cancelScheduled()
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void run(loadFn)
    }, debounceMs)
  }

  onScopeDispose(() => {
    invalidate()
  })

  return {
    begin,
    getGeneration,
    invalidate,
    run,
    runNow,
    schedule,
    cancelScheduled,
  }
}
