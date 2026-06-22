import type { Router } from 'vue-router'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { resolveJourneyDefaultRoute } from '@/constants/exam-journey'
import { MARK_STAGE_DEFAULT_ROUTE } from '@/constants/mark-workspace-nav'
import { resolveScanStageEntryRoute } from '@/utils/resolve-scan-stage-entry'

export interface NavigateToMarkStageOptions {
  scanAttentionCount?: number
}

/**
 * 从 StageRail / 建议阶段横幅跳转到对应阶段默认子路由。
 * SCAN 阶段按 scanAttentionCount 分流：有异常 → 监控，否则 → 录入与批次。
 */
export function navigateToMarkStage(
  router: Router,
  stageKey: string,
  examId: string,
  options?: NavigateToMarkStageOptions,
): void {
  if (!examId) {
    return
  }
  if (stageKey === 'SCAN') {
    void router.push(resolveScanStageEntryRoute(examId, {
      scanAttentionCount: options?.scanAttentionCount,
    }))
    return
  }
  const routeName = MARK_STAGE_DEFAULT_ROUTE[stageKey as MarkStageKey]
  if (!routeName) {
    return
  }
  void router.push({
    name: routeName,
    params: { examId },
  })
}

/** 顶部六步旅程轨点击：进入旅程默认子路由；mark 默认进正评任务池 */
export function navigateToJourneyStep(
  router: Router,
  journeyKey: ExamJourneyKey,
  examId: string,
  options?: NavigateToMarkStageOptions,
): void {
  if (!examId) {
    return
  }
  void router.push(resolveJourneyDefaultRoute(journeyKey, examId, {
    scanAttentionCount: options?.scanAttentionCount,
  }))
}
