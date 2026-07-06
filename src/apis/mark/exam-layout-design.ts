import type { ExamLayoutStatusCode } from '@/apis/mark/exam-layout-status'
import http from '@/config/axios'

/** 制卷设计主流程 hint：形态确定后生成或导入底图，划区编排后保存并预览 */
export const EXAM_LAYOUT_DESIGN_FLOW_HINT = '确定制卷形态 → 生成或导入底图 → 划区编排 → 保存并预览'

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
  questionType: string
  ocrScene?: string
  fullScore?: number
  sortNo?: number
  questionStem?: string
  knowledgeId?: string
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

export interface ExamLayoutAutoDetectRequest {
  examId: string
  sourcePdfFileId: string
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
  return http.post<ExamLayoutDocument>('/api/mark/exams/layout-design/auto-detect', data)
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
