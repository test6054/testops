/**
 * 外部数据拔取结果批次 API - 对接 ExternalPullResultController
 *
 * 后端路径：/api/quality/external-pull-results
 * 关键：「确认 / 驳回」流程是对拔取结果批次操作，不是对任务操作。
 */
import type { ExternalPullConfirmationStatus } from './types'
import http from '@/config/axios'

const BASE = '/api/quality/external-pull-results'

export interface ExternalPullResultVO {
  id: string
  tenantId?: string
  pullTaskId: string
  businessAnchor: string
  businessId: string
  businessLabel: string
  previewRows?: number
  confirmedRows?: number
  confirmationStatus: ExternalPullConfirmationStatus
  confirmedUserId?: string
  confirmedTime?: string
  resultFileNodeId?: string
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface ExternalPullResultConfirmRequest {
  id: string
  confirmedRows: number
  notes?: string
}

export interface ExternalPullResultRejectRequest {
  id: string
  notes: string
}

export const externalPullResultApi = {
  listByTask: (pullTaskId: string) =>
    http.post<ExternalPullResultVO[]>(`${BASE}/list-by-task`, { id: pullTaskId }),
  detail: (id: string) => http.post<ExternalPullResultVO>(`${BASE}/detail`, { id }),
  /** 确认结果批次：PREVIEW -> CONFIRMED */
  confirm: (data: ExternalPullResultConfirmRequest) => http.post<void>(`${BASE}/confirm`, data),
  /** 驳回结果批次：PREVIEW -> REJECTED */
  reject: (data: ExternalPullResultRejectRequest) => http.post<void>(`${BASE}/reject`, data),
}
