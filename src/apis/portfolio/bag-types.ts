import type { PortfolioArchiveBagSectionTypeCode } from '@/types/enums/portfolio-archive-bag-section-type-enum'
import type { PortfolioArchiveBagSourceTypeCode } from '@/types/enums/portfolio-archive-bag-source-type-enum'
import type { PortfolioCompletenessLevelCode } from '@/types/enums/portfolio-completeness-level-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'

export {
  ALL_PORTFOLIO_ARCHIVE_BAG_SECTION_TYPE_CODES,
  PortfolioArchiveBagSectionTypeCode,
  PortfolioArchiveBagSectionTypeDescription,
} from '@/types/enums/portfolio-archive-bag-section-type-enum'
export {
  ALL_PORTFOLIO_ARCHIVE_BAG_SOURCE_TYPE_CODES,
  PortfolioArchiveBagSourceTypeCode,
  PortfolioArchiveBagSourceTypeDescription,
} from '@/types/enums/portfolio-archive-bag-source-type-enum'

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

export interface PortfolioArchiveBagItemVO {
  recordId?: string
  categoryId?: string
  sourceType: PortfolioArchiveBagSourceTypeCode
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

export interface PortfolioArchiveBagSectionGroupVO {
  groupTitle: string
  items: PortfolioArchiveBagItemVO[]
}

export interface PortfolioArchiveBagSectionVO {
  sectionType: PortfolioArchiveBagSectionTypeCode
  sectionTitle: string
  groups: PortfolioArchiveBagSectionGroupVO[]
}

export interface PortfolioArchiveBagPreviewVO {
  teacherId: string
  completenessPercent: number
  completenessLevel?: PortfolioCompletenessLevelCode
  currentAcademicYear?: string
  requiredCategoryTotal?: number
  requiredCategoryDone?: number
  courseArchiveTaughtCourseCount?: number
  courseArchiveFullyCompleteCount?: number
  courseArchiveFrameworkSlotDone?: number
  courseArchiveFrameworkSlotTotal?: number
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
  ruleId?: string
  ruleName: string
  earnedScore: number
  rawScore?: number
  decayFactor?: number
  recognitionYear?: number
  achievementType?: string
  decayProfileLabel?: string
  decayApplied?: boolean
  lineType?: string
  explainText: string
}

export interface PortfolioArchiveScoreResultVO {
  teacherId: string
  academicYear?: string
  totalScore: number
  breakdown: PortfolioArchiveScoreBreakdownItemVO[]
  computedTime?: string
}

export interface PortfolioArchiveBagTeacherRequest {
  teacherId?: string
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
  materialType?: string
}
