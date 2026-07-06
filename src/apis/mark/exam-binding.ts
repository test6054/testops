/**
 * 阅卷考试试卷身份绑定 API - 对接 /api/mark/exams/papers/bind。
 */
import http from '@/config/axios'

export {
  ALL_BINDING_STATUS_CODES,
  BindingStatusCode,
  BindingStatusDescription,
} from '@/types/enums/binding-status-enum'

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
