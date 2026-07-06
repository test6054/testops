import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherIdentityTypeCode,
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
  identityTags: PortfolioTeacherIdentityTypeCode[]
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
  developmentPlanItemCompletionPercent?: number
}

export interface PortfolioDeptStructureStatVO {
  totalTeacherCount: number
  departments: Array<{
    departmentId: string
    departmentName?: string
    teacherCount: number
  }>
}

export interface PortfolioTeacherOneTableGetRequest {
  teacherId?: string
}

export interface PortfolioDeptOneTableGetRequest {
  departmentId: string
  planYear?: string
}

export interface PortfolioDeptOneTableExportRequest {
  departmentId: string
  planYear?: string
}

export interface PortfolioDeptOneTableTeacherPageRequest extends PortfolioDeptOneTableGetRequest {
  pageNum?: number
  pageSize?: number
}

const BASE = '/api/portfolio/teacher'

export const portfolioTeacherApi = {
  page: (data: PortfolioTeacherPageRequest) =>
    http.post<PageResult<PortfolioTeacherSummaryVO>>(`${BASE}/page`, data),
  get: (id: string) => http.post<PortfolioTeacherDetailVO>(`${BASE}/get`, { id }),
  saveIdentity: (data: PortfolioTeacherIdentitySaveRequest) =>
    http.post<string>(`${BASE}/identity/save`, data),
  getOneTableSummary: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioTeacherOneTableSummaryVO>(`${BASE}/one-table/summary/get`, data),
  exportOneTable: (data: PortfolioTeacherOneTableGetRequest = {}) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/one-table/export`, data),
  exportRoster: (data: PortfolioTeacherPageRequest = { pageNum: 1, pageSize: 5000 }) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/export-roster`, data),
  deptStructureStats: () =>
    http.post<PortfolioDeptStructureStatVO>(`${BASE}/dept-structure/stats`, {}),
  getDeptOneTableSummary: (data: PortfolioDeptOneTableGetRequest) =>
    http.post<PortfolioDeptOneTableSummaryVO>(`${BASE}/dept-one-table/summary/get`, data),
  exportDeptOneTable: (data: PortfolioDeptOneTableExportRequest) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/dept-one-table/export`, data),
  pageDeptOneTableTeachers: (data: PortfolioDeptOneTableTeacherPageRequest) =>
    http.post<PageResult<PortfolioDeptOneTableTeacherRowVO>>(
      `${BASE}/dept-one-table/teacher/page`,
      data,
    ),
}

export type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
}
