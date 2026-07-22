import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PortfolioArchiveRecordStatusCode } from '@/types/enums/portfolio-archive-record-status-enum'
import type { PortfolioProcessSessionStatusCode } from '@/types/enums/portfolio-process-session-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export interface PortfolioProcessSessionVO {
  id: string
  teacherUserId: string
  taughtCourseId: string
  courseCode?: string
  courseName?: string
  academicYear?: string
  semester?: SemesterCode
  sessionDate: string
  sessionTitle: string
  prepText?: string
  processText?: string
  feedbackText?: string
  /** 深链用，页面不展示主键 */
  linkedArchiveRecordId?: string
  /** 教师可读：关联档案说明（分类 + 状态） */
  linkedArchiveLabel?: string
  selectedForMasterpiece?: boolean
  sessionStatus?: PortfolioProcessSessionStatusCode
  updateTime?: string
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

export interface PortfolioProcessSessionListRequest {
  teacherId?: string
  taughtCourseId?: string
  selectedOnly?: boolean
}

export interface PortfolioProcessSessionSaveRequest {
  id?: string
  teacherId?: string
  taughtCourseId: string
  sessionDate: string
  sessionTitle: string
  prepText?: string
  processText?: string
  feedbackText?: string
  linkedArchiveRecordId?: string
  selectedForMasterpiece?: boolean
  sessionStatus?: PortfolioProcessSessionStatusCode
}

export interface PortfolioProcessSessionDeleteRequest {
  id: string
  teacherId?: string
}

export interface PortfolioProcessSessionMasterpieceRequest {
  id: string
  teacherId?: string
  selectedForMasterpiece: boolean
}

export interface PortfolioProcessSessionLinkArchiveRequest {
  id: string
  teacherId?: string
  categoryId: string
  submitForReview: boolean
}

export interface PortfolioProcessSessionLinkArchiveResult {
  recordId: string
  recordStatus?: PortfolioArchiveRecordStatusCode
}

export const portfolioProcessSessionApi = {
  list: (request: PortfolioProcessSessionListRequest) =>
    http.post<PortfolioProcessSessionVO[]>('/api/portfolio/process-session/list', request),
  save: (request: PortfolioProcessSessionSaveRequest) =>
    http.post<string>('/api/portfolio/process-session/save', request),
  delete: (request: PortfolioProcessSessionDeleteRequest) =>
    http.post<void>('/api/portfolio/process-session/delete', request),
  setMasterpiece: (request: PortfolioProcessSessionMasterpieceRequest) =>
    http.post<void>('/api/portfolio/process-session/set-masterpiece', request),
  linkArchive: (request: PortfolioProcessSessionLinkArchiveRequest) =>
    http.post<PortfolioProcessSessionLinkArchiveResult>(
      '/api/portfolio/process-session/link-archive',
      request,
    ),
}
