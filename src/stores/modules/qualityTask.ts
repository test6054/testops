/**
 * 质量评价任务汇总 Store
 *
 * 业务边界：跨质量评价页面共享"在飞 / 待关注"任务的运行态汇总：
 * - 在飞 AI 任务（PENDING / PROCESSING）
 * - 在导出报告（PENDING / PROCESSING）
 * - 未关闭的改进任务（OPEN / IN_PROGRESS / SUBMITTED / REVIEWED）
 *
 * 用途：
 * - dashboard 页面 / 顶部 SignalBand 直接展示"待关注任务数"
 * - 业务页面提交 AI 任务 / 导出报告 / 创建改进任务后，统一通过本 Store 刷新汇总
 *
 * 后端契约：
 * - POST /api/quality/ai/tasks/page                    — AI 任务分页
 * - POST /api/quality/reports/page                     — 报告分页（含 exportStatus）
 * - POST /api/quality/improvement-tasks/page           — 改进任务分页
 *
 * 数据范围：每次 poll* 只拉前 N 条在飞任务，不取全量；列表用业务页面自身的分页。
 *
 * 不持久化：在飞状态完全后端持有。
 */
import type { AiTaskVO } from '@/apis/quality/ai-task'
import type { ImprovementTaskVO } from '@/apis/quality/improvement-task'
import type { ReportVO } from '@/apis/quality/report'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiTaskApi } from '@/apis/quality/ai-task'
import { improvementTaskApi } from '@/apis/quality/improvement-task'
import { reportApi } from '@/apis/quality/report'
import { AiTaskStatusCode } from '@/apis/quality/types'

const DEFAULT_TOP_N = 50

export interface QualityTaskScopeFilter {
  /** 专业大类 ID（用于隔离当前用户视角） */
  programId?: string
  /** 培养方案 ID */
  trainingPlanId?: string
  /** 质量评价课程 ID */
  qualityCourseId?: string
  /** 拉取条数上限，默认 50 */
  topN?: number
}

export const useQualityTaskStore = defineStore('qualityTask', () => {
  /** 在飞 AI 任务（PENDING / PROCESSING） */
  const aiTasksInFlight = ref<AiTaskVO[]>([])
  const aiTasksLoading = ref(false)

  /** 在导出报告（exportStatus = PENDING / PROCESSING） */
  const reportExportsInFlight = ref<ReportVO[]>([])
  const reportExportsLoading = ref(false)

  /** 未关闭的改进任务（status != CLOSED） */
  const improvementTasksOpen = ref<ImprovementTaskVO[]>([])
  const improvementTasksLoading = ref(false)

  const lastFetchedAt = ref<number>(0)

  /* ---------- Computed ---------- */

  const aiTasksProcessing = computed(() =>
    aiTasksInFlight.value.filter(t => t.status === AiTaskStatusCode.PROCESSING),
  )

  const aiTasksPending = computed(() =>
    aiTasksInFlight.value.filter(t => t.status === AiTaskStatusCode.PENDING),
  )

  const reportExportsFailed = computed(() =>
    reportExportsInFlight.value.filter((r) => r.exportStatus === 'FAILED'),
  )

  const totalAttentionCount = computed(() =>
    aiTasksInFlight.value.length
    + reportExportsInFlight.value.length
    + reportExportsFailed.value.length
    + improvementTasksOpen.value.filter((t) => t.status === 'SUBMITTED' || t.status === 'REVIEWED').length,
  )

  /* ---------- Actions ---------- */

  /**
   * 拉取在飞 AI 任务（PENDING / PROCESSING 各前 topN/2）。
   * 后端 page 接口默认按 createTime DESC，前端只取需要展示的状态。
   */
  async function pollAiTasks(scope: QualityTaskScopeFilter = {}): Promise<AiTaskVO[]> {
    const topN = scope.topN ?? DEFAULT_TOP_N
    aiTasksLoading.value = true
    try {
      const [pendingPage, processingPage] = await Promise.all([
        aiTaskApi.page({ pageNum: 1, pageSize: topN, status: AiTaskStatusCode.PENDING }),
        aiTaskApi.page({ pageNum: 1, pageSize: topN, status: AiTaskStatusCode.PROCESSING }),
      ])
      aiTasksInFlight.value = [
        ...processingPage.list,
        ...pendingPage.list,
      ]
      return aiTasksInFlight.value
    }
    finally {
      aiTasksLoading.value = false
    }
  }

  /**
   * 拉取在导出报告（exportStatus 为 PENDING / PROCESSING / FAILED）。
   * 后端 page 接口不直接接受 exportStatus 过滤；本 Store 拉前 200 条 SUBMITTED/CONFIRMED 状态后过滤。
   */
  async function pollReportExports(scope: QualityTaskScopeFilter = {}): Promise<ReportVO[]> {
    const topN = scope.topN ?? 200
    reportExportsLoading.value = true
    try {
      const result = await reportApi.page({
        pageNum: 1,
        pageSize: topN,
        programId: scope.programId,
        trainingPlanId: scope.trainingPlanId,
        qualityCourseId: scope.qualityCourseId,
        includeAchievementDisplay: false,
      })
      const list = result.list
      reportExportsInFlight.value = list.filter(
        (r) => r.exportStatus === 'PENDING' || r.exportStatus === 'PROCESSING' || r.exportStatus === 'FAILED',
      )
      return reportExportsInFlight.value
    }
    finally {
      reportExportsLoading.value = false
    }
  }

  /**
   * 拉取未关闭的改进任务（DRAFT / IN_PROGRESS / OWNER_VERIFY / COMMITTEE_REVIEW）。
   */
  async function pollImprovementTasks(scope: QualityTaskScopeFilter = {}): Promise<ImprovementTaskVO[]> {
    const topN = scope.topN ?? DEFAULT_TOP_N
    improvementTasksLoading.value = true
    try {
      const result = await improvementTaskApi.page({
        pageNum: 1,
        pageSize: topN,
        programId: scope.programId,
        trainingPlanId: scope.trainingPlanId,
        qualityCourseId: scope.qualityCourseId,
      })
      const list = result.list
      improvementTasksOpen.value = list.filter((t) => t.status !== 'CLOSED')
      return improvementTasksOpen.value
    }
    finally {
      improvementTasksLoading.value = false
    }
  }

  /**
   * 一次性刷新全部三个汇总（业务页面顶层 onMounted 调用）。
   */
  async function refreshAll(scope: QualityTaskScopeFilter = {}): Promise<void> {
    try {
      await Promise.all([
        pollAiTasks(scope),
        pollReportExports(scope),
        pollImprovementTasks(scope),
      ])
      lastFetchedAt.value = Date.now()
    }
    catch {
      aiTasksInFlight.value = []
      reportExportsInFlight.value = []
      improvementTasksOpen.value = []
    }
  }

  function reset(): void {
    aiTasksInFlight.value = []
    reportExportsInFlight.value = []
    improvementTasksOpen.value = []
    lastFetchedAt.value = 0
  }

  return {
    // state
    aiTasksInFlight,
    aiTasksLoading,
    reportExportsInFlight,
    reportExportsLoading,
    improvementTasksOpen,
    improvementTasksLoading,
    lastFetchedAt,

    // computed
    aiTasksProcessing,
    aiTasksPending,
    reportExportsFailed,
    totalAttentionCount,

    // actions
    refreshAll,
    reset,
  }
})
