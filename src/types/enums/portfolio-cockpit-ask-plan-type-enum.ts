/** 驾驶舱问数计划类型 - PortfolioCockpitAskPlanTypeEnum */
export enum PortfolioCockpitAskPlanTypeCode {
  INDICATOR_THRESHOLD = 'INDICATOR_THRESHOLD',
  DEPT_ONE_TABLE_FIELD = 'DEPT_ONE_TABLE_FIELD',
  REFUSED = 'REFUSED',
}

export const ALL_PORTFOLIO_COCKPIT_ASK_PLAN_TYPE_CODES: readonly PortfolioCockpitAskPlanTypeCode[] = [
  PortfolioCockpitAskPlanTypeCode.INDICATOR_THRESHOLD,
  PortfolioCockpitAskPlanTypeCode.DEPT_ONE_TABLE_FIELD,
  PortfolioCockpitAskPlanTypeCode.REFUSED,
]

export const PortfolioCockpitAskPlanTypeDescription: Record<PortfolioCockpitAskPlanTypeCode, string> = {
  [PortfolioCockpitAskPlanTypeCode.INDICATOR_THRESHOLD]: '指标阈值',
  [PortfolioCockpitAskPlanTypeCode.DEPT_ONE_TABLE_FIELD]: '部门一张表字段',
  [PortfolioCockpitAskPlanTypeCode.REFUSED]: '拒绝回答',
}
