import type {ExportJobQueryRequest, ExportJobStatusVO} from '@/apis/edu/export'
import {defineStore} from 'pinia'
import {computed, ref, watch} from 'vue'
import {deleteExportJob, queryExportJobs} from '@/apis/edu/export'

/**
 * 导出任务中心 Store
 * 统一管理导出任务状态以及可见性（自动轮询模式）
 */
export const useExportTaskStore = defineStore('export-task', () => {
  const tasks = ref<ExportJobStatusVO[]>([])
  const loading = ref(false)
  const visible = ref(false)
  const lastFetchParams = ref<ExportJobQueryRequest>({pageNum: 1, pageSize: 20})
  const pagination = ref<{ total: number, pages: number }>({total: 0, pages: 0})

  // 轮询定时器ID
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  // 轮询间隔（毫秒）
  const POLLING_INTERVAL = 3000

  const runningCount = computed(
    () => tasks.value.filter(task => task.status === 'PENDING' || task.status === 'PROCESSING').length,
  )

  // 监听进行中任务数量和抽屉可见性，自动控制轮询
  watch(
    [runningCount, visible],
    ([count, isVisible]) => {
      if (isVisible && count > 0) {
        startPolling()
      } else {
        stopPolling()
      }
    },
    {immediate: true},
  )

  // 启动轮询
  function startPolling() {
    if (pollingTimer) return // 已在轮询中
    pollingTimer = setInterval(async () => {
      // 静默刷新，不显示loading
      try {
        const result = await queryExportJobs(lastFetchParams.value)
        tasks.value = result.list
        pagination.value = {total: result.total, pages: result.pages}
      } catch {
      }
    }, POLLING_INTERVAL)
  }

  // 停止轮询
  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  async function fetchTasks(params?: Partial<ExportJobQueryRequest>) {
    loading.value = true
    try {
      const query: ExportJobQueryRequest = {
        ...lastFetchParams.value,
        ...(params || {}),
      }
      lastFetchParams.value = query
      const result = await queryExportJobs(query)
      tasks.value = result.list
      pagination.value = {total: result.total, pages: result.pages}
    } finally {
      loading.value = false
    }
  }

  function openCenter(params?: Partial<ExportJobQueryRequest>) {
    if (params) {
      updateFilter(params)
    }
    visible.value = true
    void fetchTasks(lastFetchParams.value)
  }

  function closeCenter() {
    visible.value = false
    stopPolling()
  }

  function updateFilter(params: Partial<ExportJobQueryRequest>) {
    lastFetchParams.value = {
      ...lastFetchParams.value,
      ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null)),
    }
  }

  async function deleteTask(jobId: string): Promise<void> {
    await deleteExportJob(jobId)
    await fetchTasks()
  }

  return {
    tasks,
    loading,
    visible,
    runningCount,
    pagination,
    fetchTasks,
    openCenter,
    closeCenter,
    lastFetchParams,
    updateFilter,
    deleteTask,
    stopPolling,
  }
})
