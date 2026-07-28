import type { Ref } from 'vue'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import message from 'ant-design-vue/es/message'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FINAL_SCORE_NON_SOFT_REVIEWABLE_REASON_CODES } from '@/utils/final-score-risk-gates'

/**
 * 成绩确认 / 提交发布复核共用门禁。
 * 待确认缺考 / 场级硬拦唯一真源为 FinalScoreRiskOverviewResponse，禁止另拉 absence stats 双源。
 */
export function useScorePublishPreconditions(options: {
  examId: Ref<string | undefined>
  riskOverview: Ref<FinalScoreRiskOverviewResponse | null>
}) {
  const router = useRouter()

  /** 与 overview.pendingAbsenceCount 同源；概览未加载时为 null（未知） */
  const pendingAbsenceCount = computed(() => {
    const overview = options.riskOverview.value
    if (!overview) {
      return null
    }
    return overview.pendingAbsenceCount
  })

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

  /**
   * 缺考类场级硬门禁：待确认缺考 + 未完成缺考核对（均采信 riskOverview）。
   */
  function ensureAbsenceFieldWideGates(): boolean {
    if (!options.examId.value) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能继续')
      return false
    }
    if (overview.pendingAbsenceCount > 0) {
      void message.warning(
        `当前考试仍有 ${overview.pendingAbsenceCount} 条待确认缺考记录，请先完成核对后再继续`,
      )
      goToAbsenceConfirm()
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
   * 与 BE ensureFinalScoreSourceFactsReady 同源的场级硬拦。
   */
  function ensureFieldWideSourceFactGates(
    overview: FinalScoreRiskOverviewResponse,
    actionLabel: string,
  ): boolean {
    if (overview.blockingIncidentCount > 0) {
      void message.warning(
        `考试仍有 ${overview.blockingIncidentCount} 项未解决阻塞事件，请先在审计/重大事件中处置后再${actionLabel}`,
      )
      return false
    }
    if (overview.pendingDuplicateImageCount > 0) {
      void message.warning(
        `考试仍有 ${overview.pendingDuplicateImageCount} 项未处置重复影像，请先完成扫描影像处置后再${actionLabel}`,
      )
      return false
    }
    return true
  }

  /**
   * 与 BE ensureFinalScoreRiskReviewedBeforePublish 同源。
   */
  function ensureSoftRiskReviewedBeforePublish(overview: FinalScoreRiskOverviewResponse): boolean {
    const reviewed = new Set(overview.reviewedReasonCodes ?? [])
    const unreviewedSoftReasons = (overview.riskReasons ?? []).filter((reason) => {
      if (!reason.count || reason.count <= 0) {
        return false
      }
      if (FINAL_SCORE_NON_SOFT_REVIEWABLE_REASON_CODES.has(reason.reasonCode)) {
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
    void message.warning(`存在未复核的异常成绩风险（${labels}），请先在成绩确认页完成集中复核后再提交发布复核`)
    goToScoreFinalizeRiskReview()
    return false
  }

  /**
   * 单卷提交发布复核门禁：不要求全场 readyToSubmitPublishReview。
   */
  function ensureSinglePaperPublishPreconditions(): boolean {
    if (!ensureAbsenceFieldWideGates()) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能提交发布复核')
      return false
    }
    if (!ensureFieldWideSourceFactGates(overview, '提交发布复核')) {
      return false
    }
    return ensureSoftRiskReviewedBeforePublish(overview)
  }

  function ensureScorePublishPreconditions(): boolean {
    if (!ensureAbsenceFieldWideGates()) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能提交发布复核')
      return false
    }
    if (!ensureFieldWideSourceFactGates(overview, '提交发布复核')) {
      return false
    }
    if (!ensureSoftRiskReviewedBeforePublish(overview)) {
      return false
    }
    if (overview.readyToSubmitPublishReview !== true) {
      void message.warning('当前考试尚未满足提交发布复核的前置条件，请先完成成绩确认或风险复核后再提交')
      return false
    }
    return true
  }

  function ensureScoreConfirmPreconditions(): boolean {
    if (!ensureAbsenceFieldWideGates()) {
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      void message.error('成绩风险概览不可用，不能确认成绩')
      return false
    }
    return ensureFieldWideSourceFactGates(overview, '确认成绩')
  }

  /**
   * 行内确认/提交发布复核假可写对齐 BE 场级硬拦；真源仅 riskOverview。
   */
  const hasFieldWideHardBlockForWrite = computed(() => {
    const overview = options.riskOverview.value
    if (!overview) {
      return true
    }
    return (
      overview.pendingAbsenceCount > 0
      || overview.unreconciledAbsenceCount > 0
      || overview.blockingIncidentCount > 0
      || overview.pendingDuplicateImageCount > 0
    )
  })

  return {
    pendingAbsenceCount,
    hasFieldWideHardBlockForWrite,
    ensureScorePublishPreconditions,
    ensureSinglePaperPublishPreconditions,
    ensureScoreConfirmPreconditions,
    goToAbsenceConfirm,
  }
}
