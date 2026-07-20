import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

export interface PortfolioVirtualTeachingRoomActivityVO {
  id: string
  teacherUserId: string
  roomName: string
  leadUnit?: string
  partnerEnterprise?: string
  majorGroupCode?: string
  majorGroupName?: string
  courseCodes?: string
  activityType: string
  activityTypeLabel?: string
  activityTitle: string
  roleCode: string
  roleLabel?: string
  resultFactor?: number
  applicationFactor?: number
  reviewStatus: string
  reviewStatusLabel?: string
  activityDate?: string
  academicYear?: string
  evidenceNote?: string
  fileId?: string
  createTime?: string
  updateTime?: string
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

export interface PortfolioVirtualTeachingRoomActivitySaveRequest {
  id?: string
  teacherUserId: string
  roomName: string
  leadUnit?: string
  partnerEnterprise?: string
  majorGroupCode?: string
  majorGroupName?: string
  courseCodes?: string
  activityType: string
  activityTitle: string
  roleCode: string
  resultFactor?: number
  applicationFactor?: number
  reviewStatus?: string
  activityDate?: string
  academicYear?: string
  evidenceNote?: string
  fileId?: string
}

export interface PortfolioVirtualTeachingRoomActivityPageRequest extends QueryDto {
  teacherUserId?: string
  reviewStatus?: string
  searchText?: string
}

export interface PortfolioIndustryEducationProjectVO {
  id: string
  teacherUserId: string
  projectName: string
  projectType: string
  projectTypeLabel?: string
  stageCode: string
  enterpriseName?: string
  majorGroupCode?: string
  majorGroupName?: string
  roleCode: string
  roleFactor?: number
  stageFactor?: number
  talentOutcomeFactor?: number
  enterpriseFactor?: number
  reviewStatus: string
  reviewStatusLabel?: string
  academicYear?: string
  evidenceNote?: string
  fileId?: string
  createTime?: string
  updateTime?: string
  /** US-MI-01 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  ownerMultiIdentityNote?: string

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

export interface PortfolioIndustryEducationProjectSaveRequest {
  id?: string
  teacherUserId: string
  projectName: string
  projectType: string
  stageCode: string
  enterpriseName?: string
  majorGroupCode?: string
  majorGroupName?: string
  roleCode: string
  roleFactor?: number
  stageFactor?: number
  talentOutcomeFactor?: number
  enterpriseFactor?: number
  reviewStatus?: string
  academicYear?: string
  evidenceNote?: string
  fileId?: string
}

export interface PortfolioIndustryEducationProjectPageRequest extends QueryDto {
  teacherUserId?: string
  reviewStatus?: string
  projectType?: string
  searchText?: string
}

export const portfolioVirtualTeachingRoomActivityApi = {
  page: (data: PortfolioVirtualTeachingRoomActivityPageRequest) =>
    http.post<PageResult<PortfolioVirtualTeachingRoomActivityVO>>(
      '/api/portfolio/virtual-teaching-room-activity/page',
      data,
    ),
  get: (data: { id: string }) =>
    http.post<PortfolioVirtualTeachingRoomActivityVO>(
      '/api/portfolio/virtual-teaching-room-activity/get',
      data,
    ),
  save: (data: PortfolioVirtualTeachingRoomActivitySaveRequest) =>
    http.post<string>('/api/portfolio/virtual-teaching-room-activity/save', data),
  delete: (data: { id: string }) =>
    http.post<void>('/api/portfolio/virtual-teaching-room-activity/delete', data),
}

export const portfolioIndustryEducationProjectApi = {
  page: (data: PortfolioIndustryEducationProjectPageRequest) =>
    http.post<PageResult<PortfolioIndustryEducationProjectVO>>(
      '/api/portfolio/industry-education-project/page',
      data,
    ),
  get: (data: { id: string }) =>
    http.post<PortfolioIndustryEducationProjectVO>(
      '/api/portfolio/industry-education-project/get',
      data,
    ),
  save: (data: PortfolioIndustryEducationProjectSaveRequest) =>
    http.post<string>('/api/portfolio/industry-education-project/save', data),
  delete: (data: { id: string }) =>
    http.post<void>('/api/portfolio/industry-education-project/delete', data),
}
