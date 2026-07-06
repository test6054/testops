import type { MarkOcrProviderTypeCode } from './ocr-types'
import type { QuestionTypeCode } from './question-type'
import http from '@/config/axios'

export interface MarkOcrPaperSliceQueryRequest {
  examId: string
  paperInstanceId: string
}

export interface MarkOcrPaperSliceVO {
  responseSliceId: string
  paperInstanceId: string
  layoutQuestionId: string
  questionNo: string
  questionType: QuestionTypeCode
  ocrScene?: string
  fullScore: number
  pageNo: number
  sortNo: number
  sliceFileId: string
}

export interface MarkOcrRecognizeRequest {
  examId: string
  paperInstanceId: string
  responseSliceId: string
  layoutQuestionId: string
}

export interface MarkOcrRecognizeResponse {
  providerType: MarkOcrProviderTypeCode
  recognizedText: string
  engineTraceId: string
  diagnostic: string
  diagnosticCode?: string
  diagnosticMessage?: string
  preprocessSummary?: string
  ocrScene?: string
  manualReviewRequired?: boolean
  emptyAnswer?: boolean
}

export function listMarkOcrPaperSlices(
  request: MarkOcrPaperSliceQueryRequest,
): Promise<MarkOcrPaperSliceVO[]> {
  return http.post<MarkOcrPaperSliceVO[]>('/api/mark/ocr/paper-slices', request)
}

export function recognizeMarkOcr(request: MarkOcrRecognizeRequest): Promise<MarkOcrRecognizeResponse> {
  return http.post<MarkOcrRecognizeResponse>('/api/mark/ocr/recognize', request)
}

export interface ExamRecognitionSubmitRequest {
  examId: string
  paperInstanceId: string
  layoutQuestionId: string
  responseSliceId: string
  recognizedAnswer?: string
  engineTraceId?: string
  diagnostic?: string
  diagnosticCode?: string
  diagnosticMessage?: string
  preprocessSummary?: string
  ocrScene: string
  manualReviewRequired: boolean
  emptyAnswer: boolean
}

/** POST /api/mark/exams/recognition/submit */
export function submitRecognition(request: ExamRecognitionSubmitRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/recognition/submit', request)
}
