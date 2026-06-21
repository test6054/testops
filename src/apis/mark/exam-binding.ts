/**
 * 阅卷考试试卷身份绑定 API - 对接 /api/mark/exams/papers/bind。
 */
import http from '@/config/axios'

/** 试卷绑定状态编码 - 与后端 BindingStatus 枚举完全一致 */
export type BindingStatusCode = 'UNBOUND' | 'BOUND' | 'CONFLICT' | 'DISCARDED'

/** 试卷绑定状态文案 - 与后端 BindingStatus.message 完全一致 */
export const BINDING_STATUS_LABEL: Record<BindingStatusCode, string> = {
  UNBOUND: '未绑定',
  BOUND: '已绑定',
  CONFLICT: '冲突',
  DISCARDED: '已废弃',
}

/** 试卷身份绑定请求 - 对应 ExamPaperBindRequest */
export interface ExamPaperBindRequest {
  examId: string
  scanBatchId: string
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus: 'NORMAL' | 'MAKEUP' | 'RETAKE'
  attemptNo?: string
}

/** 确认试卷和考生身份绑定关系。 */
export function bindPaper(request: ExamPaperBindRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/papers/bind', request)
}
