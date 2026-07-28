import type { ExamLayoutStatusCode } from '@/apis/mark/exam-layout-status'
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamQuestionStandardAnswerOptionRequest,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import type { MarkOcrSceneCode } from '@/apis/mark/ocr-scene'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type { AnonymityModeCode } from '@/types/enums/anonymity-mode-enum'
import type { AnswerBookletSourceModeCode } from '@/types/enums/answer-booklet-source-mode-enum'
import type { EffectiveStatusCode } from '@/types/enums/effective-status-enum'
import type { ExamLayoutBlockTypeCode } from '@/types/enums/exam-layout-block-type-enum'
import type { ExamLayoutDetectTaskStatusCode } from '@/types/enums/exam-layout-detect-task-status-enum'
import type { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import type { ExamLayoutPaperSpecCode } from '@/types/enums/exam-layout-paper-spec-enum'
import type { ExamPaperPageKindCode } from '@/types/enums/exam-paper-page-kind-enum'
import type { ExamPrintSheetSideCode } from '@/types/enums/exam-print-sheet-side-enum'
import type { PaperMasterIdentityAreaTypeCode } from '@/types/enums/paper-master-identity-area-type-enum'
import http from '@/config/axios'

/** 制卷设计主流程 hint：单独试卷上传源文件；组合卷以命题治理 A 卷识别结果生成答题纸 */
export const EXAM_LAYOUT_DESIGN_FLOW_HINT = '确定制卷形态 → 识别试卷题目与页型 → 核对题号/题型/ROI → 生成答题纸 → 保存统一物理页序并预览'

export interface ExamLayoutRectNorm {
  x: number
  y: number
  w: number
  h: number
}

export interface ExamLayoutPageDto {
  /** 页数据库自增主键；未落库草稿不分配主键。 */
  id?: string
  pageNo: number
  pageKind?: ExamPaperPageKindCode
  artifactPageNo?: number
  printSheetNo?: number
  printSide?: ExamPrintSheetSideCode
  logicalPageFrom?: number
  logicalPageTo?: number
  scanRequired?: boolean
  backgroundFileId: string
  naturalWidthPx: number
  naturalHeightPx: number
}

export interface ExamLayoutQuestionDto {
  /** 题目数据库自增主键；负值仅作为同一草稿内题目与 ROI 的关联序号，不会写入主键列。 */
  id: string
  questionNo: string
  /** 直扫纸面的原始题号；分节重号时与全局题号不同。 */
  printedQuestionNo?: string
  normalizedQuestionNo?: string
  /** 分节标签（一/二/三）；各大题内小题重号作用域。 */
  sectionLabel?: string
  /** 大题标题原文摘要。 */
  sectionTitle?: string
  /** 共享材料引用号（如 材1）。 */
  materialRef?: string
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
  effectiveStatus?: EffectiveStatusCode
  effectiveNow?: boolean
  declaredOptions?: ExamQuestionDeclaredOptionRequest[]
  choiceOptions?: ExamQuestionStandardAnswerOptionRequest[]
}

export interface ExamLayoutBlockDto {
  /** 布局块数据库自增主键；负值仅作为前端草稿交互关联序号，不会写入主键列。 */
  id: string
  pageNo: number
  blockType: ExamLayoutBlockTypeCode
  layer?: number
  /** 关联题目 ID；与 ExamLayoutQuestionDto.id 同源 */
  layoutQuestionId?: string
  identityAreaType?: PaperMasterIdentityAreaTypeCode
  rectNorm: ExamLayoutRectNorm
  blockPropsJson?: string
  /** 新建矩阵的填涂格，保存时由后端在块主键回填后落库。 */
  options?: ExamLayoutBlockOptionDto[]
}

export interface ExamLayoutBlockOptionDto {
  /** 填涂格数据库自增主键；未落库草稿不分配主键。 */
  id?: string
  /** 所属块数据库主键或同一草稿内的负关联序号。 */
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
  layoutEntryKind?: ExamLayoutEntryKindCode
  totalPages?: number
  paperSpec?: ExamLayoutPaperSpecCode
  subjectiveAnonymityMode?: AnonymityModeCode
  sourcePdfFileId?: string
  answerBookletSourceMode?: AnswerBookletSourceModeCode
  answerBookletSourceFileId?: string
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

export interface ExamLayoutDesignBootstrapRequest {
  examId: string
}

export interface ExamLayoutDesignBootstrapResponse {
  document: ExamLayoutDocument
  persisted: boolean
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
  paperSpec: ExamLayoutPaperSpecCode
}

export interface ExamInstitutionAnswerBookletImportRequest {
  examId: string
  answerBookletSourceFileId: string
}

export type { ExamLayoutDetectTaskStatusCode } from '@/types/enums/exam-layout-detect-task-status-enum'

/** 制卷异步识别任务雪花 ID；对应后端 Long，非业务表主键 */
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

/** 扫描卷题号维护请求；原位修正 OCR 漏识别题号，不重建题目切片或阅卷任务。 */
export interface ExamLayoutQuestionNumberMaintainRequest {
  examId: string
  layoutQuestionId: string
  questionNo: string
  printedQuestionNo?: string
}

export function loadExamLayoutDesign(data: ExamLayoutDesignLoadRequest) {
  return http.post<ExamLayoutDesignLoadResponse>('/api/mark/exams/layout-design/load', data)
}

export function bootstrapExamLayoutDesign(data: ExamLayoutDesignBootstrapRequest) {
  return http.post<ExamLayoutDesignBootstrapResponse>('/api/mark/exams/layout-design/bootstrap', data)
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

export function importInstitutionAnswerBooklet(data: ExamInstitutionAnswerBookletImportRequest) {
  return http.post<ExamLayoutDocument>(
    '/api/mark/exams/layout-design/import-institution-answer-booklet',
    data,
  )
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

export function maintainExamLayoutQuestionNumbers(data: ExamLayoutQuestionNumberMaintainRequest) {
  return http.post<ExamLayoutQuestionDto>('/api/mark/exams/layout-design/question-numbers/maintain', data)
}
