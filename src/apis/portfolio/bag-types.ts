import type { SemesterCode } from '@/types/enums/semester-enum'

export interface PortfolioArchiveBagAssembleVO {
  teacherId: string
  completenessPercent: number
  archivedCategoryCount: number
  missingCategoryNames: string[]
  openGapTaskCount: number
  latestMaterialPackageExport?: PortfolioArchiveBagLatestExportVO
  preview?: PortfolioArchiveBagPreviewVO
}

export interface PortfolioArchiveBagLatestExportVO {
  exportLogId: string
  exportType: string
  exportedTime: string
  fileNodeId: string
  rowCount: number
  attachmentCount: number
}

export interface PortfolioArchiveBagAttachmentVO {
  fileNodeId: string
  fileName: string
  sortOrder: number
}

export type PortfolioArchiveBagSourceType = 'ARCHIVE' | 'ACHIEVEMENT' | 'MATERIAL'

export const PORTFOLIO_ARCHIVE_BAG_SOURCE_TYPE_LABEL: Record<
  PortfolioArchiveBagSourceType,
  string
> = {
  ARCHIVE: '正式档案',
  ACHIEVEMENT: '成果库',
  MATERIAL: '材料库',
}

export interface PortfolioArchiveBagItemVO {
  recordId?: string
  categoryId?: string
  sourceType: PortfolioArchiveBagSourceType
  achievementType?: string
  materialType?: string
  title: string
  categoryName?: string
  courseName?: string
  semester?: SemesterCode
  academicYear?: string
  courseCode?: string
  attachmentCount: number
  attachments: PortfolioArchiveBagAttachmentVO[]
}

export type PortfolioArchiveBagSectionType
  = 'BY_CATEGORY' | 'BY_SEMESTER' | 'BY_COURSE' | 'BY_ACHIEVEMENT'

export interface PortfolioArchiveBagSectionGroupVO {
  groupTitle: string
  items: PortfolioArchiveBagItemVO[]
}

export interface PortfolioArchiveBagSectionVO {
  sectionType: PortfolioArchiveBagSectionType
  sectionTitle: string
  groups: PortfolioArchiveBagSectionGroupVO[]
}

export interface PortfolioArchiveBagPreviewVO {
  teacherId: string
  completenessPercent: number
  missingCategoryNames: string[]
  openGapTaskCount: number
  archivedCategoryCount: number
  totalAttachmentCount: number
  totalScore?: number
  latestMaterialPackageExport?: PortfolioArchiveBagLatestExportVO
  sections: PortfolioArchiveBagSectionVO[]
  catalogItems: PortfolioArchiveBagItemVO[]
}

export interface PortfolioArchiveBagExportResultVO {
  fileName: string
  fileNodeId: string
  rowCount: number
  catalogItemCount?: number
  attachmentCount?: number
}

export interface PortfolioArchiveScoreBreakdownItemVO {
  ruleId: string
  ruleName: string
  earnedScore: number
  explainText: string
}

export interface PortfolioArchiveScoreResultVO {
  teacherId: string
  academicYear?: string
  totalScore: number
  breakdown: PortfolioArchiveScoreBreakdownItemVO[]
  computedTime?: string
}

export interface PortfolioArchiveBagFilterRequest {
  teacherId?: string
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
  materialType?: string
}
