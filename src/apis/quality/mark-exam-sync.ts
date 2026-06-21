import http from '@/config/axios'

/** edu-mark 考试质量同步状态 */
export type MarkExamQualitySyncStatus = 'NOT_CONFIGURED' | 'NOT_SYNCED' | 'SYNCED'

export const MARK_EXAM_QUALITY_SYNC_STATUS_LABEL: Record<MarkExamQualitySyncStatus, string> = {
  NOT_CONFIGURED: '未配置质量课程',
  NOT_SYNCED: '未同步',
  SYNCED: '已同步',
}

export const MARK_EXAM_QUALITY_SYNC_STATUS_TONE: Record<
  MarkExamQualitySyncStatus,
  'gray' | 'orange' | 'green'
> = {
  NOT_CONFIGURED: 'orange',
  NOT_SYNCED: 'gray',
  SYNCED: 'green',
}

export interface MarkExamSyncStatusRequest {
  examId: string
  courseId: string
  academicYear: string
  semester: string
}

export interface MarkExamSyncStatusVO {
  status: MarkExamQualitySyncStatus
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
