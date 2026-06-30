import type { ReviewTaskItemVO, ReviewTaskQueryRequest } from '@/apis/mark/exam-review-task'
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
  MarkingSessionPhaseCode,
  MarkingTaskClaimRequest,
  MarkingTaskQueryRequest,
  MarkingTaskVO,
  TeacherClaimContextQueryRequest,
  TeacherClaimContextVO,
} from '@/apis/mark/marking-organization'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listReviewTasks, validateReviewTaskItemContract } from '@/apis/mark/exam-review-task'
import {
  claimMarkingTasks,
  getTeacherClaimContext,
  listMarkingTasks,
  validateMarkingTaskContract,
  validateTeacherClaimContextContract,
} from '@/apis/mark/marking-organization'
import { readAllPages } from '@/utils/page-result'

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
  const REVIEW_TASKS_DEFAULT_PAGE_SIZE = 100
  const reviewTasksPagination = ref<{ pageNum: number, pageSize: number, total: number }>({
    pageNum: 1,
    pageSize: 0,
    total: 0,
  })

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

  const pendingReviewTasks = computed(() =>
    reviewTasks.value.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'),
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
      loaded.forEach(validateMarkingTaskContract)
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
    claimed.forEach(validateMarkingTaskContract)
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
      validateTeacherClaimContextContract(result)
      const next = new Map(claimContextByExam.value)
      next.set(claimContextKey(request.examId, request.markingPhase), result)
      claimContextByExam.value = next
      return result
    } finally {
      claimContextLoading.value = false
    }
  }

  function getClaimContext(examId: string, markingPhase: MarkingSessionPhaseCode): TeacherClaimContextVO | null {
    return claimContextByExam.value.get(claimContextKey(examId, markingPhase)) ?? null
  }

  async function loadReviewTasks(request: ReviewTaskQueryRequest): Promise<ReviewTaskItemVO[]> {
    reviewTasksLoading.value = true
    try {
      const pageSize = request.pageSize ?? REVIEW_TASKS_DEFAULT_PAGE_SIZE
      reviewTasks.value = await readAllPages(
        (pageNum) => listReviewTasks({
          ...request,
          pageNum,
          pageSize,
        }),
        '复核任务列表加载失败，请稍后重试',
      )
      reviewTasks.value.forEach(validateReviewTaskItemContract)
      reviewTasksPagination.value = {
        pageNum: 1,
        pageSize: reviewTasks.value.length,
        total: reviewTasks.value.length,
      }
      reviewLoadedExamId.value = request.examId
      return reviewTasks.value
    } finally {
      reviewTasksLoading.value = false
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
   * 用于 review-arbitration 等页面在切换 examId
   * 或考试选择器清空时，通过 action 替代组件侧直接改写 ref，
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
    clearTasks,
    clearReviewTasks,
    reset,
  }
})
