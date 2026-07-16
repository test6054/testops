import http from '@/config/axios'

const PUBLIC_EXPERT = '/api/public/portfolio/expert-assignment'

export interface PortfolioPublicExpertReviewSubjectVO {
  subjectRef: string
  maskedDisplayName: string
}

export interface PortfolioPublicExpertReviewMaterialVO {
  materialRef: string
  maskedTeacherLabel: string
  categoryCode?: string
  categoryName?: string
  academicYear?: string
  documentVersionNo?: number
  sourceType?: string
  hasPrimaryFile: boolean
  supportMaterialCount: number
}

export interface PortfolioPublicExpertReviewBundleVO {
  evaluationTaskName: string
  maskRequired: true
  expireTime: string
  readOnly: true
  subjectTeachers: PortfolioPublicExpertReviewSubjectVO[]
  materials: PortfolioPublicExpertReviewMaterialVO[]
}

export const portfolioPublicExpertApi = {
  reviewBundle: (data: { tenantId: string, accessToken: string }) =>
    http.post<PortfolioPublicExpertReviewBundleVO>(`${PUBLIC_EXPERT}/review-bundle`, data),
}
