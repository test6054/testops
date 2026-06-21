/**
 * 外部数据拔取任务 API - 对接 ExternalPullTaskController
 *
 * 后端路径：/api/quality/external-pull-tasks
 */
import type { ExternalPullTaskStatus } from './types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/external-pull-tasks'

export interface ExternalPullTaskVO {
  id: string
  tenantId?: string
  sourceId: string
  sourceName: string
  taskCode: string
  taskName: string
  businessAnchor: string
  businessId: string
  businessLabel: string
  sourceObjectName: string
  fields: ExternalPullTaskField[]
  filters?: ExternalPullTaskFilter[]
  sorts?: ExternalPullTaskSort[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
  status: ExternalPullTaskStatus
  startedAt?: string
  finishedAt?: string
  elapsedMs?: number
  returnRows?: number
  failureReason?: string
  operatorUserId?: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullTaskQueryRequest extends QueryDto {
  sourceId?: string
  status?: ExternalPullTaskStatus
  businessAnchor?: string
  businessId?: string
}

export type ExternalPullFilterOperator = 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'LIKE' | 'IN'
export type ExternalPullSortDirection = 'ASC' | 'DESC'

export interface ExternalPullTaskField {
  id?: string
  fieldName: string
  fieldOrder: number
}

export interface ExternalPullTaskFilter {
  id?: string
  fieldName: string
  filterOperator: ExternalPullFilterOperator
  filterValue: string
  conditionOrder: number
  valueOrder: number
}

export interface ExternalPullTaskSort {
  id?: string
  fieldName: string
  sortDirection: ExternalPullSortDirection
  sortOrder: number
}

export interface ExternalPullTaskSaveRequest {
  id?: string
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor: string
  businessId: string
  sourceObjectName: string
  fields: ExternalPullTaskField[]
  filters?: ExternalPullTaskFilter[]
  sorts?: ExternalPullTaskSort[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
}

export const externalPullTaskApi = {
  page: (data: ExternalPullTaskQueryRequest) =>
    http.post<PageResult<ExternalPullTaskVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ExternalPullTaskVO>(`${BASE}/detail`, { id }),
  create: (data: ExternalPullTaskSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ExternalPullTaskSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 取消未启动 / 进行中的任务 */
  cancel: (id: string, reason?: string) => http.post<void>(`${BASE}/cancel`, { id, reason }),
}
