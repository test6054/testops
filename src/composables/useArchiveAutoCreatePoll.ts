import type { Ref } from 'vue'
import { onUnmounted, ref } from 'vue'
import type { ArchiveVolumeExamGateVO } from '@/apis/mark/archive-volume'
import { getArchiveVolumeExamGate } from '@/apis/mark/archive-volume'
import {
  CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES,
  isArchiveAutoCreateFailureCategory,
} from '@/constants/archive-auto-create-failure-category'

export type ArchiveAutoCreatePollResult = 'healthy' | 'failed' | 'timeout'

export interface ArchiveAutoCreatePollOptions {
  examId: Ref<string>
  timeoutMs?: number
  initialIntervalMs?: number
  maxIntervalMs?: number
}

function isPollFailed(gate: ArchiveVolumeExamGateVO): boolean {
  if (gate.autoCreateFullyHealthy === true) {
    return false
  }
  if (
    gate.autoCreateFailureStubPresent === true &&
    gate.autoCreatePendingStatus === 'MANUAL_REQUIRED'
  ) {
    return true
  }
  const category = gate.autoCreateFailureCategory
  if (category && isArchiveAutoCreateFailureCategory(category)) {
    return CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES.has(category)
  }
  return false
}

function isPollSucceeded(gate: ArchiveVolumeExamGateVO): boolean {
  return gate.autoCreateFullyHealthy === true
}

export function useArchiveAutoCreatePoll(options: ArchiveAutoCreatePollOptions) {
  const polling = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollGeneration = 0

  function stopPoll() {
    pollGeneration += 1
    if (pollTimer != null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    polling.value = false
  }

  async function pollOnce(): Promise<ArchiveVolumeExamGateVO> {
    return getArchiveVolumeExamGate(options.examId.value)
  }

  function pollUntilHealthy(): Promise<ArchiveAutoCreatePollResult> {
    stopPoll()
    const generation = pollGeneration
    const timeoutMs = options.timeoutMs ?? 90_000
    const initialIntervalMs = options.initialIntervalMs ?? 1_000
    const maxIntervalMs = options.maxIntervalMs ?? 8_000
    const startedAt = Date.now()
    let intervalMs = initialIntervalMs
    polling.value = true

    return new Promise((resolve) => {
      const scheduleNext = () => {
        if (generation !== pollGeneration) {
          return
        }
        pollTimer = setTimeout(() => {
          void (async () => {
            if (generation !== pollGeneration) {
              return
            }
            if (!options.examId.value) {
              stopPoll()
              resolve('failed')
              return
            }
            try {
              const gate = await pollOnce()
              if (isPollSucceeded(gate)) {
                stopPoll()
                resolve('healthy')
                return
              }
              if (isPollFailed(gate)) {
                stopPoll()
                resolve('failed')
                return
              }
            } catch {
              // 网络抖动继续轮询直至超时
            }
            if (Date.now() - startedAt >= timeoutMs) {
              stopPoll()
              resolve('timeout')
              return
            }
            intervalMs = Math.min(intervalMs * 2, maxIntervalMs)
            scheduleNext()
          })()
        }, intervalMs)
      }
      scheduleNext()
    })
  }

  onUnmounted(() => {
    stopPoll()
  })

  return {
    polling,
    pollUntilHealthy,
    stopPoll,
  }
}
