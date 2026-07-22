import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/multi-identity'
import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioArchiveBagSectionTypeCode } from '@/types/enums/portfolio-archive-bag-section-type-enum'
import type { PortfolioArchiveBagSourceTypeCode } from '@/types/enums/portfolio-archive-bag-source-type-enum'
import type { PortfolioCompletenessLevelCode } from '@/types/enums/portfolio-completeness-level-enum'
import type { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import type { PortfolioMaterialTypeCode } from '@/types/enums/portfolio-material-type-enum'
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
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
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

export interface PortfolioArchiveBagLatestExportVO {
  exportLogId: string
  exportType: PortfolioExportTypeCode
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
  materialType?: PortfolioMaterialTypeCode
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
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
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
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
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

export interface PortfolioArchiveBagTeacherRequest {
  teacherId?: string
  academicYear?: string
  semester?: SemesterCode
  courseCode?: string
  achievementType?: string
  materialType?: PortfolioMaterialTypeCode
}
