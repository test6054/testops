import type {
  MarkingSessionPhaseCode,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskVO,
  TeacherClaimContextQueryRequest,
  TeacherClaimContextVO,
} from '@/apis/mark/marking-organization'
/**
 * 阅卷任务 Store
 *
 * 业务边界：跨阅卷主链页面共享当前用户在指定考试下的阅卷任务。
 *
 * 后端契约：
 * - POST /api/mark/organization/task/list           — 阅卷任务列表
 * - POST /api/mark/organization/task/claim          — 教师领取任务
 * - POST /api/mark/organization/task/claim-context  — 教师领取上下文（活跃题组 + 当前正评会话）
 *
 * 复核任务（review-tasks）各页面筛选/合并逻辑不同，由页面本地 state + listReviewTasks 直连，
 * 不进入本 store，避免与 review-arbitration / review-workspace 等页内合同分叉。
 *
 * 数据范围：tasks 仅当前用户在 examId+sessionId+groupId 的任务（按业务页面参数加载）
 *
 * 不持久化：任务状态对实时性敏感，每次进入页面需重新拉取。
 */
import type { MarkingTaskStreamEventVO } from '@/apis/mark/marking-task-stream'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  claimMarkingTasks,
  getTeacherClaimContext,
  listMarkingTasks,
} from '@/apis/mark/marking-organization'
import { validateMarkingTaskStreamEvent } from '@/wire/mark/marking-task-stream-wire'

export const useMarkTaskStore = defineStore('markTask', () => {
  /** 当前用户在指定考试下的阅卷任务（按 examId 隔离） */
  const tasks = ref<MarkingTaskVO[]>([])
  const tasksLoading = ref(false)
  const tasksLoadedExamId = ref<string>('')

  /** 教师领取上下文：活跃题组 + 当前会话；按 examId + markingPhase 隔离 */
  const claimContextByExam = ref<Map<string, TeacherClaimContextVO>>(new Map())
  const claimContextLoading = ref(false)

  function claimContextKey(examId: string, markingPhase: MarkingSessionPhaseCode): string {
    return `${examId}:${markingPhase}`
  }

  /* ---------- Computed ---------- */

  const inProgressTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'IN_PROGRESS' || t.taskStatus === 'ALLOCATED'),
  )

  const submittedTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'SUBMITTED' || t.taskStatus === 'FINALIZED'),
  )

  /* ---------- Actions ---------- */

  async function loadTasks(
    request: MarkingTaskQueryRequest,
    options?: { silent?: boolean },
  ): Promise<MarkingTaskVO[]> {
    if (!options?.silent) {
      tasksLoading.value = true
    }
    try {
      const loaded = await listMarkingTasks(request)
      tasks.value = loaded
      tasksLoadedExamId.value = request.examId
      return tasks.value
    } finally {
      if (!options?.silent) {
        tasksLoading.value = false
      }
    }
  }

  async function claimTasks(request: MarkingTaskClaimRequest): Promise<MarkingTaskVO[]> {
    const claimed = await claimMarkingTasks(request)
    if (claimed.length > 0) {
      tasks.value = [...claimed, ...tasks.value]
    }
    return claimed
  }

  async function loadClaimContext(
    request: TeacherClaimContextQueryRequest,
  ): Promise<TeacherClaimContextVO> {
    claimContextLoading.value = true
    try {
      const result = await getTeacherClaimContext(request)
      const next = new Map(claimContextByExam.value)
      next.set(claimContextKey(request.examId, request.markingPhase), result)
      claimContextByExam.value = next
      return result
    } finally {
      claimContextLoading.value = false
    }
  }

  function getClaimContext(
    examId: string,
    markingPhase: MarkingSessionPhaseCode,
  ): TeacherClaimContextVO | null {
    return claimContextByExam.value.get(claimContextKey(examId, markingPhase)) ?? null
  }

  /**
   * 仅清空阅卷任务列表（不影响 claimContextByExam）。
   *
   * 用于「考试选择器切到空」等场景：页面通过 action 维持单向数据流，
   * 避免组件内部直接修改 storeToRefs 解开后的 ref（Pinia 反模式）。
   */
  function clearTasks(): void {
    tasks.value = []
    tasksLoadedExamId.value = ''
  }

  function reset(): void {
    tasks.value = []
    claimContextByExam.value = new Map()
    tasksLoadedExamId.value = ''
  }

  /**
   * 应用阅卷任务 SSE 事件；任务态变更须 reload，会话级事件由页面层处理。
   */
  function applyStreamEvent(event: MarkingTaskStreamEventVO): 'reload' | 'none' {
    validateMarkingTaskStreamEvent(event)
    switch (event.eventType) {
      case 'TASK_RECYCLED':
      case 'TASK_SUBMITTED':
      case 'TASK_WITHDRAWN':
      case 'TASK_ALLOCATED':
        return 'reload'
      case 'SESSION_PAUSED':
      case 'SESSION_RESUMED':
      case 'SESSION_PROGRESS':
        return 'none'
      default:
        return 'none'
    }
  }

  function upsertTask(task: MarkingTaskVO): void {
    const idx = tasks.value.findIndex((item) => item.id === task.id)
    if (idx >= 0) {
      tasks.value[idx] = task
      return
    }
    tasks.value = [task, ...tasks.value]
  }

  return {
    // state
    tasks,
    tasksLoading,
    tasksLoadedExamId,
    claimContextByExam,
    claimContextLoading,

    // computed
    inProgressTasks,
    submittedTasks,

    // actions
    loadTasks,
    claimTasks,
    loadClaimContext,
    getClaimContext,
    clearTasks,
    reset,
    applyStreamEvent,
    upsertTask,
  }
})
