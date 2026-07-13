import type { RouteLocationRaw, RouteRecordNormalized } from 'vue-router'
import type { QualityGate } from '@/constants/quality-scope-profile'
import { message } from 'ant-design-vue'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import { useQualityStore } from '@/stores/modules/quality'

/** 达成度 / 报告门控未通过时跳转培养方案工作台的 query 键 */
export const QUALITY_PLAN_GATE_REASON_QUERY = 'gateReason'

/** 门控 reason：当前培养方案未确认 */
export const QUALITY_PLAN_GATE_REASON_UNCONFIRMED = 'plan-unconfirmed'

/** 门控 reason：尚未选择培养方案 */
export const QUALITY_PLAN_GATE_REASON_NO_PLAN = 'plan-missing'

const MSG_NO_PLAN = '请先在培养方案体系工作台选择并确认培养方案'
const MSG_UNCONFIRMED = '培养方案尚未确认。达成度计算与正式质量报告须在方案确认后开放，请先完成确认。'
const MSG_LOADING = '培养方案信息加载中，请稍后再试'

/** 路由链是否要求培养方案已确认（仅 qualityGate） */
export function routeRequiresPlanConfirmed(matched: RouteRecordNormalized[]): boolean {
  return matched.some((record) => record.meta?.qualityGate === ('plan-confirmed' satisfies QualityGate))
}

/** 是否命中培养方案未确认门控（侧栏 / Scope 共用） */
export function isQualityPlanGateBlocked(): boolean {
  const qualityStore = useQualityStore()
  const plan = qualityStore.currentPlan
  if (!qualityStore.currentTrainingPlanId) {
    return true
  }
  return !plan || plan.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
}

/** 组装跳转培养方案工作台的路由，携带 gateReason 供回流条展示 */
export function buildQualityPlanWorkbenchLocation(
  reason: typeof QUALITY_PLAN_GATE_REASON_UNCONFIRMED | typeof QUALITY_PLAN_GATE_REASON_NO_PLAN,
): RouteLocationRaw {
  return {
    name: 'QualityTrainingPlanWorkbench',
    query: { [QUALITY_PLAN_GATE_REASON_QUERY]: reason },
  }
}

/**
 * 质量评价 Publish 门控：进入达成度/报告等页面前校验培养方案已确认。
 * @returns true 放行；false 拦截（调用方应跳转工作台）
 */
export async function ensureQualityPlanConfirmedForNavigation(
  matched: RouteRecordNormalized[],
): Promise<boolean> {
  if (!routeRequiresPlanConfirmed(matched)) {
    return true
  }
  const qualityStore = useQualityStore()
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    message.warning(MSG_NO_PLAN)
    return false
  }
  if (qualityStore.currentProgramId && !qualityStore.currentPlan) {
    await qualityStore.loadTrainingPlanOptions({
      programId: qualityStore.currentProgramId,
    })
  }
  if (qualityStore.trainingPlanLoading) {
    message.warning(MSG_LOADING)
    return false
  }
  const plan = qualityStore.currentPlan
  if (!plan || plan.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    message.warning(MSG_UNCONFIRMED)
    return false
  }
  return true
}

/** 门控拦截后跳转目标；区分未选方案与未确认 */
export function resolveQualityPlanGateRedirect(
  matched: RouteRecordNormalized[],
): RouteLocationRaw | null {
  if (!routeRequiresPlanConfirmed(matched)) {
    return null
  }
  const qualityStore = useQualityStore()
  if (!qualityStore.currentTrainingPlanId) {
    return buildQualityPlanWorkbenchLocation(QUALITY_PLAN_GATE_REASON_NO_PLAN)
  }
  const plan = qualityStore.currentPlan
  if (!plan || plan.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return buildQualityPlanWorkbenchLocation(QUALITY_PLAN_GATE_REASON_UNCONFIRMED)
  }
  return null
}
