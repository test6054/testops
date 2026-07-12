/** 脱敏字段类型 - PortfolioMaskFieldTypeEnum */
export enum PortfolioMaskFieldTypeCode {
  ID_CARD = 'ID_CARD',
  MOBILE = 'MOBILE',
  ETHICS_RISK = 'ETHICS_RISK',
  DISCIPLINE_RECORD = 'DISCIPLINE_RECORD',
  EVALUATION_DETAIL = 'EVALUATION_DETAIL',
  ATTACHMENT_ORIGINAL = 'ATTACHMENT_ORIGINAL',
}

export const ALL_PORTFOLIO_MASK_FIELD_TYPE_CODES: readonly PortfolioMaskFieldTypeCode[] = [
  PortfolioMaskFieldTypeCode.ID_CARD,
  PortfolioMaskFieldTypeCode.MOBILE,
  PortfolioMaskFieldTypeCode.ETHICS_RISK,
  PortfolioMaskFieldTypeCode.DISCIPLINE_RECORD,
  PortfolioMaskFieldTypeCode.EVALUATION_DETAIL,
  PortfolioMaskFieldTypeCode.ATTACHMENT_ORIGINAL,
]

export const PortfolioMaskFieldTypeDescription: Record<PortfolioMaskFieldTypeCode, string> = {
  [PortfolioMaskFieldTypeCode.ID_CARD]: '身份证号',
  [PortfolioMaskFieldTypeCode.MOBILE]: '手机号',
  [PortfolioMaskFieldTypeCode.ETHICS_RISK]: '师德风险详情',
  [PortfolioMaskFieldTypeCode.DISCIPLINE_RECORD]: '处分记录',
  [PortfolioMaskFieldTypeCode.EVALUATION_DETAIL]: '评价分项明细',
  [PortfolioMaskFieldTypeCode.ATTACHMENT_ORIGINAL]: '附件原件',
}
