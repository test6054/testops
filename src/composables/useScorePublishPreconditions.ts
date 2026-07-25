import type { Ref } from 'vue'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAbsenceExamStats } from '@/apis/mark/absence'
import { FinalScoreRiskReasonCode } from '@/apis/mark/exam-score'
import { showUserError } from '@/utils/error-handler'

/**
 * 与 BE FinalScoreRiskReviewServiceImpl#collectBlockingFinalScoreRiskReasonCodes 同源：
 * 仅 ABNORMAL_PAPER 等「软风险」可通过集中复核标记后放行单卷发布。
 * 下列原因不得靠标记已复核绕过（与 ensureFinalScoreSourceFactsReady / 缺考硬拦一致）。
 */
const FIELD_WIDE_HARD_BLOCK_REASON_CODES = new Set<FinalScoreRiskReasonCode>([
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
  FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE,
  FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE,
  FinalScoreRiskReasonCode.SAFE_CONFIRMABLE,
])

/**
 * 成绩确认/发布共用门禁：待确认缺考、缺考核对、全场 readyToPublish（仅批量发布）、
 * 场级阻塞事件/重复影像（与 BE ensureFinalScoreSourceFactsReady 同源），
 * 以及单卷发布前的软风险集中复核（与 ensureFinalScoreRiskReviewedBeforePublish 同源）。
 * 延迟自动确认 BLOCKED 只作工作台提示，不整场锁死单卷确认/发布（本卷手工确认会 complete 本卷任务）。
 */
export function useScorePublishPreconditions(options: {
  examId: Ref<string | undefined>
  riskOverview: Ref<FinalScoreRiskOverviewResponse | null>
  scorePanel: Ref<ExamWorkbenchScorePanelResponse | null>
}) {
  const router = useRouter()
  const pendingAbsenceCount = ref<number | null>(null)

  function goToAbsenceConfirm(): void {
    const examId = options.examId.value
    if (!examId) {
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceScoreAbsence',
      params: { examId },
    })
  }

  function goToScoreFinalizeRiskReview(): void {
    const examId = options.examId.value
    if (!examId) {
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceScoreSummary',
      params: { examId },
    })
  }

  async function refreshPendingAbsenceCount(): Promise<void> {
    if (!options.examId.value) {
      pendingAbsenceCount.value = null
      return
    }
    try {
      const stats = await getAbsenceExamStats({ examId: options.examId.value })
      pendingAbsenceCount.value = stats.pendingAbsenceCount
    }
    catch (error) {
      pendingAbsenceCount.value = null
      showUserError(error, '待确认缺考记录查询失败')
    }
  }

  /**
   * 缺考类场级硬门禁：待确认缺考 + 未完成缺考核对。
   */
  async function ensureAbsenceFieldWideGates(): Promise<boolean> {
    if (!options.examId.value) {
      return false
    }
    await refreshPendingAbsenceCount()
    if (pendingAbsenceCount.value === null) {
      void message.error('待确认缺考状态未知')
      return false
    }
    if (pendingAbsenceCount.value > 0) {
      void message.warning(
        `当前考试仍有 ${pendingAbsenceCount.value} 条待确认缺考记录，请先完成核对后再继续`,
      )
      goToAbsenceConfirm()
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能继续')
      return false
    }
    if (overview.unreconciledAbsenceCount > 0) {
      void message.warning(
        `仍有 ${overview.unreconciledAbsenceCount} 名应考学生未完成缺考核对，请先完成缺考 reconcile 后再继续`,
      )
      goToAbsenceConfirm()
      return false
    }
    return true
  }

  /**
   * MVR-204：与 BE ensureFinalScoreSourceFactsReady 同源的场级硬拦。
   * 阻塞事件 / 未处置重复影像会在确认与发布写路径被后端拒绝，FE 须先于点击拦截假可写。
   */
  function ensureFieldWideSourceFactGates(
    overview: FinalScoreRiskOverviewResponse,
    actionLabel: string,
  ): boolean {
    if ((overview.blockingIncidentCount ?? 0) > 0) {
      void message.warning(
        `考试仍有 ${overview.blockingIncidentCount} 项未解决阻塞事件，请先在审计/重大事件中处置后再${actionLabel}`,
      )
      return false
    }
    if ((overview.pendingDuplicateImageCount ?? 0) > 0) {
      void message.warning(
        `考试仍有 ${overview.pendingDuplicateImageCount} 项未处置重复影像，请先完成扫描影像处置后再${actionLabel}`,
      )
      return false
    }
    return true
  }

  /**
   * MVR-204：与 BE ensureFinalScoreRiskReviewedBeforePublish 同源。
   * 仅软风险（当前主要为 ABNORMAL_PAPER）须集中复核标记；硬原因不得靠标记绕过。
   */
  function ensureSoftRiskReviewedBeforePublish(overview: FinalScoreRiskOverviewResponse): boolean {
    const reviewed = new Set(overview.reviewedReasonCodes ?? [])
    const unreviewedSoftReasons = (overview.riskReasons ?? []).filter((reason) => {
      if (!reason.count || reason.count <= 0) {
        return false
      }
      if (FIELD_WIDE_HARD_BLOCK_REASON_CODES.has(reason.reasonCode)) {
        return false
      }
      return !reviewed.has(reason.reasonCode)
    })
    if (unreviewedSoftReasons.length === 0) {
      return true
    }
    const labels = unreviewedSoftReasons
      .map((reason) => reason.reasonName || reason.reasonCode)
      .join('、')
    void message.warning(`存在未复核的异常成绩风险（${labels}），请先在成绩确认页完成集中复核后再发布`)
    goToScoreFinalizeRiskReview()
    return false
  }

  /**
   * 单卷发布门禁：要求缺考与场级缺考核对已处置，场级阻塞事件/重复影像已清，
   * 软风险已集中复核；但不要求全场 readyToPublish，也不因他卷 delayed BLOCKED 整场拦截。
   */
  async function ensureSinglePaperPublishPreconditions(): Promise<boolean> {
    if (!(await ensureAbsenceFieldWideGates())) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能发布成绩')
      return false
    }
    if (!ensureFieldWideSourceFactGates(overview, '发布成绩')) {
      return false
    }
    return ensureSoftRiskReviewedBeforePublish(overview);
  }

  async function ensureScorePublishPreconditions(): Promise<boolean> {
    if (!(await ensureAbsenceFieldWideGates())) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能发布成绩')
      return false
    }
    if (!ensureFieldWideSourceFactGates(overview, '发布成绩')) {
      return false
    }
    if (!ensureSoftRiskReviewedBeforePublish(overview)) {
      return false
    }
    if (overview.readyToPublish !== true) {
      void message.warning('当前考试尚未满足发布前置条件，请先完成成绩确认或风险复核后再发布')
      return false
    }
    return true
  }

  async function ensureScoreConfirmPreconditions(): Promise<boolean> {
    if (!(await ensureAbsenceFieldWideGates())) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能确认成绩')
      return false
    }
    // 确认亦走 ensureFinalScoreSourceFactsReady：阻塞事件 / 重复影像场级硬拦
    return ensureFieldWideSourceFactGates(overview, '确认成绩');
  }

  /**
   * MVR-207：行内确认/发布按钮假可写对齐 BE 场级硬拦。
   * 覆盖 ensureNoPendingAbsenceRecords、ensureAbsenceReconciliationComplete，
   * 以及 ensureFinalScoreSourceFactsReady 中的阻塞事件/重复影像；不含软风险与单卷题分态。
   */
  const hasFieldWideHardBlockForWrite = computed(() => {
    if ((pendingAbsenceCount.value ?? 0) > 0) {
      return true
    }
    const overview = options.riskOverview.value
    if (!overview) {
      return false
    }
    return (
      (overview.unreconciledAbsenceCount ?? 0) > 0
      || (overview.blockingIncidentCount ?? 0) > 0
      || (overview.pendingDuplicateImageCount ?? 0) > 0
    )
  })

  return {
    pendingAbsenceCount,
    refreshPendingAbsenceCount,
    hasFieldWideHardBlockForWrite,
    ensureScorePublishPreconditions,
    ensureSinglePaperPublishPreconditions,
    ensureScoreConfirmPreconditions,
    goToAbsenceConfirm,
  }
}
