import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

export interface ScannerCenterOverviewResponse {
  failedTicketCount?: number
  failedWorkOrderCount?: number
  mixedBatchCount?: number
  pageRegisterBlockedCount?: number
  committingWorkOrderCount?: number
  pendingDispatchCount?: number
  processingDispatchCount?: number
  suspendedDispatchCount?: number
}

export function loadScannerCenterOverview() {
  return http.post<ScannerCenterOverviewResponse>('/api/mark/scanner/center/overview', {})
}

export interface AiAnalysisCenterOverviewRequest {
  academicYear: string
  semester: SemesterCode
  courseId?: string
  classId?: string
  referenceDepartmentId?: string
  examId?: string
}

export interface AiAnalysisCenterOverviewResponse {
  scopedExamCount?: number
  scopedCourseCount?: number
  examSelected?: boolean
  selectedExamName?: string
}

export function loadAiAnalysisCenterOverview(request: AiAnalysisCenterOverviewRequest) {
  return http.post<AiAnalysisCenterOverviewResponse>(
    '/api/exam/ai-analysis-center/overview',
    request,
  )
}
