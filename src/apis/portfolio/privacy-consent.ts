import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
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
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean

  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
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
  grant: (data: { teacherId?: string, policyVersion: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/grant', data),
  decline: (data: { teacherId?: string, policyVersion: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/decline', data),
  withdraw: (data: { teacherId?: string, policyVersion: string }) =>
    http.post<PortfolioPrivacyConsentVO>('/api/portfolio/privacy-consent/withdraw', data),
}
