import type { QueryDto } from '@/types'
import http from '@/config/axios'

/** 扫描室运营看板查询请求，对应后端 ScannerOpsDashboardQueryRequest */
export interface ScannerOpsDashboardQueryRequest extends QueryDto {
  startTime?: string
  endTime?: string
  departmentIds?: string[]
}

/** 院系扫描时效条目，对应后端 ScannerOpsDeptTimingVO */
export interface ScannerOpsDeptTimingVO {
  departmentId?: string
  departmentName?: string
  workOrderCount?: number
  avgScanDurationSeconds?: number
}

/** 扫描室运营看板聚合 VO，对应后端 ScannerOpsDashboardVO */
export interface ScannerOpsDashboardVO {
  totalWorkOrders?: number
  totalPages?: number
  failedWorkOrders?: number
  failureRate?: number
  mixedRate?: number
  deptTimings?: ScannerOpsDeptTimingVO[]
}

export function loadScannerOpsDashboard(request: ScannerOpsDashboardQueryRequest) {
  return http.post<ScannerOpsDashboardVO>('/api/mark/scanner/ops/dashboard/query', request)
}
