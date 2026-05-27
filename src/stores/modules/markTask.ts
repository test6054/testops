import type { ReviewTaskItemVO, ReviewTaskQueryPayload } from '@/apis/mark/exam'
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
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { claimReviewTask, listReviewTasks } from '@/apis/mark/exam'
import {
  claimMarkingTasks,
  getTeacherClaimContext,
  listMarkingTasks,
} from '@/apis/mark/marking-organization'

export const useMarkTaskStore = defineStore('markTask', () => {
  /** 当前用户在指定考试下的阅卷任务（按 examId 隔离） */
  const tasks = ref<MarkingTaskVO[]>([])
  const tasksLoading = ref(false)
  const tasksLoadedExamId = ref<string>('')

  /** 当前用户在指定考试下的复核任务（按 examId 隔离） */
  const reviewTasks = ref<ReviewTaskItemVO[]>([])
  const reviewTasksLoading = ref(false)
  const reviewLoadedExamId = ref<string>('')

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
      const result = await listMarkingTasks(payload)
      tasks.value = result
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
      const result = await listReviewTasks(payload)
      reviewTasks.value = result
      reviewLoadedExamId.value = payload.examId
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

  function reset(): void {
    tasks.value = []
    reviewTasks.value = []
    claimContextByExam.value = new Map()
    tasksLoadedExamId.value = ''
    reviewLoadedExamId.value = ''
  }

  return {
    // state
    tasks,
    tasksLoading,
    tasksLoadedExamId,
    reviewTasks,
    reviewTasksLoading,
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
    reset,
  }
})
