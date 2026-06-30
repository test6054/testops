import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

/** 一体机 Agent 发布包分页查询 - 对应 ScannerAgentReleaseQueryRequest */
export interface ScannerAgentReleaseQueryRequest extends QueryDto {
  keyword?: string
}

/** 一体机 Agent 发布包注册 - 对应 ScannerAgentReleaseCreateRequest */
export interface ScannerAgentReleaseCreateRequest {
  version: string
  fileId: string
  releaseNotes?: string
}

/** 一体机 Agent 发布包发布 - 对应 ScannerAgentReleasePublishRequest */
export interface ScannerAgentReleasePublishRequest {
  releaseId: string
  pushEnabled: boolean
}

/** 一体机 Agent 发布包删除 - 对应 ScannerAgentReleaseDeleteRequest */
export interface ScannerAgentReleaseDeleteRequest {
  releaseId: string
}

/** 一体机 Agent 发布包 - 对应 ScannerAgentReleaseResponse */
export interface ScannerAgentReleaseVO {
  id: string
  version: string
  fileId: string
  fileTenantId?: string
  fileName: string
  fileSize?: number
  sha256?: string
  releaseNotes?: string
  published?: boolean
  publishTime?: string
  pushEnabled?: boolean
  pushScheduledTime?: string
  pushActivatedTime?: string
  createTime?: string
}

/** POST /api/mark/scanner-agent/releases/list */
export function pageScannerAgentReleases(
  request: ScannerAgentReleaseQueryRequest,
): Promise<PageResult<ScannerAgentReleaseVO>> {
  return http.post<PageResult<ScannerAgentReleaseVO>>('/api/mark/scanner-agent/releases/list', request)
}

/** POST /api/mark/scanner-agent/releases/register */
export function registerScannerAgentRelease(
  request: ScannerAgentReleaseCreateRequest,
): Promise<ScannerAgentReleaseVO> {
  return http.post<ScannerAgentReleaseVO>('/api/mark/scanner-agent/releases/register', request)
}

/** POST /api/mark/scanner-agent/releases/publish */
export function publishScannerAgentRelease(
  request: ScannerAgentReleasePublishRequest,
): Promise<ScannerAgentReleaseVO> {
  return http.post<ScannerAgentReleaseVO>('/api/mark/scanner-agent/releases/publish', request)
}

/** POST /api/mark/scanner-agent/releases/delete */
export function deleteScannerAgentRelease(
  request: ScannerAgentReleaseDeleteRequest,
): Promise<boolean> {
  return http.post<boolean>('/api/mark/scanner-agent/releases/delete', request)
}
