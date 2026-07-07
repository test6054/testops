import http from '@/config/axios'

/** 考后归档包创建请求 */
export interface ArchiveCreateRequest {
  examId: string
  archiveTitle?: string
  retentionYears?: number
  permanentRetention?: boolean
  includeOriginalScans?: boolean
  includeMarkedSlices?: boolean
  includeAnswerBooklet?: boolean
}

/** 考后归档包创建响应 */
export interface ArchivePackageCreateResponse {
  archivePackageId: string
  reusedExistingDraft?: boolean
}

/** 教师手工创建考后归档包并入队打包 */
export function createExamArchivePackage(
  request: ArchiveCreateRequest,
): Promise<ArchivePackageCreateResponse> {
  return http.post<ArchivePackageCreateResponse>('/api/mark/exam-archives/package/create', request)
}

/** 重新入队考后归档打包 */
export function retryExamArchivePackaging(examId: string): Promise<void> {
  return http.post<void>('/api/mark/exam-archives/package/retry-packaging', { examId })
}
