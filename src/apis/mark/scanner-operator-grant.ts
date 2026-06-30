import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

/** 扫描员校区+院系授权保存请求 */
export interface ScannerOperatorGrantSaveRequest {
  /** 授权主键；更新时必填 */
  grantId?: string
  /** 扫描员用户 ID */
  userId: string
  /** 校区 ID */
  campusId: string
  /** 院系 ID */
  departmentId: string
}

/** 扫描员授权分页查询 */
export interface ScannerOperatorGrantListRequest extends QueryDto {
  userId?: string
  campusId?: string
  departmentId?: string
}

/** 扫描员授权列表项 */
export interface ScannerOperatorGrantItemResponse {
  grantId: string
  userId: string
  campusId: string
  departmentId: string
  createTime?: string
  updateTime?: string
}

/** POST /api/mark/scanner/operator-grant/save */
export function saveScannerOperatorGrant(
  request: ScannerOperatorGrantSaveRequest,
): Promise<ScannerOperatorGrantItemResponse> {
  return http.post<ScannerOperatorGrantItemResponse>(
    '/api/mark/scanner/operator-grant/save',
    request,
  )
}

/** POST /api/mark/scanner/operator-grant/list */
export function pageScannerOperatorGrants(
  request: ScannerOperatorGrantListRequest,
): Promise<PageResult<ScannerOperatorGrantItemResponse>> {
  return http.post<PageResult<ScannerOperatorGrantItemResponse>>(
    '/api/mark/scanner/operator-grant/list',
    request,
  )
}

/** POST /api/mark/scanner/operator-grant/delete */
export function deleteScannerOperatorGrant(grantId: string): Promise<boolean> {
  return http.post<boolean>('/api/mark/scanner/operator-grant/delete', { grantId })
}
