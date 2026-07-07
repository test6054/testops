import type { ExamLayoutStatusCode } from '@/apis/mark/exam-layout-status'
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamQuestionStandardAnswerOptionRequest,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import type { MarkOcrSceneCode } from '@/apis/mark/ocr-scene'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type { ExamLayoutDetectTaskStatusCode } from '@/types/enums/exam-layout-detect-task-status-enum'
import http from '@/config/axios'

/** 制卷设计主流程 hint：整卷直接上传源文件，答题卡生成识别版式后保存并预览 */
export const EXAM_LAYOUT_DESIGN_FLOW_HINT = '确定制卷形态 → 整卷上传资料异步识别题单 / 答题卡生成版式 → 核对 ROI 后保存并预览'

export interface ExamLayoutRectNorm {
  x: number
  y: number
  w: number
  h: number
}

export interface ExamLayoutPageDto {
  id: string
  pageNo: number
  backgroundFileId: string
  naturalWidthPx: number
  naturalHeightPx: number
}

export interface ExamLayoutQuestionDto {
  id: string
  questionNo: string
  normalizedQuestionNo?: string
  questionType: QuestionTypeCode
  ocrScene?: MarkOcrSceneCode
  fullScore?: number
  sortNo?: number
  questionStem?: string
  knowledgeId?: string
  answer?: ExamLayoutQuestionAnswerDto
}

export interface ExamLayoutQuestionAnswerDto {
  standardAnswerId?: string
  standardAnswer?: string
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: number
  numericTolerance?: number
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveStatus?: string
  effectiveNow?: boolean
  declaredOptions?: ExamQuestionDeclaredOptionRequest[]
  choiceOptions?: ExamQuestionStandardAnswerOptionRequest[]
}

export interface ExamLayoutBlockDto {
  id: string
  pageNo: number
  blockType: string
  layer?: number
  layoutQuestionId?: string
  identityAreaType?: string
  rectNorm: ExamLayoutRectNorm
  blockPropsJson?: string
}

export interface ExamLayoutBlockOptionDto {
  id: string
  blockId: string
  layoutQuestionId: string
  optionLabel: string
  sortNo: number
  rectNorm: ExamLayoutRectNorm
}

export interface ExamLayoutDocument {
  /** 制卷布局 ID - 对应 ExamLayoutDocument.layoutId */
  layoutId?: string
  examId?: string
  layoutName?: string
  /** 制卷状态 - 对应 ExamLayoutDocument.status */
  status?: ExamLayoutStatusCode
  layoutEntryKind?: string
  totalPages?: number
  paperSpec?: string
  identityNumberMode?: string
  subjectiveAnonymityMode?: string
  sourcePdfFileId?: string
  previewPdfFileId?: string
  watermarkText?: string
  renderDpi?: number
  printSafeMarginMm?: number
  pages: ExamLayoutPageDto[]
  questions: ExamLayoutQuestionDto[]
  blocks: ExamLayoutBlockDto[]
  blockOptions?: ExamLayoutBlockOptionDto[]
}

export interface ExamLayoutDesignLoadResponse {
  document: ExamLayoutDocument | null
  writable: boolean
  writeLockReason?: string
  /** 进行中的自动预划区任务；QUEUED/RUNNING 时有值，刷新后续轮询 */
  activeDetect?: ExamLayoutDetectStatusResponse
  /** 与后端僵死回收阈值同源的轮询 deadline 策略 */
  detectPollingPolicy: ExamLayoutDetectPollingPolicy
}

export interface ExamLayoutDesignLoadRequest {
  examId: string
}

export interface ExamLayoutDesignSaveRequest {
  examId: string
  document: ExamLayoutDocument
}

export interface ExamLayoutDesignPreviewRequest {
  examId: string
  document?: ExamLayoutDocument
}

export interface ExamLayoutPreviewResponse {
  previewPdfFileId?: string
}

export interface ExamLayoutGenerateSheetRequest {
  examId: string
  paperSpec?: string
  identityNumberMode?: string
  questions?: ExamLayoutGenerateQuestionRequest[]
}

export interface ExamLayoutGenerateQuestionRequest {
  questionNo: string
  questionType: 'OBJECTIVE' | 'SUBJECTIVE'
  ocrScene: string
  fullScore: number
  sortNo: number
  optionCount?: number
}

export type { ExamLayoutDetectTaskStatusCode } from '@/types/enums/exam-layout-detect-task-status-enum'

/** 制卷异步识别任务 UUID（32 位十六进制）；与 auto-detect 返回一致，非 exam/layout 等数据库主键 */
export type ExamLayoutDetectTaskId = string

export interface ExamLayoutDetectCancelRequest {
  examId: string
  detectTaskId: ExamLayoutDetectTaskId
}

export interface ExamLayoutAutoDetectRequest {
  examId: string
  sourcePdfFileId: string
}

/** 制卷自动预划区轮询策略；字段须与 ExamLayoutDetectPollingPolicyResponse 一致 */
export interface ExamLayoutDetectPollingPolicy {
  queuedStaleMs: number
  runningStaleMs: number
  clientPollDeadlineMs: number
}

export interface ExamLayoutDetectTaskResponse {
  detectTaskId: ExamLayoutDetectTaskId
  examId: string
  status: ExamLayoutDetectTaskStatusCode
  detectPollingPolicy?: ExamLayoutDetectPollingPolicy
}

export interface ExamLayoutDetectStatusRequest {
  examId: string
  detectTaskId: ExamLayoutDetectTaskId
}

export interface ExamLayoutDetectStatusResponse {
  detectTaskId: ExamLayoutDetectTaskId
  examId: string
  status: ExamLayoutDetectTaskStatusCode
  progressPageNo?: number
  progressTotalPages?: number
  errorMessage?: string
  document?: ExamLayoutDocument
}

export interface ExamLayoutPageUploadMetaRequest {
  backgroundFileId: string
}

export interface ExamLayoutPageUploadMetaResponse {
  naturalWidthPx: number
  naturalHeightPx: number
}

export interface ExamLayoutQuestionRegionAdjustRequest {
  examId: string
  blockId: string
  rectNorm: ExamLayoutRectNorm
}

export function loadExamLayoutDesign(data: ExamLayoutDesignLoadRequest) {
  return http.post<ExamLayoutDesignLoadResponse>('/api/mark/exams/layout-design/load', data)
}

export function saveExamLayoutDesign(data: ExamLayoutDesignSaveRequest) {
  return http.post<ExamLayoutDocument>('/api/mark/exams/layout-design/save', data)
}

export function previewExamLayoutDesign(data: ExamLayoutDesignPreviewRequest) {
  return http.post<ExamLayoutPreviewResponse>('/api/mark/exams/layout-design/preview', data)
}

export function generateExamLayoutSheet(data: ExamLayoutGenerateSheetRequest) {
  return http.post<ExamLayoutDocument>('/api/mark/exams/layout-design/generate-sheet', data)
}

export function autoDetectExamLayout(data: ExamLayoutAutoDetectRequest) {
  return http.post<ExamLayoutDetectTaskResponse>('/api/mark/exams/layout-design/auto-detect', data)
}

export function fetchExamLayoutDetectStatus(data: ExamLayoutDetectStatusRequest) {
  return http.post<ExamLayoutDetectStatusResponse>('/api/mark/exams/layout-design/detect-status', data)
}

export function cancelExamLayoutDetect(data: ExamLayoutDetectCancelRequest) {
  return http.post<ExamLayoutDetectStatusResponse>('/api/mark/exams/layout-design/cancel-detect', data)
}

/** 解析 detect-status 轮询 deadline；优先使用后端下发的 clientPollDeadlineMs。 */
export function resolveExamLayoutDetectPollDeadlineMs(
  policy: ExamLayoutDetectPollingPolicy | null | undefined,
): number | null {
  const deadline = policy?.clientPollDeadlineMs
  if (deadline == null || !Number.isFinite(deadline) || deadline < 60_000) {
    return null
  }
  return deadline
}

export function fetchExamLayoutPageUploadMeta(data: ExamLayoutPageUploadMetaRequest) {
  return http.post<ExamLayoutPageUploadMetaResponse>(
    '/api/mark/exams/layout-design/page-upload-meta',
    data,
  )
}

export function adjustExamLayoutQuestionRegion(data: ExamLayoutQuestionRegionAdjustRequest) {
  return http.post<boolean>('/api/mark/exams/layout-design/question-region/adjust', data)
}
