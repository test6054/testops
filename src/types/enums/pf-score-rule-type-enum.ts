/** Score 规则模板类型 - PfScoreRuleTypeEnum */
export enum PfScoreRuleTypeCode {
  THRESHOLD = 'THRESHOLD',
  SEGMENT = 'SEGMENT',
  RATIO = 'RATIO',
  CUMULATIVE = 'CUMULATIVE',
  CAP = 'CAP',
  ADD_SUB = 'ADD_SUB',
  WEIGHT = 'WEIGHT',
}

export const ALL_PF_SCORE_RULE_TYPE_CODES: readonly PfScoreRuleTypeCode[] = [
  PfScoreRuleTypeCode.THRESHOLD,
  PfScoreRuleTypeCode.SEGMENT,
  PfScoreRuleTypeCode.RATIO,
  PfScoreRuleTypeCode.CUMULATIVE,
  PfScoreRuleTypeCode.CAP,
  PfScoreRuleTypeCode.ADD_SUB,
  PfScoreRuleTypeCode.WEIGHT,
]

export const PfScoreRuleTypeDescription: Record<PfScoreRuleTypeCode, string> = {
  [PfScoreRuleTypeCode.THRESHOLD]: '阈值型',
  [PfScoreRuleTypeCode.SEGMENT]: '分段型',
  [PfScoreRuleTypeCode.RATIO]: '比例型',
  [PfScoreRuleTypeCode.CUMULATIVE]: '累计型',
  [PfScoreRuleTypeCode.CAP]: '封顶型',
  [PfScoreRuleTypeCode.ADD_SUB]: '加减分型',
  [PfScoreRuleTypeCode.WEIGHT]: '权重型',
}
