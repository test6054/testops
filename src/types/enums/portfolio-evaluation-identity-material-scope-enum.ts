/** 参评材料身份切片 - PortfolioEvaluationIdentityMaterialScopeEnum */
export enum PortfolioEvaluationIdentityMaterialScopeCode {
  CAMPUS = 'CAMPUS',
  EXTERNAL = 'EXTERNAL',
  SHARED = 'SHARED',
}

export const ALL_PORTFOLIO_EVALUATION_IDENTITY_MATERIAL_SCOPE_CODES: readonly PortfolioEvaluationIdentityMaterialScopeCode[]
  = [
    PortfolioEvaluationIdentityMaterialScopeCode.CAMPUS,
    PortfolioEvaluationIdentityMaterialScopeCode.EXTERNAL,
    PortfolioEvaluationIdentityMaterialScopeCode.SHARED,
  ]

export const PortfolioEvaluationIdentityMaterialScopeDescription: Record<
  PortfolioEvaluationIdentityMaterialScopeCode,
  string
> = {
  [PortfolioEvaluationIdentityMaterialScopeCode.CAMPUS]: '校内',
  [PortfolioEvaluationIdentityMaterialScopeCode.EXTERNAL]: '仅外部',
  [PortfolioEvaluationIdentityMaterialScopeCode.SHARED]: '共享',
}
