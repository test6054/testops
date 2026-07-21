/**
 * 与后端 PfEligibilityRuleStatusEnum.code 逐值一致。
 */
export enum PfEligibilityRuleStatusCode {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const ALL_PF_ELIGIBILITY_RULE_STATUS_CODES: readonly PfEligibilityRuleStatusCode[] = [
  PfEligibilityRuleStatusCode.ACTIVE,
  PfEligibilityRuleStatusCode.INACTIVE,
]

export const PfEligibilityRuleStatusDescription: Record<PfEligibilityRuleStatusCode, string> = {
  [PfEligibilityRuleStatusCode.ACTIVE]: '启用',
  [PfEligibilityRuleStatusCode.INACTIVE]: '停用',
}
