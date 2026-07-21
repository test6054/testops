import type { PortfolioDevelopmentRecordVO } from '@/apis/portfolio/teacher-platform'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import type { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import http from '@/config/axios'

export enum PortfolioAchievementEvidenceTypeCode {
  DEV_RECORD_LEVEL = 'DEV_RECORD_LEVEL',
  DEV_RECORD_CATEGORY = 'DEV_RECORD_CATEGORY',
  INDICATOR_CODE = 'INDICATOR_CODE',
}

export const PortfolioAchievementEvidenceTypeDescription: Record<
  PortfolioAchievementEvidenceTypeCode,
  string
> = {
  [PortfolioAchievementEvidenceTypeCode.DEV_RECORD_LEVEL]: '发展记录级别',
  [PortfolioAchievementEvidenceTypeCode.DEV_RECORD_CATEGORY]: '发展记录分类',
  [PortfolioAchievementEvidenceTypeCode.INDICATOR_CODE]: '规划关联指标',
}

export interface PortfolioNationalAchievementRequirementVO {
  id?: string
  requirementCode: string
  requirementTitle: string
  evidenceType: PortfolioAchievementEvidenceTypeCode
  evidenceMatchValue: string
  weight: string
  sortOrder: number
}

export interface PortfolioNationalAchievementCatalogVO {
  id: string
  categoryCode: string
  levelCode: string
  catalogName: string
  standardDescription: string
  indicatorCode?: string
  buildCycleMonths?: number
  enabled: boolean
  updateTime: string
  requirements: PortfolioNationalAchievementRequirementVO[]
}

export interface PortfolioNationalAchievementRequirementSaveItem {
  requirementCode: string
  requirementTitle: string
  evidenceType: PortfolioAchievementEvidenceTypeCode
  evidenceMatchValue: string
  weight: string
  sortOrder: number
}

export interface PortfolioNationalAchievementCatalogSaveRequest {
  id?: string
  categoryCode: string
  levelCode: PortfolioHonorLevelCode
  catalogName: string
  standardDescription: string
  indicatorCode?: string
  buildCycleMonths?: number
  enabled: boolean
  requirements: PortfolioNationalAchievementRequirementSaveItem[]
}

export interface PortfolioPlanningAchievementLinkVO {
  id: string
  planId: string
  planItemId: string
  catalogId: string
  catalogName?: string
  teacherUserId: string
  linkStatus: string
  completionRate?: string
  lockedTime?: string
  lifecycleStatus?: string
  lifecycleStatusLabel?: string
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（ACTIVE 身份；§8.50 / US-MI-01） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string

}


export interface PortfolioAchievementGapMissingItemVO {
  requirementCode: string
  requirementTitle: string
  evidenceType: PortfolioAchievementEvidenceTypeCode
  evidenceMatchValue: string
  weight: string
  suggestCollectHint: string
}

export interface PortfolioAchievementGapAnalysisVO {
  linkId: string
  planItemId: string
  catalogId: string
  catalogName: string
  completionRate: string
  linkStatus: string
  targetSummary: string
  missingItems: PortfolioAchievementGapMissingItemVO[]
  satisfiedItems: PortfolioAchievementGapMissingItemVO[]
}

export const portfolioNationalAchievementApi = {
  pageCatalog: (data: {
    pageNum: number
    pageSize: number
    levelCode?: PortfolioHonorLevelCode
    categoryCode?: string
    keyword?: string
    enabled?: boolean
  }) =>
    http.post<PageResult<PortfolioNationalAchievementCatalogVO>>(
      '/api/portfolio/national-achievement/catalog/page',
      data,
    ),

  getCatalog: (data: { id: string }) =>
    http.post<PortfolioNationalAchievementCatalogVO>(
      '/api/portfolio/national-achievement/catalog/get',
      data,
    ),

  saveCatalog: (data: PortfolioNationalAchievementCatalogSaveRequest) =>
    http.post<string>('/api/portfolio/national-achievement/catalog/save', data),

  deleteCatalog: (data: { id: string }) =>
    http.post<void>('/api/portfolio/national-achievement/catalog/delete', data),

  link: (data: { planItemId: string, catalogId: string }) =>
    http.post<PortfolioPlanningAchievementLinkVO>('/api/portfolio/planning/achievement/link', data),

  gapAnalysis: (data: { planItemId: string }) =>
    http.post<PortfolioAchievementGapAnalysisVO>(
      '/api/portfolio/planning/achievement/gap-analysis',
      data,
    ),

  pageRecord: (data: {
    pageNum: number
    pageSize: number
    searchText?: string
    categoryCode?: string
    levelCode?: PortfolioHonorLevelCode
  }) =>
    http.post<PageResult<PortfolioDevelopmentRecordVO>>(
      '/api/portfolio/national-achievement/record/page',
      data,
    ),
}
