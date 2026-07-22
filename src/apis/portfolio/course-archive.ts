import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type {
  PortfolioMultiIdentityLayerVO,
  PortfolioTeachingWorkloadByIdentityVO,
} from '@/apis/portfolio/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export interface PortfolioCourseArchiveFrameworkVO {
  categoryId: string
  categoryCode: string
  categoryName: string
  sortOrder?: number
  completed: boolean
  officialRecordId?: string
  latestUpdateTime?: string
}

export interface PortfolioCourseArchiveCourseVO {
  taughtCourseId: string
  courseCode: string
  courseName: string
  academicYear?: string
  semester?: SemesterCode
  completedFrameworkCount: number
  totalFrameworkCount: number
  frameworks: PortfolioCourseArchiveFrameworkVO[]
  /** 教务讲授校内口径 CAMPUS */
  identityScope?: string
}

export interface PortfolioCourseArchiveOverviewVO {
  teacherId: string
  taughtCourseCount: number
  fullyCompleteCourseCount: number
  frameworkSlotDone: number
  frameworkSlotTotal: number
  courses: PortfolioCourseArchiveCourseVO[]
  teachingWorkloadByIdentity?: PortfolioTeachingWorkloadByIdentityVO
  identityLayers?: PortfolioMultiIdentityLayerVO[]
  multiIdentityNotes?: string[]
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
  /** 归属教师多身份并列层（US-MI-01 / §8.50） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioCourseArchiveOverviewRequest {
  teacherId?: string
  academicYear?: string
}

export const portfolioCourseArchiveApi = {
  overview: (request: PortfolioCourseArchiveOverviewRequest) =>
    http.post<PortfolioCourseArchiveOverviewVO>('/api/portfolio/course-archive/overview', request),
}
