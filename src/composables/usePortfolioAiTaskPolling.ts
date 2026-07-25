import type { AiTaskVO } from '@/apis/quality/ai-task'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { AiTaskStatusCode } from '@/types/enums/ai-task-status-enum'
import { computed, onBeforeUnmount, ref } from 'vue'

export type PortfolioAiTaskPollOutcome =
  | AiTaskStatusCode.COMPLETED
  | AiTaskStatusCode.FAILED
  | AiTaskStatusCode.CANCELLED
  | 'TIMEOUT'
  | 'ABORTED'

export interface PortfolioAiTaskPollResult {
  outcome: PortfolioAiTaskPollOutcome
  task: AiTaskVO | null
}

const DEFAULT_INITIAL_DELAY_MS = 2000
const DEFAULT_MAX_DELAY_MS = 16000
const DEFAULT_MAX_ATTEMPTS = 24

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatPollClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function nextBackoffMs(attemptIndex: number, initialDelayMs: number, maxDelayMs: number): number {
  return Math.min(maxDelayMs, initialDelayMs * 2 ** attemptIndex)
}

/**
 * 等待下一轮轮询；页面隐藏时暂停倒计时，代际失效则中止。
 */
async function waitWithVisibilityPause(
  delayMs: number,
  isCurrent: () => boolean,
  onVisibilityPauseChange: (paused: boolean) => void,
): Promise<'ok' | 'aborted'> {
  let remaining = delayMs
  const sliceMs = 250
  while (remaining > 0) {
    if (!isCurrent()) {
      return 'aborted'
    }
    const hidden = typeof document !== 'undefined' && document.hidden
    onVisibilityPauseChange(hidden)
    if (hidden) {
      await sleep(sliceMs)
      continue
    }
    const step = Math.min(sliceMs, remaining)
    await sleep(step)
    remaining -= step
  }
  return isCurrent() ? 'ok' : 'aborted'
}

/**
 * 档案袋 AI 任务轮询 owner：指数退避、隐藏页暂停、终态停止；超时保留 taskId 供继续同步。
 */
export function usePortfolioAiTaskPolling(options?: {
  initialDelayMs?: number
  maxDelayMs?: number
  maxAttempts?: number
}) {
  const initialDelayMs = options?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  const polling = ref(false)
  const activeTaskId = ref<string | null>(null)
  const lastSyncedAt = ref<string | null>(null)
  const nextPollAt = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const timedOutTaskId = ref<string | null>(null)
  const pausedByVisibility = ref(false)

  let ownerGeneration = 0

  const pollStatusDescription = computed(() => {
    if (polling.value) {
      const parts: string[] = []
      if (pausedByVisibility.value) {
        parts.push('页面隐藏，同步已暂停')
      }
      if (lastSyncedAt.value) {
        parts.push(`最近同步 ${formatPollClock(lastSyncedAt.value)}`)
      }
      if (nextPollAt.value && !pausedByVisibility.value) {
        parts.push(`下次约 ${formatPollClock(nextPollAt.value)}`)
      }
      return parts.join(' · ') || '正在同步任务状态…'
    }
    if (timedOutTaskId.value) {
      return lastError.value || '任务仍在后台执行，可从任务中心查看或继续同步'
    }
    return ''
  })

  /** 作废当前轮询代际，停止进行中的等待与写入。 */
  function invalidateOwner(): void {
    ownerGeneration += 1
    polling.value = false
    activeTaskId.value = null
    timedOutTaskId.value = null
    nextPollAt.value = null
    pausedByVisibility.value = false
    lastError.value = null
  }

  /**
   * 轮询任务直至完成/失败/取消或超时；网络失败不改写任务终态，仅可见后退避继续。
   */
  async function pollUntilSettled(
    taskId: string,
    isCurrent: () => boolean,
  ): Promise<PortfolioAiTaskPollResult> {
    const generation = ++ownerGeneration
    const stillMine = () => generation === ownerGeneration && isCurrent()

    polling.value = true
    activeTaskId.value = taskId
    timedOutTaskId.value = null
    lastError.value = null
    nextPollAt.value = null
    pausedByVisibility.value = false

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!stillMine()) {
          return { outcome: 'ABORTED', task: null }
        }

        let task: AiTaskVO
        try {
          task = await portfolioAiJobApi.get(taskId)
        } catch {
          if (!stillMine()) {
            return { outcome: 'ABORTED', task: null }
          }
          lastError.value = '任务状态同步失败，将继续退避同步'
          const delay = nextBackoffMs(attempt, initialDelayMs, maxDelayMs)
          nextPollAt.value = new Date(Date.now() + delay).toISOString()
          const wait = await waitWithVisibilityPause(delay, stillMine, (paused) => {
            pausedByVisibility.value = paused
          })
          if (wait === 'aborted') {
            return { outcome: 'ABORTED', task: null }
          }
          continue
        }

        if (!stillMine()) {
          return { outcome: 'ABORTED', task: null }
        }

        lastSyncedAt.value = nowIso()
        lastError.value = null

        if (task.status === AiTaskStatusCode.COMPLETED) {
          return { outcome: AiTaskStatusCode.COMPLETED, task }
        }
        if (
          task.status === AiTaskStatusCode.FAILED
          || task.status === AiTaskStatusCode.CANCELLED
        ) {
          return { outcome: task.status, task }
        }

        const delay = nextBackoffMs(attempt, initialDelayMs, maxDelayMs)
        nextPollAt.value = new Date(Date.now() + delay).toISOString()
        const wait = await waitWithVisibilityPause(delay, stillMine, (paused) => {
          pausedByVisibility.value = paused
        })
        if (wait === 'aborted') {
          return { outcome: 'ABORTED', task: null }
        }
      }

      if (!stillMine()) {
        return { outcome: 'ABORTED', task: null }
      }
      timedOutTaskId.value = taskId
      lastError.value = '任务仍在后台执行，可从任务中心查看或继续同步'
      return { outcome: 'TIMEOUT', task: null }
    } finally {
      if (generation === ownerGeneration) {
        polling.value = false
        nextPollAt.value = null
        pausedByVisibility.value = false
        if (timedOutTaskId.value !== taskId) {
          activeTaskId.value = null
        }
      }
    }
  }

  onBeforeUnmount(() => {
    invalidateOwner()
  })

  return {
    polling,
    activeTaskId,
    lastSyncedAt,
    nextPollAt,
    lastError,
    timedOutTaskId,
    pausedByVisibility,
    pollStatusDescription,
    pollUntilSettled,
    invalidateOwner,
  }
}
