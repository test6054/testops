import type { Router } from 'vue-router'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { MARK_STAGE_DEFAULT_ROUTE } from '@/constants/mark-workspace-nav'

/**
 * 从 StageRail 点击跳转到对应阶段默认子路由。
 */
export function navigateToMarkStage(router: Router, stageKey: string, examId: string): void {
  const routeName = MARK_STAGE_DEFAULT_ROUTE[stageKey as MarkStageKey]
  if (!routeName || !examId) {
    return
  }
  void router.push({
    name: routeName,
    params: { examId },
  })
}
