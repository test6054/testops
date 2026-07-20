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
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: string
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean

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
