import type { MarkingTaskResponse } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import {
  formatMarkingWithdrawWindowLabel,
  MARKING_RECENT_SUBMIT_MAX,
  resolveMarkingWithdrawWindowMs,
  withdrawMarkingTask,
} from '@/apis/mark/marking-withdraw'
import { showUserError } from '@/utils/error-handler'
import {
  isWithdrawScoreConfirmLockConflict,
} from '@/utils/marking-workflow-conflict'

const WITHDRAW_LOCK_RETRY_DELAYS_MS = [800, 1600, 2400] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 最近提交记录，供快捷撤销与工具栏列表使用 */
export interface MarkingRecentSubmitEntry {
  taskId: string
  examId: string
  groupId: string | null
  score: number
  submittedAt: number
  withdrawWindowMinutes: number
  withdrawDeadline: number
  batchIndex?: number
  batchTotal?: number
}

const recentSubmits = ref<MarkingRecentSubmitEntry[]>([])
/** 进行中的撤回 taskId，防止同一任务双点重复撤回 */
const withdrawingTaskIds = ref<Set<string>>(new Set())

function pruneExpired(): void {
  const now = Date.now()
  recentSubmits.value = recentSubmits.value.filter((entry) => entry.withdrawDeadline > now)
}

export function useMarkingRecentSubmit() {
  const latestWithdrawable = computed(() => {
    pruneExpired()
    return recentSubmits.value[0] ?? null
  })

  const recentList = computed(() => {
    pruneExpired()
    return recentSubmits.value.slice(0, MARKING_RECENT_SUBMIT_MAX)
  })

  function recordSubmit(payload: {
    taskId: string
    examId: string
    groupId: string | null
    score: number
    withdrawWindowMinutes: number
    submittedAt?: number
    batchIndex?: number
    batchTotal?: number
  }): void {
    pruneExpired()
    const submittedAt = payload.submittedAt ?? Date.now()
    const withdrawWindowMinutes = payload.withdrawWindowMinutes
    const entry: MarkingRecentSubmitEntry = {
      taskId: payload.taskId,
      examId: payload.examId,
      groupId: payload.groupId,
      score: payload.score,
      submittedAt,
      withdrawWindowMinutes,
      withdrawDeadline: submittedAt + resolveMarkingWithdrawWindowMs(withdrawWindowMinutes),
      batchIndex: payload.batchIndex,
      batchTotal: payload.batchTotal,
    }
    recentSubmits.value = [
      entry,
      ...recentSubmits.value.filter((item) => item.taskId !== payload.taskId),
    ].slice(0, MARKING_RECENT_SUBMIT_MAX)
  }

  function removeEntry(taskId: string): void {
    recentSubmits.value = recentSubmits.value.filter((item) => item.taskId !== taskId)
  }

  function canWithdrawEntry(entry: MarkingRecentSubmitEntry): boolean {
    return entry.withdrawDeadline > Date.now()
  }

  async function withdrawEntry(
    entry: MarkingRecentSubmitEntry,
    onSuccess?: (task: MarkingTaskResponse) => void,
  ): Promise<MarkingTaskResponse | null> {
    if (!canWithdrawEntry(entry)) {
      message.warning(`撤销窗口已过期（${formatMarkingWithdrawWindowLabel(entry.withdrawWindowMinutes)}）`)
      removeEntry(entry.taskId)
      return null
    }
    if (withdrawingTaskIds.value.has(entry.taskId)) {
      return null
    }
    withdrawingTaskIds.value = new Set(withdrawingTaskIds.value).add(entry.taskId)
    let lastError: unknown = null
    try {
      for (let attempt = 0; attempt <= WITHDRAW_LOCK_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const task = await withdrawMarkingTask({ taskId: entry.taskId })
          removeEntry(entry.taskId)
          message.success('已撤销提交，原给分已保留为草稿')
          onSuccess?.(task)
          return task
        } catch (error) {
          lastError = error
          const canRetry = isWithdrawScoreConfirmLockConflict(error)
            && attempt < WITHDRAW_LOCK_RETRY_DELAYS_MS.length
          if (!canRetry) {
            break
          }
          message.info('成绩确认处理中，正在重试撤回…')
          await sleep(WITHDRAW_LOCK_RETRY_DELAYS_MS[attempt])
        }
      }
      showUserError(lastError, '撤销提交失败')
      return null
    } finally {
      const next = new Set(withdrawingTaskIds.value)
      next.delete(entry.taskId)
      withdrawingTaskIds.value = next
    }
  }

  async function withdrawLatest(
    onSuccess?: (task: MarkingTaskResponse) => void,
  ): Promise<MarkingTaskResponse | null> {
    const entry = latestWithdrawable.value
    if (!entry) {
      message.warning('没有可撤销的最近提交')
      return null
    }
    return withdrawEntry(entry, onSuccess)
  }

  return {
    recentSubmits,
    latestWithdrawable,
    recentList,
    recordSubmit,
    removeEntry,
    canWithdrawEntry,
    withdrawEntry,
    withdrawLatest,
  }
}
