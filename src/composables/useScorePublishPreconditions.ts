import type { Ref } from 'vue'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAbsenceExamStats } from '@/apis/mark/absence'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { showUserError } from '@/utils/error-handler'

/** 成绩确认/发布共用门禁：待确认缺考、缺考核对、风险阻塞、延迟自动确认 BLOCKED。 */
export function useScorePublishPreconditions(options: {
  examId: Ref<string | undefined>
  riskOverview: Ref<FinalScoreRiskOverviewResponse | null>
  scorePanel: Ref<ExamWorkbenchScorePanelResponse | null>
}) {
  const router = useRouter()
  const { goScoreConfirm } = useScoreReleaseNavigation()
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

  async function refreshPendingAbsenceCount(): Promise<void> {
    if (!options.examId.value) {
      pendingAbsenceCount.value = null
      return
    }
    try {
      const stats = await getAbsenceExamStats({ examId: options.examId.value })
      pendingAbsenceCount.value = stats.pendingAbsenceCount
    } catch (error) {
      pendingAbsenceCount.value = null
      showUserError(error, '待确认缺考记录查询失败')
    }
  }

  async function ensureScorePublishPreconditions(): Promise<boolean> {
    if (!options.examId.value) {
      return false
    }
    await refreshPendingAbsenceCount()
    if (pendingAbsenceCount.value === null) {
      message.error('待确认缺考状态未知')
      return false
    }
    if (pendingAbsenceCount.value > 0) {
      message.warning(
        `当前考试仍有 ${pendingAbsenceCount.value} 条待确认缺考记录，请先完成核对后再发布成绩`,
      )
      goToAbsenceConfirm()
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      message.error('成绩风险概览不可用，不能发布成绩')
      return false
    }
    if (overview.unreconciledAbsenceCount > 0) {
      message.warning(
        `仍有 ${overview.unreconciledAbsenceCount} 名应考学生未完成缺考核对，请先完成缺考 reconcile 后再发布`,
      )
      goToAbsenceConfirm()
      return false
    }
    if (!overview.readyToPublish) {
      message.warning('当前考试尚未满足发布前置条件，请先完成成绩确认或风险复核后再发布')
      return false
    }
    const panel = options.scorePanel.value
    if (
      panel
      && !panel.manualFinalScoreConfirmRequired
      && panel.blockedDelayedFinalScoreConfirmCount > 0
    ) {
      message.warning(
        `仍有 ${panel.blockedDelayedFinalScoreConfirmCount} 份答卷延迟自动确认失败，请先在成绩确认页逐份确认后再发布`,
      )
      goScoreConfirm()
      return false
    }
    return true
  }

  async function ensureScoreConfirmPreconditions(): Promise<boolean> {
    if (!options.examId.value) {
      return false
    }
    await refreshPendingAbsenceCount()
    if (pendingAbsenceCount.value === null) {
      message.error('待确认缺考状态未知')
      return false
    }
    if (pendingAbsenceCount.value > 0) {
      message.warning(
        `当前考试仍有 ${pendingAbsenceCount.value} 条待确认缺考记录，请先完成核对后再确认成绩`,
      )
      goToAbsenceConfirm()
      return false
    }
    const overview = options.riskOverview.value
    if (!overview) {
      message.error('成绩风险概览不可用，不能确认成绩')
      return false
    }
    if (overview.unreconciledAbsenceCount > 0) {
      message.warning(
        `仍有 ${overview.unreconciledAbsenceCount} 名应考学生未完成缺考核对，请先完成缺考 reconcile 后再确认`,
      )
      goToAbsenceConfirm()
      return false
    }
    const panel = options.scorePanel.value
    if (
      panel
      && !panel.manualFinalScoreConfirmRequired
      && panel.blockedDelayedFinalScoreConfirmCount > 0
    ) {
      message.warning(
        `仍有 ${panel.blockedDelayedFinalScoreConfirmCount} 份答卷延迟自动确认失败，请先在成绩确认页逐份确认后再批量确认`,
      )
      goScoreConfirm()
      return false
    }
    return true
  }

  return {
    pendingAbsenceCount,
    refreshPendingAbsenceCount,
    ensureScorePublishPreconditions,
    ensureScoreConfirmPreconditions,
    goToAbsenceConfirm,
  }
}
