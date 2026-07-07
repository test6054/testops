import type { RouteLocationRaw } from 'vue-router'

/** 卷详情 NextSteps 卷外路由键，与后端 ArchiveVolumeNextStepActionResponse.externalRouteKey 一致 */
export type ArchiveVolumeNextStepExternalRouteKey = 'EVAL_CAMPAIGN' | 'AI_ANALYSIS'

export interface ArchiveNextStepNavigationContext {
  examId?: string
  volumeId?: string
}

export function isArchiveVolumeNextStepExternalRouteKey(
  value: string,
): value is ArchiveVolumeNextStepExternalRouteKey {
  return value === 'EVAL_CAMPAIGN' || value === 'AI_ANALYSIS'
}

/**
 * 将后端 externalRouteKey 解析为 Vue Router 目标；未知键显式失败，避免静默无跳转。
 */
export function resolveArchiveNextStepRouteLocation(
  externalRouteKey: ArchiveVolumeNextStepExternalRouteKey,
  context: ArchiveNextStepNavigationContext,
): RouteLocationRaw {
  if (externalRouteKey === 'EVAL_CAMPAIGN') {
    return {
      name: 'TeacherArchiveVolumeEvalCampaign',
      query: context.volumeId ? { volumeId: context.volumeId } : undefined,
    }
  }
  return {
    name: 'TeacherAiAnalysisCenter',
    query: context.examId ? { examId: context.examId } : undefined,
  }
}
