import type {ReviewTaskItemVO, ReviewTaskQueryPayload} from '@/apis/mark/exam'
/**
 * 阅卷任务 Store
 *
 * 业务边界：跨阅卷主链页面共享当前用户在指定考试下的阅卷任务与复核任务。
 *
 * 后端契约：
 * - POST /api/mark/organization/task/list           — 阅卷任务列表
 * - POST /api/mark/organization/task/claim          — 教师领取任务
 * - POST /api/mark/organization/task/claim-context  — 教师领取上下文（活跃题组 + 当前正评会话）
 * - POST /api/mark/exams/review-tasks               — 匿名批阅 / 复核任务列表
 * - POST /api/mark/exams/review-tasks/claim         — 复核任务领取
 *
 * 数据范围：
 * - tasks 仅当前用户在 examId+sessionId+groupId 的任务（按业务页面参数加载）
 * - reviewTasks 仅当前用户的复核队列
 *
 * 不持久化：任务状态对实时性敏感，每次进入页面需重新拉取。
 */
import type {
  MarkingTaskClaimPayload,
  MarkingTaskQueryPayload,
  MarkingTaskVO,
  TeacherClaimContextQueryPayload,
  TeacherClaimContextVO,
} from '@/apis/mark/marking-organization'
import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {claimReviewTask, listReviewTasks} from '@/apis/mark/exam'
import {claimMarkingTasks, getTeacherClaimContext, listMarkingTasks,} from '@/apis/mark/marking-organization'

export const useMarkTaskStore = defineStore('markTask', () => {
  /** 当前用户在指定考试下的阅卷任务（按 examId 隔离） */
  const tasks = ref<MarkingTaskVO[]>([])
  const tasksLoading = ref(false)
  const tasksLoadedExamId = ref<string>('')

  /** 当前用户在指定考试下的复核任务（按 examId 隔离） */
  const reviewTasks = ref<ReviewTaskItemVO[]>([])
  const reviewTasksLoading = ref(false)
  const reviewLoadedExamId = ref<string>('')
  /**
   * 复核任务分页元数据。后端 QueryDto 要求 pageNum/pageSize 必填（@NotNull）。
   * store 内部为不显式传分页的调用方兜底默认值，避免页面崩；
   * pagination 暴露给消费侧用于检查截断或显示分页 UI。
   */
  const REVIEW_TASKS_DEFAULT_PAGE_SIZE = 200
  const reviewTasksPagination = ref<{ pageNum: number, pageSize: number; total: number }>({
    pageNum: 1,
    pageSize: 0,
    total: 0,
  })

  /** 教师领取上下文：活跃题组 + 当前正评会话；按 examId 隔离 */
  const claimContextByExam = ref<Map<string, TeacherClaimContextVO>>(new Map())
  const claimContextLoading = ref(false)

  /* ---------- Computed ---------- */

  const inProgressTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'IN_PROGRESS' || t.taskStatus === 'ALLOCATED'),
  )

  const submittedTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'SUBMITTED' || t.taskStatus === 'FINALIZED'),
  )

  const pendingReviewTasks = computed(() =>
    reviewTasks.value.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'),
  )

  /* ---------- Actions ---------- */

  async function loadTasks(payload: MarkingTaskQueryPayload): Promise<MarkingTaskVO[]> {
    tasksLoading.value = true
    try {
      tasks.value = await listMarkingTasks(payload)
      tasksLoadedExamId.value = payload.examId
      return tasks.value
    } finally {
      tasksLoading.value = false
    }
  }

  async function claimTasks(payload: MarkingTaskClaimPayload): Promise<MarkingTaskVO[]> {
    const claimed = await claimMarkingTasks(payload)
    if (claimed.length > 0) {
      tasks.value = [...claimed, ...tasks.value]
    }
    return claimed
  }

  async function loadClaimContext(
    payload: TeacherClaimContextQueryPayload,
  ): Promise<TeacherClaimContextVO> {
    claimContextLoading.value = true
    try {
      const result = await getTeacherClaimContext(payload)
      const next = new Map(claimContextByExam.value)
      next.set(payload.examId, result)
      claimContextByExam.value = next
      return result
    } finally {
      claimContextLoading.value = false
    }
  }

  function getClaimContext(examId: string): TeacherClaimContextVO | null {
    return claimContextByExam.value.get(examId) ?? null
  }

  async function loadReviewTasks(payload: ReviewTaskQueryPayload): Promise<ReviewTaskItemVO[]> {
    reviewTasksLoading.value = true
    try {
      // 后端 QueryDto pageNum/pageSize @NotNull，调用方未传时由 store 兜底，避免 400。
      const result = await listReviewTasks({
        ...payload,
        pageNum: payload.pageNum ?? 1,
        pageSize: payload.pageSize ?? REVIEW_TASKS_DEFAULT_PAGE_SIZE,
      })
      reviewTasks.value = result.list
      reviewTasksPagination.value = {
        pageNum: result.pageNum,
        pageSize: result.pageSize,
        total: result.total,
      }
      reviewLoadedExamId.value = payload.examId
      // 截断告警：当前实现仅取首页，单页 pageSize 默认 200 已足够大多数业务场景。
      // 若 total > list.length，提示页面接入显式分页或加大 pageSize。
      if (result.total > result.list.length) {
        console.warn('[markTask] reviewTasks 被分页截断', {
          total: result.total,
          returned: result.list.length,
          pageSize: result.pageSize,
        })
      }
      return reviewTasks.value
    } finally {
      reviewTasksLoading.value = false
    }
  }

  async function claimReviewTaskAction(examId: string, reviewTaskId: string): Promise<void> {
    await claimReviewTask({ examId, reviewTaskId })
    // 刷新当前考试的复核任务列表，保证状态推进
    if (reviewLoadedExamId.value === examId) {
      await loadReviewTasks({ examId })
    }
  }

  /**
   * 仅清空阅卷任务列表（不影响 reviewTasks / claimContextByExam）。
   *
   * 用于「考试选择器切到空」等场景：页面通过 action 维持单向数据流，
   * 避免组件内部直接修改 storeToRefs 解开后的 ref（Pinia 反模式）。
   */
  function clearTasks(): void {
    tasks.value = []
    tasksLoadedExamId.value = ''
  }

  /**
   * 仅清空复核任务列表（不影响 tasks / claimContextByExam）。
   *
   * 用于 review-assignment / review-arbitration 等页面在切换 examId
   * 或考试选择器清空时，通过 action 替代直接 `tasks.value = []`，
   * 维持 Pinia 单向数据流。
   */
  function clearReviewTasks(): void {
    reviewTasks.value = []
    reviewLoadedExamId.value = ''
    reviewTasksPagination.value = { pageNum: 1, pageSize: 0, total: 0 }
  }

  function reset(): void {
    tasks.value = []
    reviewTasks.value = []
    claimContextByExam.value = new Map()
    tasksLoadedExamId.value = ''
    reviewLoadedExamId.value = ''
    reviewTasksPagination.value = { pageNum: 1, pageSize: 0, total: 0 }
  }

  return {
    // state
    tasks,
    tasksLoading,
    tasksLoadedExamId,
    reviewTasks,
    reviewTasksLoading,
    reviewTasksPagination,
    reviewLoadedExamId,
    claimContextByExam,
    claimContextLoading,

    // computed
    inProgressTasks,
    submittedTasks,
    pendingReviewTasks,

    // actions
    loadTasks,
    claimTasks,
    loadClaimContext,
    getClaimContext,
    loadReviewTasks,
    claimReviewTaskAction,
    clearTasks,
    clearReviewTasks,
    reset,
  }
})
