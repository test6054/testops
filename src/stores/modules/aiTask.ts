/**
 * AI 任务运维 Store
 *
 * 业务边界：
 * - 跨页面共享 AI 任务详情缓存（避免 ai-task / improvement-workbench / ai-mask-mapping 等重复请求同一 taskId）
 * - 提供轮询能力：业务页面提交任务后，可调用 startPolling(taskId) 让 Store 周期拉取任务详情，
 *   PENDING / PROCESSING 状态自动续期；COMPLETED / FAILED / CANCELLED 自动停止。
 *
 * 后端契约（edu-quality）：
 * - POST /api/quality/ai/tasks/detail   — AI 任务详情
 * - POST /api/quality/ai/tasks/cancel   — 取消任务
 * - POST /api/quality/ai/tasks/submit   — 提交任务（不在本 Store 内部触发，仅供业务页面调用）
 *
 * 不持久化：任务运行状态完全由后端持有，前端仅做"请求节流缓存 + 轮询协调"。
 *
 * 设计约束：
 * - Store 不维护"AI 任务列表"（列表用 useQualityTaskStore 拉），本 Store 只关心单条任务的运行态
 * - 同一 taskId 只能存在一个轮询计时器；重复 startPolling 会复用现有计时器
 * - 终态任务（COMPLETED / FAILED / CANCELLED）轮询自动 stop；调用方通过 watch(getTaskStatus(id)) 感知
 */
import type { AiTaskVO } from '@/apis/quality/ai-task'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { AiTaskStatusCode } from '@/apis/quality/types'

const TERMINAL_STATUSES: ReadonlySet<AiTaskStatusCode> = new Set<AiTaskStatusCode>([
  AiTaskStatusCode.COMPLETED,
  AiTaskStatusCode.FAILED,
  AiTaskStatusCode.CANCELLED,
])

const DEFAULT_POLL_INTERVAL_MS = 3000

interface PollingHandle {
  taskId: string
  intervalMs: number
  timer: ReturnType<typeof setInterval>
}

export const useAiTaskStore = defineStore('aiTask', () => {
  /** taskId → 最近一次拉取的 AI 任务详情 */
  const taskCache = ref<Map<string, AiTaskVO>>(new Map())

  /** 正在轮询的 taskId 集合（不存进 Map，避免响应式开销） */
  const pollingHandles = new Map<string, PollingHandle>()
  /** 暴露给 UI 的轮询中 ID 集合（响应式） */
  const pollingIds = ref<Set<string>>(new Set())

  const fetchingIds = ref<Set<string>>(new Set())

  /* ---------- Computed ---------- */

  const cachedTaskCount = computed(() => taskCache.value.size)
  const activePollingCount = computed(() => pollingIds.value.size)

  /* ---------- Helpers ---------- */

  function snapshotPolling(): void {
    pollingIds.value = new Set(pollingHandles.keys())
  }

  function isTerminal(status: AiTaskStatusCode): boolean {
    return TERMINAL_STATUSES.has(status)
  }

  /* ---------- Actions ---------- */

  /**
   * 主动获取任务详情；命中 fetchingIds 跳过避免重入。
   */
  async function fetchTask(taskId: string): Promise<AiTaskVO | null> {
    if (!taskId) return null
    if (fetchingIds.value.has(taskId)) {
      return taskCache.value.get(taskId) ?? null
    }
    fetchingIds.value = new Set([...fetchingIds.value, taskId])
    try {
      const detail = await aiTaskApi.detail(taskId)
      const next = new Map(taskCache.value)
      next.set(taskId, detail)
      taskCache.value = next
      return detail
    }
    finally {
      const updated = new Set(fetchingIds.value)
      updated.delete(taskId)
      fetchingIds.value = updated
    }
  }

  /** 取已缓存的任务（不发起请求） */
  function getCached(taskId: string): AiTaskVO | null {
    return taskCache.value.get(taskId) ?? null
  }

  /**
   * 启动轮询；若任务已是终态会立即 fetch 并停止。
   * tick 捕获异常，避免 setInterval 产生未处理 Promise。
   */
  function startPolling(taskId: string, intervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
    if (!taskId) return
    if (pollingHandles.has(taskId)) return

    const tick = async () => {
      try {
        const detail = await fetchTask(taskId)
        if (!detail) return
        if (isTerminal(detail.status)) {
          stopPolling(taskId)
        }
      } catch {
        // 详情轮询失败由调用方通过缓存未更新感知；禁止未处理 rejection
      }
    }

    const timer = setInterval(() => {
      void tick()
    }, intervalMs)
    pollingHandles.set(taskId, { taskId, intervalMs, timer })
    snapshotPolling()
    // 立即触发一次，避免等到第一个 tick 才感知
    void tick()
  }

  function stopPolling(taskId: string): void {
    const handle = pollingHandles.get(taskId)
    if (!handle) return
    clearInterval(handle.timer)
    pollingHandles.delete(taskId)
    snapshotPolling()
  }

  function stopAllPolling(): void {
    for (const handle of pollingHandles.values()) {
      clearInterval(handle.timer)
    }
    pollingHandles.clear()
    snapshotPolling()
  }

  /**
   * 取消任务；后端置为 CANCELLED，前端立即停止轮询并刷新缓存。
   */
  async function cancelTask(taskId: string, reason: string): Promise<void> {
    await aiTaskApi.cancel({ id: taskId, reason })
    stopPolling(taskId)
    await fetchTask(taskId)
  }

  function clearCache(): void {
    taskCache.value = new Map()
  }

  function reset(): void {
    stopAllPolling()
    taskCache.value = new Map()
    fetchingIds.value = new Set()
  }

  return {
    // state
    taskCache,
    pollingIds,
    fetchingIds,

    // computed
    cachedTaskCount,
    activePollingCount,

    // actions
    fetchTask,
    getCached,
    startPolling,
    stopPolling,
    stopAllPolling,
    cancelTask,
    clearCache,
    reset,
  }
})
