/** 行业包企业实践必填字段编码 - PortfolioIndustryPackRequiredFieldCodeEnum */
export enum PortfolioIndustryPackRequiredFieldCode {
  ENTERPRISE_NAME = 'ENTERPRISE_NAME',
  PRACTICE_POST = 'PRACTICE_POST',
  PRACTICE_PERIOD = 'PRACTICE_PERIOD',
  PRACTICE_CONTENT = 'PRACTICE_CONTENT',
  ENTERPRISE_EVALUATION = 'ENTERPRISE_EVALUATION',
}

export const PortfolioIndustryPackRequiredFieldCodeDescription: Record<
  PortfolioIndustryPackRequiredFieldCode,
  string
> = {
  [PortfolioIndustryPackRequiredFieldCode.ENTERPRISE_NAME]: '企业名称',
  [PortfolioIndustryPackRequiredFieldCode.PRACTICE_POST]: '实践岗位',
  [PortfolioIndustryPackRequiredFieldCode.PRACTICE_PERIOD]: '起止时间',
  [PortfolioIndustryPackRequiredFieldCode.PRACTICE_CONTENT]: '实践内容',
  [PortfolioIndustryPackRequiredFieldCode.ENTERPRISE_EVALUATION]: '企业评价',
}
