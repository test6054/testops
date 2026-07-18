/** §8.53 多元评价来源类型 */
export enum PortfolioMultiSourceEvaluatorTypeCode {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  PEER = 'PEER',
  SELF = 'SELF',
  COMMITTEE = 'COMMITTEE',
}

export const PortfolioMultiSourceEvaluatorTypeDescription: Record<
  PortfolioMultiSourceEvaluatorTypeCode,
  string
> = {
  [PortfolioMultiSourceEvaluatorTypeCode.STUDENT]: '学生评价',
  [PortfolioMultiSourceEvaluatorTypeCode.SUPERVISOR]: '督导评价',
  [PortfolioMultiSourceEvaluatorTypeCode.PEER]: '同行评价',
  [PortfolioMultiSourceEvaluatorTypeCode.SELF]: '教师自评',
  [PortfolioMultiSourceEvaluatorTypeCode.COMMITTEE]: '教学委员会评价',
}

export const PortfolioMultiSourceEvaluatorTypeOptions = Object.values(
  PortfolioMultiSourceEvaluatorTypeCode,
).map((code) => ({
  value: code,
  label: PortfolioMultiSourceEvaluatorTypeDescription[code],
}))
