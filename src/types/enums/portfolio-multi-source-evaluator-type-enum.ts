/** 多元评价来源类型 - 与后端 PortfolioMultiSourceEvaluatorTypeEnum 逐值对齐 */
export enum PortfolioMultiSourceEvaluatorTypeEnum {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  PEER = 'PEER',
  SELF = 'SELF',
  COMMITTEE = 'COMMITTEE',
}

export const ALL_PORTFOLIO_MULTI_SOURCE_EVALUATOR_TYPE_ENUMS: readonly PortfolioMultiSourceEvaluatorTypeEnum[] = [
  PortfolioMultiSourceEvaluatorTypeEnum.STUDENT,
  PortfolioMultiSourceEvaluatorTypeEnum.SUPERVISOR,
  PortfolioMultiSourceEvaluatorTypeEnum.PEER,
  PortfolioMultiSourceEvaluatorTypeEnum.SELF,
  PortfolioMultiSourceEvaluatorTypeEnum.COMMITTEE,
]

export const PortfolioMultiSourceEvaluatorTypeDescription: Record<
  PortfolioMultiSourceEvaluatorTypeEnum,
  string
> = {
  [PortfolioMultiSourceEvaluatorTypeEnum.STUDENT]: '学生评价',
  [PortfolioMultiSourceEvaluatorTypeEnum.SUPERVISOR]: '督导评价',
  [PortfolioMultiSourceEvaluatorTypeEnum.PEER]: '同行评价',
  [PortfolioMultiSourceEvaluatorTypeEnum.SELF]: '教师自评',
  [PortfolioMultiSourceEvaluatorTypeEnum.COMMITTEE]: '教学委员会评价',
}

export const PortfolioMultiSourceEvaluatorTypeOptions = ALL_PORTFOLIO_MULTI_SOURCE_EVALUATOR_TYPE_ENUMS.map(
  (code) => ({
    value: code,
    label: PortfolioMultiSourceEvaluatorTypeDescription[code],
  }),
)
