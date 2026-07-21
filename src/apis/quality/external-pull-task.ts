/**
 * 外部数据拔取任务 API - 对接 ExternalPullTaskController
 *
 * 后端路径：/api/quality/external-pull-tasks
 */
import type { ExternalPullFailurePhaseCode, ExternalPullTaskStatusCode } from './types'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { PageResult, QueryDto } from '@/types'
import type { BusinessAnchorCode } from '@/types/enums/business-anchor-code-enum'
import type { ExternalPullFilterOperatorCode } from '@/types/enums/external-pull-filter-operator-enum'
import type { ExternalPullSortDirectionCode } from '@/types/enums/external-pull-sort-direction-enum'
import http from '@/config/axios'

const BASE = '/api/quality/external-pull-tasks'

export interface ExternalPullTaskVO {
  id: string
  tenantId?: string
  sourceId: string
  sourceName?: string
  taskCode: string
  taskName: string
  businessAnchor: BusinessAnchorCode
  businessId: string
  businessLabel?: string
  sourceObjectName: string
  fields?: ExternalPullTaskFieldVO[]
  filters?: ExternalPullTaskFilterVO[]
  sorts?: ExternalPullTaskSortVO[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
  status: ExternalPullTaskStatusCode
  startedTime?: string
  finishedTime?: string
  elapsedMs?: number
  returnRows?: number
  failurePhase?: ExternalPullFailurePhaseCode
  failureReason?: string
  operatorUserId?: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullTaskQueryRequest extends QueryDto {
  sourceId?: string
  status?: ExternalPullTaskStatusCode
  businessAnchor?: BusinessAnchorCode
  businessId?: string
}

export interface ExternalPullTaskFieldVO {
  id?: string
  fieldName: string
  fieldOrder: number
}

export interface ExternalPullTaskFilterVO {
  id?: string
  fieldName: string
  filterOperator: ExternalPullFilterOperatorCode
  filterValue: string
  conditionOrder: number
  valueOrder: number
}

export interface ExternalPullTaskSortVO {
  id?: string
  fieldName: string
  sortDirection: ExternalPullSortDirectionCode
  sortOrder: number
}

export interface ExternalPullTaskFieldRequest {
  fieldName: string
  fieldOrder: number
}

export interface ExternalPullTaskFilterRequest {
  fieldName: string
  filterOperator: ExternalPullFilterOperatorCode
  filterValue: string
  conditionOrder: number
  valueOrder: number
}

export interface ExternalPullTaskSortRequest {
  fieldName: string
  sortDirection: ExternalPullSortDirectionCode
  sortOrder: number
}

export interface ExternalPullTaskSaveRequest {
  id?: string
  sourceId: string
  taskCode: string
  taskName: string
  businessAnchor: BusinessAnchorCode
  businessId: string
  sourceObjectName: string
  fields: ExternalPullTaskFieldRequest[]
  filters?: ExternalPullTaskFilterRequest[]
  sorts?: ExternalPullTaskSortRequest[]
  maxRowCount?: number
  queryTimeoutSeconds?: number
}

export interface ExternalPullTaskCancelRequest {
  id: string
  reason: string
}

export interface ExternalPullTaskClaimRequest {
  id: string
}

export interface ExternalPullTaskCompleteRequest {
  id: string
  elapsedMs: number
  returnRows: number
}

export interface ExternalPullTaskFailRequest {
  id: string
  failureReason: string
  elapsedMs?: number
}

export const externalPullTaskApi = {
  page: (data: ExternalPullTaskQueryRequest, config?: ExtendedAxiosRequestConfig) =>
    http.post<PageResult<ExternalPullTaskVO>>(`${BASE}/page`, data, config),
  detail: (id: string) => http.post<ExternalPullTaskVO>(`${BASE}/detail`, { id }),
  create: (data: ExternalPullTaskSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ExternalPullTaskSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 抢占 PENDING 任务执行权 */
  claim: (data: ExternalPullTaskClaimRequest) => http.post<void>(`${BASE}/claim`, data),
  /** 登记 RUNNING 任务执行完成 */
  complete: (data: ExternalPullTaskCompleteRequest) => http.post<void>(`${BASE}/complete`, data),
  /** 登记 RUNNING 任务执行失败 */
  fail: (data: ExternalPullTaskFailRequest) => http.post<void>(`${BASE}/fail`, data),
  /** 取消未启动 / 进行中的任务 */
  cancel: (data: ExternalPullTaskCancelRequest) => http.post<void>(`${BASE}/cancel`, data),
}
