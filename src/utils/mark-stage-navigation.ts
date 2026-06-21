import type { Router } from 'vue-router'
import type { MarkStageKey } from '@/stores/modules/markStage'
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
