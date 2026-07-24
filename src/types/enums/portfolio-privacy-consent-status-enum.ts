/** 个人信息处理同意状态 - PortfolioPrivacyConsentStatusEnum */
export enum PortfolioPrivacyConsentStatusCode {
  GRANTED = 'GRANTED',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
}

export const PortfolioPrivacyConsentStatusDescription: Record<
  PortfolioPrivacyConsentStatusCode,
  string
> = {
  [PortfolioPrivacyConsentStatusCode.GRANTED]: '已同意',
  [PortfolioPrivacyConsentStatusCode.DECLINED]: '暂不授权',
  [PortfolioPrivacyConsentStatusCode.WITHDRAWN]: '已撤回',
}
