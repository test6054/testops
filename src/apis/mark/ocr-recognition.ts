import type { MarkOcrProviderTypeCode } from './ocr-types'
import type { QuestionTypeCode } from './question-type'
import type { MarkOcrSceneCode } from '@/types/enums/mark-ocr-scene-enum'
import http from '@/config/axios'
import { ALL_MARK_OCR_SCENE_CODES } from '@/types/enums/mark-ocr-scene-enum'
import { ALL_MARK_OCR_PROVIDER_TYPE_CODES } from './ocr-types'
import { ALL_QUESTION_TYPE_CODES } from './question-type'

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
  ocrScene?: MarkOcrSceneCode
  fullScore: number
  pageNo: number
  sortNo?: number
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
  diagnosticCode: string
  diagnosticMessage: string
  preprocessSummary: string
  ocrScene: MarkOcrSceneCode
  manualReviewRequired: boolean
  emptyAnswer: boolean
}

/** 查询所选卷面的正式作答切片，并校验卷面与题目锚点。 */
export async function listMarkOcrPaperSlices(
  request: MarkOcrPaperSliceQueryRequest,
): Promise<MarkOcrPaperSliceVO[]> {
  const response = await http.post<MarkOcrPaperSliceVO[]>('/api/mark/ocr/paper-slices', request)
  if (!Array.isArray(response)) {
    throw new TypeError('文字识别切片合同异常：切片列表不可用')
  }
  const responseSliceIds = new Set<string>()
  const layoutQuestionIds = new Set<string>()
  for (const slice of response) {
    if (
      !slice.responseSliceId
      || responseSliceIds.has(slice.responseSliceId)
      || slice.paperInstanceId !== request.paperInstanceId
      || !slice.layoutQuestionId
      || layoutQuestionIds.has(slice.layoutQuestionId)
      || !slice.questionNo?.trim()
      || !ALL_QUESTION_TYPE_CODES.includes(slice.questionType)
      || (slice.ocrScene != null && !ALL_MARK_OCR_SCENE_CODES.includes(slice.ocrScene))
      || !Number.isFinite(slice.fullScore)
      || slice.fullScore < 0
      || !Number.isInteger(slice.pageNo)
      || slice.pageNo < 1
      || (slice.sortNo != null && !Number.isInteger(slice.sortNo))
      || !slice.sliceFileId
    ) {
      throw new TypeError('文字识别切片合同异常：卷面锚点、题目或切片身份不可用')
    }
    responseSliceIds.add(slice.responseSliceId)
    layoutQuestionIds.add(slice.layoutQuestionId)
  }
  return response
}

/** 执行同步文字识别，并校验可追踪诊断与识别状态合同。 */
export async function recognizeMarkOcr(
  request: MarkOcrRecognizeRequest,
): Promise<MarkOcrRecognizeResponse> {
  const response = await http.post<MarkOcrRecognizeResponse>('/api/mark/ocr/recognize', request)
  if (
    !ALL_MARK_OCR_PROVIDER_TYPE_CODES.includes(response.providerType)
    || typeof response.recognizedText !== 'string'
    || !response.engineTraceId?.trim()
    || !response.diagnostic?.trim()
    || !response.diagnosticCode?.trim()
    || !response.diagnosticMessage?.trim()
    || !response.preprocessSummary?.trim()
    || !ALL_MARK_OCR_SCENE_CODES.includes(response.ocrScene)
    || typeof response.manualReviewRequired !== 'boolean'
    || typeof response.emptyAnswer !== 'boolean'
    || (response.recognizedText.trim().length === 0) !== response.emptyAnswer
  ) {
    throw new TypeError('文字识别结果合同异常：渠道、追踪标识或诊断不可用')
  }
  return response
}
