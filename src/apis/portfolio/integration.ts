import type { PageResult } from '@/types'
import http from '@/config/axios'

export interface PortfolioIntegrationDatasourceVO {
  id: string
  channelCode: string
  pathwayCode: string
  datasourceName: string
  enabled: boolean
  sourcePriority: number
  connectionConfigJson?: string
  lastSyncTime?: string
}

export interface PortfolioIntegrationFieldMappingVO {
  id: string
  datasourceConfigId: string
  sourceFieldCode: string
  targetFieldCode: string
  targetCategoryCode?: string
  dictionaryCode?: string
  enabled: boolean
}

export interface PortfolioIntegrationSyncTaskVO {
  id: string
  datasourceConfigId: string
  channelCode: string
  pathwayCode: string
  taskStatus: string
  triggerType: string
  successCount: number
  failedCount: number
  skippedCount: number
  errorSummary?: string
  startedTime?: string
  finishedTime?: string
}

export interface PortfolioIntegrationHealthChannelVO {
  channelCode: string
  pathwayCode: string
  healthStatus: string
  lastSuccessTime?: string
  lastFailureTime?: string
  slaBreach: boolean
  maturityScore?: string
  sampleSize72h: number
  failureCount72h: number
}

export interface PortfolioIntegrationHealthDashboardVO {
  computedTime: string
  channels: PortfolioIntegrationHealthChannelVO[]
}

export interface PortfolioIdentityUnmatchedVO {
  id: string
  syncTaskId?: string
  channelCode: string
  externalTeacherCode?: string
  externalName?: string
  matchHintsJson?: string
  status: string
  resolvedTeacherId?: string
  resolveRemark?: string
}

export interface PortfolioConflictTicketVO {
  id: string
  syncTaskId?: string
  channelCode: string
  fieldCode: string
  teacherId: string
  externalValue?: string
  localValue?: string
  externalSourcePriority: number
  localSourcePriority: number
  ticketStatus: string
  resolveRemark?: string
}

const BASE = '/api/portfolio/integration'

export const portfolioIntegrationApi = {
  saveDatasource(data: {
    id?: string
    channelCode: string
    pathwayCode: string
    datasourceName: string
    enabled: boolean
    connectionConfigJson?: string
  }) {
    return http.post<number>(`${BASE}/datasource/save`, data)
  },
  pageDatasource(data: {
    pageNum: number
    pageSize: number
    channelCode?: string
    pathwayCode?: string
    enabled?: boolean
  }) {
    return http.post<PageResult<PortfolioIntegrationDatasourceVO>>(`${BASE}/datasource/page`, data)
  },
  saveFieldMapping(data: {
    id?: string
    datasourceConfigId: string
    sourceFieldCode: string
    targetFieldCode: string
    targetCategoryCode?: string
    dictionaryCode?: string
    enabled: boolean
  }) {
    return http.post<number>(`${BASE}/mapping/save`, data)
  },
  listFieldMappings(data: { datasourceConfigId: string }) {
    return http.post<PortfolioIntegrationFieldMappingVO[]>(`${BASE}/mapping/list`, data)
  },
  triggerSync(data: { datasourceConfigId: string }) {
    return http.post<PortfolioIntegrationSyncTaskVO>(`${BASE}/sync/trigger`, data)
  },
  pageSyncLog(data: {
    pageNum: number
    pageSize: number
    channelCode?: string
    taskStatus?: string
  }) {
    return http.post<PageResult<PortfolioIntegrationSyncTaskVO>>(`${BASE}/sync/log/page`, data)
  },
  pageIdentityUnmatched(data: { pageNum: number, pageSize: number, status?: string }) {
    return http.post<PageResult<PortfolioIdentityUnmatchedVO>>(
      `${BASE}/identity/unmatched/page`,
      data,
    )
  },
  pageConflict(data: { pageNum: number, pageSize: number, ticketStatus?: string }) {
    return http.post<PageResult<PortfolioConflictTicketVO>>(`${BASE}/conflict/page`, data)
  },
  resolveConflict(data: { conflictTicketId: string, action: string, resolveRemark?: string }) {
    return http.post<void>(`${BASE}/conflict/resolve`, data)
  },
  resolveIdentityUnmatched(data: {
    identityUnmatchedId: string
    action: string
    resolvedTeacherId?: string
    resolvedTeacherNumber?: string
    resolveRemark?: string
  }) {
    return http.post<void>(`${BASE}/identity/unmatched/resolve`, data)
  },
  healthDashboard() {
    return http.post<PortfolioIntegrationHealthDashboardVO>(`${BASE}/health/dashboard`, {})
  },
}
