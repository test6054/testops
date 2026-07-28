import type { ExamWorkbenchSummaryResponse } from '@/apis/mark/exam'
import { computed, onBeforeUnmount, ref } from 'vue'
import { closeExam, deleteExam, EXAM_BATCH_LIFECYCLE_MAX } from '@/apis/mark/exam'
import { getUserErrorMessage } from '@/utils/error-handler'

export type ExamBatchItemStatus = 'waiting' | 'running' | 'success' | 'failed' | 'skipped'
export type ExamBatchLifecycleAction = 'close' | 'delete'

export interface ExamBatchProgressItem {
  examId: string
  examName: string
  status: ExamBatchItemStatus
  message?: string
}

function buildBatchExamLabel(exam: ExamWorkbenchSummaryResponse): string {
  const name = exam.examName?.trim() || `考试 ${exam.examId}`
  const course = exam.courseName?.trim()
  return course ? `${name} · ${course}` : name
}

/**
 * 考试列表批量关闭/删除：前端逐场真实推进，提供进度、失败重试与跳过。
 * 不伪造进度条；每场结果以单场 API 响应为准。
 * 后端仍提供 batch-close/batch-delete 供非 UI 客户端；列表进度交互必须走单场串行。
 */
export function useExamListBatchLifecycle() {
  const open = ref(false)
  const running = ref(false)
  const action = ref<ExamBatchLifecycleAction>('close')
  const items = ref<ExamBatchProgressItem[]>([])
  const retryingExamId = ref<string | null>(null)
  let runToken = 0

  const actionLabel = computed(() => (action.value === 'close' ? '关闭' : '删除'))
  const title = computed(() => (action.value === 'close' ? '批量关闭考试' : '批量删除考试'))

  function updateItem(examId: string, patch: Partial<ExamBatchProgressItem>): void {
    const index = items.value.findIndex((row) => row.examId === examId)
    if (index < 0) {
      return
    }
    const current = items.value[index]
    items.value.splice(index, 1, { ...current, ...patch })
  }

  function reset(): void {
    runToken += 1
    open.value = false
    running.value = false
    items.value = []
    retryingExamId.value = null
  }

  function start(
    nextAction: ExamBatchLifecycleAction,
    targets: ExamWorkbenchSummaryResponse[],
  ): void {
    if (targets.length === 0) {
      return
    }
    if (targets.length > EXAM_BATCH_LIFECYCLE_MAX) {
      return
    }
    runToken += 1
    const token = runToken
    action.value = nextAction
    items.value = targets.map((exam) => ({
      examId: String(exam.examId),
      examName: buildBatchExamLabel(exam),
      status: 'waiting' as const,
    }))
    open.value = true
    void runQueue(token)
  }

  async function executeOne(examId: string): Promise<void> {
    if (action.value === 'close') {
      await closeExam({ examId })
      return
    }
    await deleteExam({ examId })
  }

  async function runQueue(token: number): Promise<void> {
    running.value = true
    try {
      const queue = items.value.map((item) => item.examId)
      for (const examId of queue) {
        if (token !== runToken) {
          return
        }
        const current = items.value.find((row) => row.examId === examId)
        if (!current || current.status !== 'waiting') {
          continue
        }
        updateItem(examId, { status: 'running', message: undefined })
        try {
          await executeOne(examId)
          if (token !== runToken) {
            return
          }
          updateItem(examId, { status: 'success', message: undefined })
        } catch (error) {
          if (token !== runToken) {
            return
          }
          updateItem(examId, {
            status: 'failed',
            message: getUserErrorMessage(error, `${actionLabel.value}失败`),
          })
        }
      }
    } finally {
      if (token === runToken) {
        running.value = false
      }
    }
  }

  async function retry(examId: string): Promise<void> {
    if (running.value || retryingExamId.value) {
      return
    }
    const item = items.value.find((row) => row.examId === examId)
    if (!item || item.status !== 'failed') {
      return
    }
    retryingExamId.value = examId
    updateItem(examId, { status: 'running', message: undefined })
    try {
      await executeOne(examId)
      updateItem(examId, { status: 'success', message: undefined })
    } catch (error) {
      updateItem(examId, {
        status: 'failed',
        message: getUserErrorMessage(error, `${actionLabel.value}失败`),
      })
    } finally {
      retryingExamId.value = null
    }
  }

  function skip(examId: string): void {
    if (running.value || retryingExamId.value) {
      return
    }
    const item = items.value.find((row) => row.examId === examId)
    if (!item || item.status !== 'failed') {
      return
    }
    updateItem(examId, { status: 'skipped', message: undefined })
  }

  function closeDialog(): void {
    if (running.value) {
      return
    }
    open.value = false
  }

  onBeforeUnmount(() => {
    runToken += 1
    running.value = false
    retryingExamId.value = null
  })

  return {
    open,
    running,
    action,
    actionLabel,
    title,
    items,
    retryingExamId,
    start,
    retry,
    skip,
    closeDialog,
    reset,
  }
}
