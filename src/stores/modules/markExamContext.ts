/**
 * 阅卷考试上下文 Store
 *
 * 业务边界：跨阅卷主链页面共享当前选中的考试，以及对应考试的概要 / 详情数据。
 *
 * 后端契约：
 * - POST /api/mark/exams/page                — 分页获取当前用户可见的考试列表
 * - POST /api/mark/exams/detail               — 获取单场考试详情（含 templateId / questionCount / answerCount / candidateCount / classIds）
 *
 * 与 useMarkExamSelector composable 的差异：
 * - composable 仅用于"页面级"考试选择器，每次调用产生独立实例 + 同步 URL
 * - 本 Store 是"全局"上下文，跨页面共享当前考试选择，配合 useMarkStageStore / useMarkTaskStore
 *   等阅卷主链 Store 协同；用于 marking-overview / scan-* / review-* / score-* / archive 等
 *   不需要页面级 URL 同步的跨页面场景。
 *
 * 持久化：仅保留 currentExamId，避免缓存陈旧 detail 与 list。
 */
import type { ExamDetailVO, ExamPageQueryRequest, ExamSummaryVO } from '@/apis/mark/exam'
import { getExamDetail, pageExams } from '@/apis/mark/exam'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { formatSemester } from '@/types/enums/semester-enum'

export const useMarkExamContextStore = defineStore(
  'markExamContext',
  () => {
    /** 当前选中的考试 ID（持久化） */
    const currentExamId = ref<string>('')

    /** 已加载的考试列表（仅内存） */
    const exams = ref<ExamSummaryVO[]>([])
    const examsLoading = ref(false)

    /** 当前考试详情缓存：examId → ExamDetailVO（仅内存） */
    const detailCache = ref<Map<string, ExamDetailVO>>(new Map())
    const detailLoading = ref(false)

    /* ---------- Computed ---------- */

    const currentExam = computed<ExamSummaryVO | null>(
      () => exams.value.find((e) => e.examId === currentExamId.value) ?? null,
    )

    const currentExamDetail = computed<ExamDetailVO | null>(
      () => detailCache.value.get(currentExamId.value) ?? null,
    )

    const examOptions = computed(() =>
      exams.value.map((e) => ({
        value: e.examId,
        label: [formatExamOptionLabel(e), formatAcademicTerm(e)].filter(Boolean).join(' · '),
      })),
    )

    const hasExamSelected = computed(() => !!currentExamId.value)

    /** 当前考试是否处于"准备就绪可批阅"状态 */
    const examReadyForMarking = computed(() => {
      const detail = currentExamDetail.value
      if (!detail) return false
      const hasTemplate = !!detail.templateId
      const hasCandidates = detail.candidateCount > 0 || detail.classIds.length > 0
      return hasTemplate && hasCandidates
    })

    /* ---------- Actions ---------- */

    /**
     * 加载当前用户可见的考试列表。默认拉取 ACTIVE 状态前 200 条。
     * 业务用 createUserId 过滤教师本人创建的考试；管理员场景需调用方在 request 中显式置空。
     */
    async function loadExams(request?: Partial<ExamPageQueryRequest>): Promise<void> {
      examsLoading.value = true
      try {
        const result = await pageExams({
          pageNum: request?.pageNum ?? 1,
          pageSize: request?.pageSize ?? 200,
          status: request?.status,
          keyword: request?.keyword,
          createUserId: request?.createUserId,
          startTime: request?.startTime,
          endTime: request?.endTime,
        })
        exams.value = result.list
      } finally {
        examsLoading.value = false
      }
    }

    /**
     * 切换当前考试。命中缓存的 detail 直接返回，否则按需 loadDetail。
     */
    async function setCurrentExam(
      examId: string,
      opts: { ensureDetail?: boolean } = {},
    ): Promise<void> {
      currentExamId.value = examId || ''
      if (!examId) return
      const stageStore = useMarkStageStore()
      stageStore.observeExam(examId)
      if (opts.ensureDetail && !detailCache.value.has(examId)) {
        await loadDetail(examId)
      } else if (detailCache.value.has(examId)) {
        const detail = detailCache.value.get(examId)
        if (detail) {
          stageStore.setSelectedExamMeta({
            examId: detail.examId,
            examName: detail.examName,
            examNo: detail.examNo,
          })
        }
      }
    }

    /**
     * 加载指定考试详情；强制刷新覆盖缓存。
     */
    async function loadDetail(examId: string): Promise<ExamDetailVO> {
      detailLoading.value = true
      try {
        const detail = await getExamDetail(examId)
        const next = new Map(detailCache.value)
        next.set(examId, detail)
        detailCache.value = next
        useMarkStageStore().setSelectedExamMeta({
          examId: detail.examId,
          examName: detail.examName,
          examNo: detail.examNo,
        })
        return detail
      } finally {
        detailLoading.value = false
      }
    }

    /** 强制刷新当前考试详情（业务页面变更后回调） */
    async function refreshCurrentDetail(): Promise<void> {
      if (!currentExamId.value) return
      await loadDetail(currentExamId.value)
    }

    /** 清空详情缓存（登出 / 切换租户时使用） */
    function clearDetailCache(): void {
      detailCache.value = new Map()
    }

    function reset(): void {
      currentExamId.value = ''
      exams.value = []
      detailCache.value = new Map()
      useMarkStageStore().reset()
    }

    function formatAcademicTerm(exam: ExamSummaryVO): string {
      return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
    }

    function formatExamOptionLabel(exam: ExamSummaryVO): string {
      return exam.examNo ? `${exam.examName}（${exam.examNo}）` : exam.examName
    }

    return {
      // state
      currentExamId,
      exams,
      examsLoading,
      detailCache,
      detailLoading,

      // computed
      currentExam,
      currentExamDetail,
      examOptions,
      hasExamSelected,
      examReadyForMarking,

      // actions
      loadExams,
      setCurrentExam,
      loadDetail,
      refreshCurrentDetail,
      clearDetailCache,
      reset,
    }
  },
  {
    persist: {
      pick: ['currentExamId'],
    },
  },
)
