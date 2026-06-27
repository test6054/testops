import type { MarkOcrProviderTypeCode } from './ocr-types'
import type {QuestionTypeCode} from './question-type';
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'
import { QUESTION_TYPE_LABEL } from './question-type'

const MARK_OCR_PAPER_SLICE_DATA_ERROR = 'OCR 调试切片数据异常，请刷新后重试'

export interface MarkOcrPaperSliceQueryRequest {
  examId: string
  paperInstanceId: string
}

export interface MarkOcrPaperSliceVO {
  responseSliceId: string
  paperInstanceId: string
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  pageNo: number
  sortNo: number
  sliceFileId: string
}

export interface MarkOcrRecognizeRequest {
  examId: string
  paperInstanceId: string
  responseSliceId: string
  questionTemplateId: string
}

export interface MarkOcrRecognizeVO {
  providerType: MarkOcrProviderTypeCode
  recognizedText: string
  engineTraceId: string
  diagnostic: string
}

function validateMarkOcrPaperSliceContract(record: MarkOcrPaperSliceVO): MarkOcrPaperSliceVO {
  assertUserFacingText(record.responseSliceId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.paperInstanceId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.questionTemplateId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.questionNo, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  assertUserFacingFiniteNumber(record.fullScore, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.pageNo, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingFiniteNumber(record.sortNo, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.sliceFileId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  return record
}

export async function listMarkOcrPaperSlices(
  request: MarkOcrPaperSliceQueryRequest,
): Promise<MarkOcrPaperSliceVO[]> {
  const records = await http.post<MarkOcrPaperSliceVO[]>('/api/mark/ocr/paper-slices', request)
  if (!Array.isArray(records)) {
    throw new TypeError(MARK_OCR_PAPER_SLICE_DATA_ERROR)
  }
  return records.map(validateMarkOcrPaperSliceContract)
}

export function recognizeMarkOcr(request: MarkOcrRecognizeRequest): Promise<MarkOcrRecognizeVO> {
  return http.post<MarkOcrRecognizeVO>('/api/mark/ocr/recognize', request)
}
