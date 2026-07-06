import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  MarkExamQualitySyncStatusCode,
} from '@/types/enums/mark-exam-quality-sync-status-enum'

export {
  ALL_MARK_EXAM_QUALITY_SYNC_STATUS_CODES,
  MarkExamQualitySyncStatusCode,
  MarkExamQualitySyncStatusDescription,
} from '@/types/enums/mark-exam-quality-sync-status-enum'

export const MARK_EXAM_QUALITY_SYNC_STATUS_TONE: Record<
  MarkExamQualitySyncStatusCode,
  'gray' | 'orange' | 'green'
> = {
  [MarkExamQualitySyncStatusCode.NOT_CONFIGURED]: 'orange',
  [MarkExamQualitySyncStatusCode.NOT_SYNCED]: 'gray',
  [MarkExamQualitySyncStatusCode.SYNCED]: 'green',
}

export interface MarkExamSyncStatusRequest {
  examId: string
  courseId: string
  academicYear: string
  semester: SemesterCode
}

export interface MarkExamSyncStatusVO {
  status: MarkExamQualitySyncStatusCode
  examId?: string
  qualityCourseId?: string
  trainingPlanId?: string
  assessmentItemId?: string
  scoreBatchId?: string
  syncedRecordCount?: number
  message?: string
}

export const markExamSyncApi = {
  status: (data: MarkExamSyncStatusRequest) =>
    http.post<MarkExamSyncStatusVO>('/api/quality/mark-exam-sync/status', data),
}
