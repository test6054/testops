/**
 * 阅卷考试试卷身份绑定 API - 对接 /api/mark/exams/papers/bind。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { AttemptStatusCode } from '@/types/enums/attempt-status-enum'
import http from '@/config/axios'
import { BindingStatusCode } from '@/types/enums/binding-status-enum'

export {
  ALL_BINDING_STATUS_CODES,
  BindingStatusCode,
  BindingStatusDescription,
} from '@/types/enums/binding-status-enum'

export const BINDING_STATUS_TONE: Record<BindingStatusCode, BadgeTone> = {
  [BindingStatusCode.UNBOUND]: 'orange',
  [BindingStatusCode.BOUND]: 'green',
  [BindingStatusCode.CONFLICT]: 'red',
  [BindingStatusCode.DISCARDED]: 'gray',
}

/** 试卷身份绑定请求 - 对应 ExamPaperBindRequest */
export interface ExamPaperBindRequest {
  examId: string
  scanBatchId: string
  paperInstanceId: string
  /** 工作台 Inspector 人工绑定时传当前扫描页 ID */
  pageId?: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId: string
  attemptStatus: AttemptStatusCode
  attemptNo?: string
}

/** 确认试卷和考生身份绑定关系。 */
export function bindPaper(request: ExamPaperBindRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/papers/bind', request)
}

/** 扫描现场创建或复用学生、补入考试名册并立即绑定当前答卷。 */
export interface ExamPaperCreateCandidateBindRequest {
  examId: string
  scanBatchId: string
  paperInstanceId: string
  pageId: string
  studentNo: string
  studentName: string
  classId: string
  attemptStatus: AttemptStatusCode
  attemptNo?: string
}

export interface ExamPaperCreateCandidateBindResponse {
  candidateRosterId: string
  studentUserId: string
  createdStudentUser: boolean
  createdRosterRow: boolean
  bound: boolean
}

export function createCandidateAndBindPaper(
  request: ExamPaperCreateCandidateBindRequest,
): Promise<ExamPaperCreateCandidateBindResponse> {
  return http.post<ExamPaperCreateCandidateBindResponse>(
    '/api/mark/exams/papers/create-candidate-and-bind',
    request,
  )
}
