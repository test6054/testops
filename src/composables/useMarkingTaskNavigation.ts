import type { Ref } from 'vue'
import type { MarkingTaskVO } from '@/apis/mark/marking-organization'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { showUserError } from '@/utils/error-handler'

export interface BatchProgress {
  current: number
  total: number
}

export interface UseMarkingTaskNavigationOptions {
  task: Ref<MarkingTaskVO | null>
  isWholePaperTask: Ref<boolean>
}

export function useMarkingTaskNavigation(options: UseMarkingTaskNavigationOptions) {
  const route = useRoute()
  const router = useRouter()
  const markTaskStore = useMarkTaskStore()
  const { tasks: batchTasks } = storeToRefs(markTaskStore)

  const navPrevLabel = computed(() => (options.isWholePaperTask.value ? '上一份' : '上一题'))
  const navNextLabel = computed(() => (options.isWholePaperTask.value ? '下一份' : '下一题'))

  const batchProgress = computed<BatchProgress | null>(() => {
    if (!options.task.value || batchTasks.value.length === 0) return null
    const idx = batchTasks.value.findIndex((t) => t.id === options.task.value!.id)
    if (idx < 0) return null
    return { current: idx + 1, total: batchTasks.value.length }
  })

  const prevTaskId = computed<string>(() => {
    if (!batchProgress.value) return ''
    const idx = batchProgress.value.current - 1
    return idx > 0 ? batchTasks.value[idx - 1].id : ''
  })

  const nextTaskId = computed<string>(() => {
    if (!batchProgress.value) return ''
    const idx = batchProgress.value.current - 1
    return idx < batchTasks.value.length - 1 ? batchTasks.value[idx + 1].id : ''
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
    navPrevLabel,
    navNextLabel,
    ensureBatchLoaded,
    retryBatchLoad,
    goToTask,
    goBackToTaskPool,
  }
}
