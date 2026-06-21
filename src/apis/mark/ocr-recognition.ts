import type { MarkOcrProviderTypeCode } from './ocr-types'
import http from '@/config/axios'

export interface MarkOcrRecognizeRequest {
  examId: string
  paperInstanceId: string
  questionTemplateId: string
}

export interface MarkOcrRecognizeVO {
  providerType: MarkOcrProviderTypeCode
  recognizedText: string
  engineTraceId: string
  diagnostic: string
}

export function recognizeMarkOcr(request: MarkOcrRecognizeRequest): Promise<MarkOcrRecognizeVO> {
  return http.post<MarkOcrRecognizeVO>('/api/mark/ocr/recognize', request)
}
