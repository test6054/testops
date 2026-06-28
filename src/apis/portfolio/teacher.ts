import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherIdentityType,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import http from '@/config/axios'

export interface PortfolioTeacherOneTableSummaryVO {
  teacherUserId: string
  teacherNumber?: string
  nickName?: string
  departmentName?: string
  title?: string
  identityTags: PortfolioTeacherIdentityType[]
  achievementCount?: number
  honorCount?: number
  correctionPending?: boolean
  recentChangeSummary: string[]
  categories: Array<{
    categoryId: string
    categoryName: string
    recordCount: number
    officialRecordId?: string
  }>
}

export interface PortfolioDeptOneTableSummaryVO {
  departmentId: string
  departmentName?: string
  teacherCount: number
  titleSeniorCount: number
  titleAssociateCount: number
  titleMiddleCount: number
  titleJuniorCount: number
  titleUnclassifiedCount: number
  dualTeacherCount: number
  externalTeacherCount: number
  keyTeacherCount: number
  planYear?: string
  achievementTotalCount?: number
  honorTotalCount?: number
  developmentPlanTotalCount?: number
  developmentPlanApprovedCount?: number
  developmentPlanCompletionRatePercent?: number
}

export interface PortfolioDeptOneTableTeacherRowVO {
  teacherUserId: string
  teacherNumber?: string
  nickName?: string
  title?: string
  titleTier?: string
  dualTeacherApproved?: boolean
  keyTeacherActive?: boolean
  externalTeacher?: boolean
  achievementCount?: number
  honorCount?: number
  planYear?: string
  developmentPlanStatus?: string
  developmentPlanItemCompletionPercent?: string
}

export interface PortfolioDeptStructureStatVO {
  totalTeacherCount: number
  departments: Array<{
    departmentId: string
    departmentName?: string
    teacherCount: number
  }>
}

const BASE = '/api/portfolio/teacher'

export const portfolioTeacherApi = {
  page: (data: PortfolioTeacherPageRequest) =>
    http.post<PageResult<PortfolioTeacherSummaryVO>>(`${BASE}/page`, data),
  get: (id: string) => http.post<PortfolioTeacherDetailVO>(`${BASE}/get`, { id }),
  saveIdentity: (data: PortfolioTeacherIdentitySaveRequest) =>
    http.post<string>(`${BASE}/identity/save`, data),
  getOneTableSummary: (data: { teacherId?: string } = {}) =>
    http.post<PortfolioTeacherOneTableSummaryVO>(`${BASE}/one-table/summary/get`, data),
  exportOneTable: (data: { teacherId?: string } = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/one-table/export`, data),
  exportRoster: (data: PortfolioTeacherPageRequest = { pageNum: 1, pageSize: 5000 }) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/export-roster`, data),
  deptStructureStats: () =>
    http.post<PortfolioDeptStructureStatVO>(`${BASE}/dept-structure/stats`, {}),
  getDeptOneTableSummary: (data: { departmentId: string, planYear?: string }) =>
    http.post<PortfolioDeptOneTableSummaryVO>(`${BASE}/dept-one-table/summary/get`, data),
  exportDeptOneTable: (data: { departmentId: string, planYear?: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/dept-one-table/export`, data),
  pageDeptOneTableTeachers: (data: { departmentId: string, planYear?: string, pageNum?: number, pageSize?: number }) =>
    http.post<PageResult<PortfolioDeptOneTableTeacherRowVO>>(`${BASE}/dept-one-table/teacher/page`, data),
}

export type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
}
