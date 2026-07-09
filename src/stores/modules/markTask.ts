import type {
  MarkingSessionPhaseCode,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskResponse,
  TeacherClaimContextQueryRequest,
  TeacherClaimContextResponse
} from '@/apis/mark/marking-organization'
import {
  claimMarkingTasks,
  getTeacherClaimContext,
  MarkingTaskStatusCode,
  pageMarkingTasks
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
import type { PageResult } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { validateMarkingTaskStreamEvent } from '@/wire/mark/marking-task-stream-wire'

/** 任务详情上下题导航单页上限；超过须缩小筛选范围 */
const MARKING_TASK_NAV_PAGE_SIZE = 100

export const useMarkTaskStore = defineStore('markTask', () => {
  /** 当前用户在指定考试下的阅卷任务（按 examId 隔离） */
  const tasks = ref<MarkingTaskResponse[]>([])
  const tasksLoading = ref(false)
  const tasksLoadedExamId = ref<string>('')
  const tasksPageNum = ref(1)
  const tasksPageSize = ref(20)
  const tasksPageTotal = ref(0)

  /** 教师领取上下文：活跃题组 + 当前会话；按 examId + markingPhase 隔离 */
  const claimContextByExam = ref<Map<string, TeacherClaimContextResponse>>(new Map())
  const claimContextLoading = ref(false)

  function claimContextKey(examId: string, markingPhase: MarkingSessionPhaseCode): string {
    return `${examId}:${markingPhase}`
  }

  /* ---------- Computed ---------- */

  const inProgressTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === MarkingTaskStatusCode.IN_PROGRESS || t.taskStatus === MarkingTaskStatusCode.ALLOCATED),
  )

  const submittedTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === MarkingTaskStatusCode.SUBMITTED || t.taskStatus === MarkingTaskStatusCode.FINALIZED),
  )

  /* ---------- Actions ---------- */

  async function loadTasks(
    request: MarkingTaskQueryRequest,
    options?: { silent?: boolean },
  ): Promise<MarkingTaskResponse[]> {
    if (!options?.silent) {
      tasksLoading.value = true
    }
    try {
      const pageSize = request.pageSize ?? MARKING_TASK_NAV_PAGE_SIZE
      const page = await pageMarkingTasks({ ...request, pageNum: 1, pageSize })
      if (page.total > page.list.length) {
        throw new Error(
          `阅卷任务数量（${page.total}）超过导航单页上限（${pageSize}），请缩小考试或题组筛选范围`,
        )
      }
      tasks.value = page.list
      tasksLoadedExamId.value = request.examId
      tasksPageNum.value = page.pageNum
      tasksPageSize.value = page.pageSize
      tasksPageTotal.value = page.total
      return tasks.value
    } finally {
      if (!options?.silent) {
        tasksLoading.value = false
      }
    }
  }

  /**
   * 分页加载阅卷任务；供任务池等列表页 server 分页使用。
   */
  async function loadTasksPage(
    request: MarkingTaskQueryRequest,
    pageNum: number,
    pageSize: number,
    options?: { silent?: boolean },
  ): Promise<PageResult<MarkingTaskResponse>> {
    if (!options?.silent) {
      tasksLoading.value = true
    }
    try {
      const page = await pageMarkingTasks({ ...request, pageNum, pageSize })
      tasks.value = page.list
      tasksLoadedExamId.value = request.examId
      tasksPageNum.value = page.pageNum
      tasksPageSize.value = page.pageSize
      tasksPageTotal.value = page.total
      return page
    } finally {
      if (!options?.silent) {
        tasksLoading.value = false
      }
    }
  }

  async function claimTasks(request: MarkingTaskClaimRequest): Promise<MarkingTaskResponse[]> {
    const claimed = await claimMarkingTasks(request)
    if (claimed.length > 0) {
      tasks.value = [...claimed, ...tasks.value]
    }
    return claimed
  }

  async function loadClaimContext(
    request: TeacherClaimContextQueryRequest,
  ): Promise<TeacherClaimContextResponse> {
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
  ): TeacherClaimContextResponse | null {
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
    tasksPageTotal.value = 0
    tasksPageNum.value = 1
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

  function upsertTask(task: MarkingTaskResponse): void {
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
    tasksPageNum,
    tasksPageSize,
    tasksPageTotal,
    claimContextByExam,
    claimContextLoading,

    // computed
    inProgressTasks,
    submittedTasks,

    // actions
    loadTasks,
    loadTasksPage,
    claimTasks,
    loadClaimContext,
    getClaimContext,
    clearTasks,
    reset,
    applyStreamEvent,
    upsertTask,
  }
})
