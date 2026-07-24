/** 培训学分业务分类 - PortfolioCreditCategoryEnum */
export enum PortfolioCreditCategoryCode {
  ALL = 'ALL',
  DIGITAL_LITERACY = 'DIGITAL_LITERACY',
  NATIONAL_TRAINING = 'NATIONAL_TRAINING',
  CERTIFICATE = 'CERTIFICATE',
  OTHER_TRAINING = 'OTHER_TRAINING',
}

export const ALL_PORTFOLIO_CREDIT_CATEGORY_CODES: readonly PortfolioCreditCategoryCode[] = [
  PortfolioCreditCategoryCode.ALL,
  PortfolioCreditCategoryCode.DIGITAL_LITERACY,
  PortfolioCreditCategoryCode.NATIONAL_TRAINING,
  PortfolioCreditCategoryCode.CERTIFICATE,
  PortfolioCreditCategoryCode.OTHER_TRAINING,
]

export const PortfolioCreditCategoryDescription: Record<PortfolioCreditCategoryCode, string> = {
  [PortfolioCreditCategoryCode.ALL]: '全部',
  [PortfolioCreditCategoryCode.DIGITAL_LITERACY]: '数字素养',
  [PortfolioCreditCategoryCode.NATIONAL_TRAINING]: '国培',
  [PortfolioCreditCategoryCode.CERTIFICATE]: '证书',
  [PortfolioCreditCategoryCode.OTHER_TRAINING]: '其它培训',
}
