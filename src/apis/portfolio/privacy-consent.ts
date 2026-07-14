import http from '@/config/axios'

export type PortfolioPrivacyConsentStatusCode = 'GRANTED' | 'DECLINED' | 'WITHDRAWN'

export interface PortfolioPrivacyConsentVO {
  teacherId: string
  consentStatus?: PortfolioPrivacyConsentStatusCode
  policyVersion?: string
  currentPolicyVersion: string
  collectionAllowed: boolean
  needsConsent: boolean
  grantedAt?: string
  withdrawnAt?: string
  declinedAt?: string
}

export interface PortfolioPrivacyConsentNoticeVO {
  policyVersion: string
  noticeMarkdown: string
}

export const portfolioPrivacyConsentApi = {
  getNotice: () =>
    http.post<PortfolioPrivacyConsentNoticeVO>('/api/portfolio/privacy-consent/notice/get', {}),
  getCurrent: (data?: { teacherId?: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/current/get', data || {}),
  grant: (data?: { teacherId?: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/grant', data || {}),
  decline: (data?: { teacherId?: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/decline', data || {}),
  withdraw: (data?: { teacherId?: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/withdraw', data || {}),
}
