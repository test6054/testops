/** 材料 Intake 校验诊断编码 - PortfolioMaterialIntakeValidationCodeEnum */
export enum PortfolioMaterialIntakeValidationCode {
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
}

export const PortfolioMaterialIntakeValidationCodeDescription: Record<
  PortfolioMaterialIntakeValidationCode,
  string
> = {
  [PortfolioMaterialIntakeValidationCode.REQUIRED_FIELD_MISSING]: '必填字段未填写',
}
