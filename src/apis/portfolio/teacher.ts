import type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { PageResult } from '@/types'
import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import http from '@/config/axios'

export interface PortfolioTeacherOneTableSummaryVO {
  teacherUserId: string
  teacherNumber?: string
  nickName?: string
  departmentName?: string
  title?: string
  identityTags: string[]
  achievementCount?: number
  honorCount?: number
  categories: Array<{
    categoryId: string
    categoryName: string
    recordCount: number
    officialRecordId?: string
  }>
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
  exportRoster: (data: PortfolioTeacherPageRequest = { pageNum: 1, pageSize: 5000 }) =>
    http.post<PortfolioArchiveBagExportResultVO>(`${BASE}/export-roster`, data),
  deptStructureStats: () =>
    http.post<PortfolioDeptStructureStatVO>(`${BASE}/dept-structure/stats`, {}),
}

export type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
}
