/** 进行中任务规则策略 - PfCurrentTaskRuleStrategyEnum（§8.31.1） */
export enum PfCurrentTaskRuleStrategyCode {
  KEEP_CURRENT = 'KEEP_CURRENT',
  APPLY_NEW = 'APPLY_NEW',
}

export const ALL_PF_CURRENT_TASK_RULE_STRATEGY_CODES: readonly PfCurrentTaskRuleStrategyCode[] = [
  PfCurrentTaskRuleStrategyCode.KEEP_CURRENT,
  PfCurrentTaskRuleStrategyCode.APPLY_NEW,
]

export const PfCurrentTaskRuleStrategyDescription: Record<PfCurrentTaskRuleStrategyCode, string> = {
  [PfCurrentTaskRuleStrategyCode.KEEP_CURRENT]: '沿用原规则',
  [PfCurrentTaskRuleStrategyCode.APPLY_NEW]: '切换新规则',
}

export const PF_CURRENT_TASK_RULE_STRATEGY_OPTIONS = ALL_PF_CURRENT_TASK_RULE_STRATEGY_CODES.map(
  (value) => ({
    value,
    label: PfCurrentTaskRuleStrategyDescription[value],
  }),
)
