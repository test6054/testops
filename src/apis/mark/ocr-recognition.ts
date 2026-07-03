import type { MarkOcrProviderTypeCode } from './ocr-types'
import type { QuestionTypeCode } from './question-type'
import type { MarkOcrSceneCode } from './ocr-scene'
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'
import { MARK_OCR_SCENE_LABEL } from './ocr-scene'
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
  ocrScene: MarkOcrSceneCode
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
  diagnosticCode?: string
  diagnosticMessage?: string
  preprocessSummary?: string
  ocrScene?: MarkOcrSceneCode
  manualReviewRequired?: boolean
  emptyAnswer?: boolean
}

/** 题目识别结果提交请求 - 对应 ExamRecognitionSubmitRequest */
export interface ExamRecognitionSubmitRequest {
  examId: string
  paperInstanceId: string
  questionTemplateId: string
  responseSliceId: string
  recognizedAnswer?: string
  engineTraceId?: string
  diagnostic?: string
  diagnosticCode?: string
  diagnosticMessage?: string
  preprocessSummary?: string
  ocrScene: MarkOcrSceneCode
  manualReviewRequired: boolean
  emptyAnswer: boolean
}

function validateMarkOcrPaperSliceContract(record: MarkOcrPaperSliceVO): MarkOcrPaperSliceVO {
  assertUserFacingText(record.responseSliceId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.paperInstanceId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.questionTemplateId, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  assertUserFacingText(record.questionNo, MARK_OCR_PAPER_SLICE_DATA_ERROR)
  strictEnumLabel(QUESTION_TYPE_LABEL, record.questionType, '题型')
  strictEnumLabel(MARK_OCR_SCENE_LABEL, record.ocrScene, 'OCR 识别场景')
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

/**
 * 提交题目识别结果并触发客观题判分或主观题 AI 链路
 * POST /api/mark/exams/recognition/submit
 */
export function submitRecognition(request: ExamRecognitionSubmitRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/recognition/submit', request)
}
