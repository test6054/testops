import type { RouteLocationNormalized, RouteRecordNormalized } from 'vue-router'
import { message } from 'ant-design-vue'
import { useQualityStore } from '@/stores/modules/quality'

/** 路由链是否要求培养方案已确认 */
export function routeRequiresPlanConfirmed(matched: RouteRecordNormalized[]): boolean {
  return matched.some((record) => record.meta.requiresPlanConfirmed === true)
}

/**
 * 质量评价 Publish 门控：进入达成度/报告等页面前校验培养方案已确认。
 * 会先确保 plan options 已加载，缺失时显式失败，不做静默 fallback。
 */
export async function ensureQualityPlanConfirmedForNavigation(
  to?: RouteLocationNormalized,
): Promise<boolean> {
  if (to && !routeRequiresPlanConfirmed(to.matched)) {
    return true
  }
  const qualityStore = useQualityStore()
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    message.error('请先选择培养方案并完成确认后再进入该页面')
    return false
  }
  if (qualityStore.currentProgramId && !qualityStore.currentPlan) {
    await qualityStore.loadTrainingPlanOptions({
      programId: qualityStore.currentProgramId,
    })
  }
  if (qualityStore.trainingPlanLoading) {
    message.warning('培养方案信息加载中，请稍后重试')
    return false
  }
  const plan = qualityStore.currentPlan
  if (!plan || plan.confirmationStatus !== 'CONFIRMED') {
    message.error('培养方案尚未确认，请先在「培养方案体系工作台」完成确认')
    return false
  }
  return true
}
