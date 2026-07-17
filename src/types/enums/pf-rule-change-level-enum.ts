/** 规则变更级别 - PfRuleChangeLevelEnum（§8.31.1） */
export enum PfRuleChangeLevelCode {
  A = 'A',
  B = 'B',
  C = 'C',
}

export const ALL_PF_RULE_CHANGE_LEVEL_CODES: readonly PfRuleChangeLevelCode[] = [
  PfRuleChangeLevelCode.A,
  PfRuleChangeLevelCode.B,
  PfRuleChangeLevelCode.C,
]

export const PfRuleChangeLevelDescription: Record<PfRuleChangeLevelCode, string> = {
  [PfRuleChangeLevelCode.A]: '重大变更',
  [PfRuleChangeLevelCode.B]: '中等变更',
  [PfRuleChangeLevelCode.C]: '轻微变更',
}

export function pfRuleChangeLevelRequiresApproval(level?: string | null): boolean {
  return level === PfRuleChangeLevelCode.A || level === PfRuleChangeLevelCode.B
}
