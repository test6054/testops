import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import http from '@/config/axios'

const PUBLIC_EXPERT = '/api/public/portfolio/expert-assignment'

export interface PortfolioPublicExpertReviewSubjectVO {
  subjectRef: string
  maskedDisplayName: string
  /** 生命周期状态编码（脱敏可读；不默认过滤） */
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  /** 档案写禁 */
  archiveWriteForbidden?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 评价参评 hold（与档案写禁分离） */
  evaluationHeld?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
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
  /** 材料身份切片 CAMPUS/EXTERNAL/SHARED（US-MI-01；免登可读） */
  identityScope?: string
  /** EXTERNAL 切片不可用于校内硬性条件 */
  usableForCampusHardCriteria?: boolean
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  countsInCurrentFacultyStructure?: boolean
  evaluationHeld?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
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
