import type { Ref } from 'vue'
import type { MarkingTaskResponse } from '@/apis/mark/marking-organization'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { MarkingTaskStatusCode } from '@/types/enums/marking-task-status-enum'
import { showUserError } from '@/utils/error-handler'

/** 本批任务进度：位置 + 已完成/剩余（Trust 层进度感知）。 */
export interface BatchProgress {
  /** 当前任务在本批列表中的 1-based 位次 */
  current: number
  /** 本批任务总量 */
  total: number
  /** 已提交/定稿份数 */
  completed: number
  /** 已分配/批改中份数（待继续） */
  remaining: number
  /** 已完成占比 0-100 */
  percent: number
}

export interface UseMarkingTaskNavigationOptions {
  task: Ref<MarkingTaskResponse | null>
  isWholePaperTask: Ref<boolean>
}

function isUnreadTaskStatus(status: MarkingTaskResponse['taskStatus']): boolean {
  return (
    status === MarkingTaskStatusCode.ALLOCATED
    || status === MarkingTaskStatusCode.IN_PROGRESS
  )
}

function isCompletedTaskStatus(status: MarkingTaskResponse['taskStatus']): boolean {
  return (
    status === MarkingTaskStatusCode.SUBMITTED
    || status === MarkingTaskStatusCode.FINALIZED
  )
}

export function useMarkingTaskNavigation(options: UseMarkingTaskNavigationOptions) {
  const route = useRoute()
  const router = useRouter()
  const markTaskStore = useMarkTaskStore()
  const { tasks: batchTasks } = storeToRefs(markTaskStore)

  const navPrevLabel = computed(() => (options.isWholePaperTask.value ? '上一份' : '上一题'))

  const batchProgress = computed<BatchProgress | null>(() => {
    if (!options.task.value || batchTasks.value.length === 0) {
      return null
    }
    const idx = batchTasks.value.findIndex((item) => item.id === options.task.value!.id)
    if (idx < 0) {
      return null
    }
    let completed = 0
    let remaining = 0
    for (const item of batchTasks.value) {
      if (isCompletedTaskStatus(item.taskStatus)) {
        completed += 1
      } else if (isUnreadTaskStatus(item.taskStatus)) {
        remaining += 1
      }
    }
    const total = batchTasks.value.length
    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0
    return {
      current: idx + 1,
      total,
      completed,
      remaining,
      percent,
    }
  })

  const prevTaskId = computed<string>(() => {
    if (!batchProgress.value) return ''
    const idx = batchProgress.value.current - 1
    return idx > 0 ? batchTasks.value[idx - 1].id : ''
  })

  /** 列表序上下一份（浏览用） */
  const nextTaskId = computed<string>(() => {
    if (!batchProgress.value) return ''
    const idx = batchProgress.value.current - 1
    return idx < batchTasks.value.length - 1 ? batchTasks.value[idx + 1].id : ''
  })

  /**
   * 下一未阅：优先当前之后的 ALLOCATED/IN_PROGRESS，再回绕到当前之前。
   * 提交后主去向；禁跳已提交/定稿/回收。
   */
  const nextUnreadTaskId = computed<string>(() => {
    if (!options.task.value || batchTasks.value.length === 0) return ''
    const currentId = options.task.value.id
    const idx = batchTasks.value.findIndex((item) => item.id === currentId)
    if (idx < 0) return ''
    for (let i = idx + 1; i < batchTasks.value.length; i += 1) {
      if (isUnreadTaskStatus(batchTasks.value[i].taskStatus)) {
        return batchTasks.value[i].id
      }
    }
    for (let i = 0; i < idx; i += 1) {
      if (isUnreadTaskStatus(batchTasks.value[i].taskStatus)) {
        return batchTasks.value[i].id
      }
    }
    return ''
  })

  /** 导航/提交默认去向：未阅优先，否则列表下一份 */
  const nextNavTaskId = computed<string>(() => nextUnreadTaskId.value || nextTaskId.value)

  const navNextLabel = computed(() => {
    if (nextUnreadTaskId.value) {
      return options.isWholePaperTask.value ? '下一未阅份' : '下一未阅'
    }
    return options.isWholePaperTask.value ? '下一份' : '下一题'
  })

  async function ensureBatchLoaded(examId: string): Promise<void> {
    if (!examId) return
    if (markTaskStore.tasksLoadedExamId === examId && batchTasks.value.length > 0) return
    try {
      await markTaskStore.loadTasks({ examId })
    } catch (error) {
      showUserError(error, '上下题导航任务列表加载失败')
    }
  }

  function retryBatchLoad(): void {
    const examId = options.task.value?.examId
    if (!examId) return
    void ensureBatchLoaded(examId)
  }

  function goToTask(targetTaskId: string): void {
    if (!targetTaskId) return
    const examId = String(route.params.examId || options.task.value?.examId || '')
    if (!examId) return
    void router.push({
      name: 'TeacherExamWorkspaceMarkingTaskDetail',
      params: { examId, taskId: targetTaskId },
    })
  }

  function goBackToTaskPool(): void {
    if (options.task.value?.examId) {
      void router.push({
        name: 'TeacherExamWorkspaceMarkingTaskPool',
        params: { examId: options.task.value.examId },
      })
    } else {
      void router.push({ name: 'TeacherExamList' })
    }
  }

  return {
    batchProgress,
    prevTaskId,
    nextTaskId,
    nextUnreadTaskId,
    nextNavTaskId,
    navPrevLabel,
    navNextLabel,
    ensureBatchLoaded,
    retryBatchLoad,
    goToTask,
    goBackToTaskPool,
  }
}
