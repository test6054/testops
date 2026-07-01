import type { Ref } from 'vue'
import type { MarkingTaskVO } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { validateMarkingTaskContract } from '@/apis/mark/marking-organization'
import {
  MARKING_RECENT_SUBMIT_MAX,
  MARKING_WITHDRAW_WINDOW_MS,
  withdrawMarkingTask,
} from '@/apis/mark/marking-withdraw'
import { showUserError } from '@/utils/error-handler'

/** 最近提交记录，供快捷撤销与工具栏列表使用 */
export interface MarkingRecentSubmitEntry {
  taskId: string
  examId: string
  groupId: string | null
  score: number
  submittedAt: number
  withdrawDeadline: number
  batchIndex?: number
  batchTotal?: number
}

const recentSubmits = ref<MarkingRecentSubmitEntry[]>([])

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
    submittedAt?: number
    batchIndex?: number
    batchTotal?: number
  }): void {
    pruneExpired()
    const submittedAt = payload.submittedAt ?? Date.now()
    const entry: MarkingRecentSubmitEntry = {
      taskId: payload.taskId,
      examId: payload.examId,
      groupId: payload.groupId,
      score: payload.score,
      submittedAt,
      withdrawDeadline: submittedAt + MARKING_WITHDRAW_WINDOW_MS,
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
    onSuccess?: (task: MarkingTaskVO) => void,
  ): Promise<MarkingTaskVO | null> {
    if (!canWithdrawEntry(entry)) {
      message.warning('撤销窗口已过期（提交后 10 分钟内有效）')
      removeEntry(entry.taskId)
      return null
    }
    try {
      const task = await withdrawMarkingTask({ taskId: entry.taskId })
      validateMarkingTaskContract(task)
      removeEntry(entry.taskId)
      message.success('已撤销提交，原给分已保留为草稿')
      onSuccess?.(task)
      return task
    }
    catch (error) {
      showUserError(error, '撤销提交失败')
      return null
    }
  }

  async function withdrawLatest(
    onSuccess?: (task: MarkingTaskVO) => void,
  ): Promise<MarkingTaskVO | null> {
    const entry = latestWithdrawable.value
    if (!entry) {
      message.warning('没有可撤销的最近提交')
      return null
    }
    return withdrawEntry(entry, onSuccess)
  }

  return {
    recentSubmits: recentSubmits as Ref<MarkingRecentSubmitEntry[]>,
    latestWithdrawable,
    recentList,
    recordSubmit,
    removeEntry,
    canWithdrawEntry,
    withdrawEntry,
    withdrawLatest,
  }
}
