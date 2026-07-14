import type { PortfolioArchiveBagExportResultVO } from '@/apis/portfolio/bag-types'
import type { PageResult, QueryDto } from '@/types'
import type { PortfolioReportingScopeTypeCode } from '@/types/enums/portfolio-reporting-scope-type-enum'
import type { PortfolioReportingTaskStatusCode } from '@/types/enums/portfolio-reporting-task-status-enum'
import http from '@/config/axios'

export interface PortfolioReportingTaskVO {
  id: string
  taskTitle: string
  reportPurpose: string
  shareFields: string[]
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
  shareFields: string[]
  maskMode: boolean
  dataScopeNote: string
}

export interface PortfolioReportingTaskCreateRequest {
  taskTitle: string
  reportPurpose: string
  shareFields: string[]
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
  get: (data: { id: string }) =>
    http.post<PortfolioReportingTaskVO>('/api/portfolio/reporting/task/get', data),
}
