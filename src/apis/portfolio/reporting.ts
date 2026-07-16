import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioReportingScopeTypeCode } from '@/types/enums/portfolio-reporting-scope-type-enum'
import type { PortfolioReportingTaskStatusCode } from '@/types/enums/portfolio-reporting-task-status-enum'
import http from '@/config/axios'

export const PortfolioReportingShareFieldCode = {
  TEACHER_LABEL: 'teacherLabel',
  TEACHER_USER_ID: 'teacherUserId',
  TEACHER_NUMBER: 'teacherNumber',
  OFFICIAL_ARCHIVE_COUNT: 'officialArchiveCount',
} as const

export type PortfolioReportingShareFieldCodeValue
  = (typeof PortfolioReportingShareFieldCode)[keyof typeof PortfolioReportingShareFieldCode]

export const PortfolioReportingShareFieldDescription: Record<
  PortfolioReportingShareFieldCodeValue,
  string
> = {
  [PortfolioReportingShareFieldCode.TEACHER_LABEL]: '教师标识',
  [PortfolioReportingShareFieldCode.TEACHER_USER_ID]: '教师用户编号',
  [PortfolioReportingShareFieldCode.TEACHER_NUMBER]: '工号',
  [PortfolioReportingShareFieldCode.OFFICIAL_ARCHIVE_COUNT]: '正式档案数',
}

export const ALL_PORTFOLIO_REPORTING_SHARE_FIELD_CODES = Object.values(
  PortfolioReportingShareFieldCode,
)

export interface PortfolioReportingTaskVO {
  id: string
  taskTitle: string
  reportPurpose: string
  shareFields: PortfolioReportingShareFieldCodeValue[]
  scopeType: PortfolioReportingScopeTypeCode
  departmentId?: string
  maskMode: boolean
  taskStatus: PortfolioReportingTaskStatusCode
  previewJson?: string
  artifactFileNodeId?: string
  artifactFileName?: string
  approveUser?: string
  submitUser?: string
  approveTime?: string
  submitTime?: string
  rejectReason?: string
  createTime?: string
}

export interface PortfolioReportingPreviewVO {
  taskId: string
  teacherCount: number
  officialArchiveCount: number
  shareFields: PortfolioReportingShareFieldCodeValue[]
  maskMode: boolean
  dataScopeNote: string
}

export interface PortfolioReportingTaskCreateRequest {
  taskTitle: string
  reportPurpose: string
  shareFields: PortfolioReportingShareFieldCodeValue[]
  scopeType: PortfolioReportingScopeTypeCode
  departmentId?: string
  maskMode?: boolean
}

export interface PortfolioReportingTaskPageRequest extends QueryDto {
  taskStatus?: PortfolioReportingTaskStatusCode
}

export const portfolioReportingApi = {
  create: (data: PortfolioReportingTaskCreateRequest) =>
    http.post<PortfolioReportingTaskVO>('/api/portfolio/reporting/task/create', data),
  preview: (data: { id: string }) =>
    http.post<PortfolioReportingPreviewVO>('/api/portfolio/reporting/preview', data),
  requestApproval: (data: { id: string }) =>
    http.post<PortfolioReportingTaskVO>('/api/portfolio/reporting/request-approval', data),
  approve: (data: { id: string }) =>
    http.post<PortfolioReportingTaskVO>('/api/portfolio/reporting/approve', data),
  reject: (data: { id: string, rejectReason: string }) =>
    http.post<PortfolioReportingTaskVO>('/api/portfolio/reporting/reject', data),
  download: (data: { id: string }) =>
    http.post<PortfolioArchiveBagExportResultVO>('/api/portfolio/reporting/download', data),
  page: (data: PortfolioReportingTaskPageRequest) =>
    http.post<PageResult<PortfolioReportingTaskVO>>('/api/portfolio/reporting/task/page', data),
}
