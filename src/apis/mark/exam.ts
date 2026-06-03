import type { AxiosResponse } from 'axios'
import type { QuestionTypeCode } from './grading-experience'
import type { AnonymityModeCode } from './marking-organization'
import type { ScannerKioskScanMode } from './scanner-kiosk'
import type { GradeStatusCode, ObjectiveResultCode } from './student-exam'
/**
 * 阅卷考试主链 API - 对接 edu-mark 模块 ExamMarkController
 *
 * 后端规则：
 * - 所有 endpoint 均为 POST，入参统一 body
 * - 租户与操作人从 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 统一用 string 表达到前端（保持与其他模块一致）
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { UserDto } from '@/types/api-types.d'
import http from '@/config/axios'
import { strictEnumLabel } from '@/utils/strict-enum'

const EXAM_TEMPLATE_DATA_ERROR = '试卷模板数据异常，请刷新后重试'
const STANDARD_ANSWER_DATA_ERROR = '标准答案数据异常，请刷新后重试'

/** 试卷模板未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_TEMPLATE_NOT_CONFIGURED 对齐 */
export const PAPER_TEMPLATE_NOT_CONFIGURED_CODE = 20014

/** Axios 拦截器抛出的后端业务错误对象 */
type MarkBusinessError = Error & {
  code?: number | string
  response?: AxiosResponse<ResultInfo<null>>
}

/** 考试状态编码 - 对应后端 ExamStatus 枚举（仅保留批改链有意义的状态） */
export type ExamStatusCode = 'ACTIVE' | 'CLOSED'

/** 考试状态文案映射 */
export const EXAM_STATUS_LABEL: Record<ExamStatusCode, string> = {
  ACTIVE: '正常',
  CLOSED: '已关闭',
}
/** 考试状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const EXAM_STATUS_TONE: Record<ExamStatusCode, BadgeTone> = {
  ACTIVE: 'green',
  CLOSED: 'gray',
}

/** 生效状态编码 - 与后端 EffectiveStatus 枚举完全一致 */
export type EffectiveStatusCode = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'DISCARDED'

/** 生效状态文案 - 与后端 EffectiveStatus 枚举完全一致 */
export const EFFECTIVE_STATUS_LABEL: Record<EffectiveStatusCode, string> = {
  DRAFT: '草稿',
  ACTIVE: '已生效',
  SUPERSEDED: '已被替换',
  DISCARDED: '已废弃',
}

/** 主观题匿名模式文案 - 与后端 AnonymityMode 枚举完全一致 */
export const SUBJECTIVE_ANONYMITY_MODE_LABEL: Record<AnonymityModeCode, string> = {
  ANONYMOUS: '匿名',
  NAMED: '实名',
}

/** 考生状态编码 - 与后端 CandidateStatus 枚举完全一致 */
export type CandidateStatusCode = 'ACTIVE' | 'ABSENT'

/** 试卷绑定状态编码 - 与后端 BindingStatus 枚举完全一致 */
export type BindingStatusCode = 'UNBOUND' | 'BOUND' | 'CONFLICT' | 'DISCARDED'

/** 扫描页质量判定 - 与后端 QualityDecision 枚举完全一致 */
export type QualityDecisionCode = 'PASS' | 'BLOCKED'

/** 扫描页质量判定文案 */
export const QUALITY_DECISION_LABEL: Record<QualityDecisionCode, string> = {
  PASS: '质量通过',
  BLOCKED: '质量阻断',
}

/** 扫描页质量判定徽标色调 */
export const QUALITY_DECISION_TONE: Record<
  QualityDecisionCode,
  import('@/components/ui-guide/ui/types').BadgeTone
> = {
  PASS: 'green',
  BLOCKED: 'red',
}

/** 阅卷原始扫描页引用 - 与后端 ScannedPageRef 字段对齐 */
export interface MarkingScanPageRefVO {
  pageId: string
  pageSeq: number
  templatePageNo: number
  fileId?: string
  qualityStatus: QualityDecisionCode
  identityMaskedView?: boolean
}

/** 批改处理任务状态 - 与后端 TaskStatus 枚举完全一致 */
export type TaskStatusCode = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'

/** 重复影像处置状态 - 与后端 DuplicateResolutionStatus 枚举完全一致 */
export type DuplicateResolutionStatusCode = 'PENDING' | 'RESOLVED'

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface ExamPageQueryRequest extends QueryDto {
  /** 课程ID（可选） */
  courseId?: string
  /** 创建人ID（教师视角传当前用户；管理员传 null） */
  createUserId?: string | null
  /** 考试状态 */
  status?: ExamStatusCode
  /** 学年，如 '2024-2025' */
  academicYear?: string
  /** 学期：1=秋季学期，2=春季学期 */
  semester?: string
  /** 名称关键词（模糊匹配 exam_name / exam_no） */
  keyword?: string
}

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface ExamSummaryVO {
  examId: string
  courseId?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: GradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamSummaryResponse.createUser */
  createUser: string
  createTime?: string
}

/** 考试范围班级引用 - 对应 ExamClassRefVO */
export interface ExamClassRefVO {
  classId: string
  className: string
}

/** 来源文件引用 - 对应 ExamFileRefVO */
export interface ExamFileRefVO {
  fileId: string
  fileName: string
}

/** 考试详情 - 对应 ExamDetailResponse */
export interface ExamDetailVO {
  examId: string
  courseId?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: GradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamDetailResponse.createUser */
  createUser: string
  createTime?: string
  updateTime?: string
  /** 班级范围ID集合 */
  classIds: string[]
  /**
   * 班级范围引用集合（classId + className），与 classIds 一一对应、顺序一致。
   * 由后端通过 edu-user 班级服务批量回填，前端列表/标签直接消费 className。
   */
  classRefs: ExamClassRefVO[]
  /** 当前模板ID（未配置则 undefined） */
  templateId?: string
  templateName?: string
  totalPages?: number
  /** 当前有效题目数量 */
  questionCount: number
  /** 当前有效标准答案数量 */
  answerCount: number
  /** 当前考生名册数量 */
  candidateCount: number
  /** 制卷形态 */
  materialLayoutMode?: ExamMaterialLayoutModeCode
  materialLayoutModeMessage?: string
  /** 整卷印刷来源 */
  printSourceMode?: ExamPrintSourceModeCode
  printSourceModeMessage?: string
  layoutModeLocked?: boolean
  pageTemplateReady?: boolean
  masterConfigured?: boolean
  masterName?: string
  masterRegionReady?: boolean
  subjectiveRegionReady?: boolean
  subjectiveQuestionCount?: number
  subjectiveRegionConfiguredCount?: number
  printPackageReady?: boolean
  printPackageCount?: number
  /** 准备待完善项（提示能力缺口，不阻断扫描；字段名与后端 prepBlockingReasons 对齐） */
  prepBlockingReasons?: string[]
}

/** 制卷形态 - 对应 ExamMaterialLayoutMode */
export type ExamMaterialLayoutModeCode = 'ANSWER_SHEET' | 'FULL_PAPER'

/** 制卷形态文案 */
export const EXAM_MATERIAL_LAYOUT_MODE_LABEL: Record<ExamMaterialLayoutModeCode, string> = {
  ANSWER_SHEET: '独立答卷页',
  FULL_PAPER: '整卷作答',
}

/** 整卷印刷来源 - 对应 ExamPrintSourceMode */
export type ExamPrintSourceModeCode = 'SYSTEM_PRINT' | 'EXTERNAL_PRINT'

/** 整卷印刷来源文案 */
export const EXAM_PRINT_SOURCE_MODE_LABEL: Record<ExamPrintSourceModeCode, string> = {
  SYSTEM_PRINT: '系统制卷',
  EXTERNAL_PRINT: '外带已印试卷',
}

/** 保存制卷形态请求 - 对应 ExamMaterialLayoutSaveRequest */
export interface ExamMaterialLayoutSaveRequest {
  examId: string
  materialLayoutMode: ExamMaterialLayoutModeCode
  printSourceMode?: ExamPrintSourceModeCode
}

/** 批改策略编码 */
export type GradingStrategyCode = 'SINGLE' | 'DOUBLE_BLIND'

/** 批改策略文案 */
export const GRADING_STRATEGY_LABEL: Record<GradingStrategyCode, string> = {
  SINGLE: '单评',
  DOUBLE_BLIND: '双评盲审',
}

/** 创建考试请求 - 对应 ExamCreateRequest */
export interface ExamCreateRequest {
  /** 课程ID */
  courseId: string
  /**
   * 学年，如 '2024-2025'。与 semester 必须同时填写或同时留空，
   * 由后端 Service 联动校验。
   */
  academicYear?: string
  /** 学期：1=秋季学期，2=春季学期。与 academicYear 必须同时填写或同时留空。 */
  semester?: string
  /** 考试名称（必填） */
  examName: string
  /** 考试编号（必填） */
  examNo: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 批改策略编码 */
  gradingStrategy?: GradingStrategyCode
  remark?: string
}

/** 更新考试请求 - 对应 ExamUpdateRequest */
export interface ExamUpdateRequest extends ExamCreateRequest {
  /** 考试ID */
  examId: string
}

/** 删除考试请求 - 对应 ExamDeleteRequest */
export interface ExamDeleteRequest {
  /** 考试ID */
  examId: string
}

/** 考生名册项 - 对应 ExamCandidateRosterRequest */
export interface ExamCandidateRosterRequest {
  classId: string
  studentUserId: string
}
/** 页面模板项 - 对应 ExamPageTemplateRequest */
export interface ExamPageTemplateRequest {
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

/** 题目模板项 - 对应 ExamQuestionTemplateRequest */
export interface ExamQuestionTemplateRequest {
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  knowledgeId?: string
  sortNo?: number
  /**
   * 题干文本：教师制卷阶段录入或母版 PDF / 扫描页 OCR 提取。
   * AI 评分联动使用本字段圈定评分范围，缺失时后端按 QUESTION_CONTEXT_MISSING 阐断。
   */
  questionStem?: string
}

/** 试卷模板保存请求 - 对应 ExamTemplateSaveRequest */
export interface ExamTemplateSaveRequest {
  examId: string
  templateName: string
  totalPages: number
  pages: ExamPageTemplateRequest[]
  questions: ExamQuestionTemplateRequest[]
  subjectiveAnonymityMode?: AnonymityModeCode
}

/** 答题卡页面模板保存请求 - 对应 ExamAnswerSheetTemplateSaveRequest */
export interface ExamAnswerSheetTemplateSaveRequest {
  examId: string
  templateName: string
  totalPages: number
  pages: ExamPageTemplateRequest[]
}

/** 页面模板响应 - 对应 ExamPaperPageTemplateResponse */
export interface ExamPaperPageTemplateVO {
  pageTemplateId: string
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

/** 题目模板响应 - 对应 ExamQuestionTemplateResponse */
export interface ExamQuestionTemplateVO {
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  knowledgeId?: string
  sortNo?: number
  /** 题干文本 */
  questionStem?: string
}

/** 模板查询响应 - 对应 ExamTemplateResponse */
export interface ExamTemplateVO {
  templateId: string
  examId: string
  templateName: string
  totalPages: number
  status: EffectiveStatusCode
  pages: ExamPaperPageTemplateVO[]
  questions: ExamQuestionTemplateVO[]
  subjectiveAnonymityMode: AnonymityModeCode
}

function requireTemplateText(value: string | undefined, message: string): void {
  if (!value) {
    throw new Error(message)
  }
}

function requireTemplateNumber(value: number | undefined, message: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(message)
  }
}

function validateExamPaperPageTemplateContract(record: ExamPaperPageTemplateVO): void {
  requireTemplateText(record.pageTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateNumber(record.pageNo, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateText(record.templateFileId, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateNumber(record.widthPx, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateNumber(record.heightPx, EXAM_TEMPLATE_DATA_ERROR)
}

function validateExamQuestionTemplateContract(record: ExamQuestionTemplateVO): void {
  requireTemplateText(record.questionTemplateId, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateText(record.questionNo, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel({ OBJECTIVE: '客观题', SUBJECTIVE: '主观题' }, record.questionType, '题型')
  requireTemplateNumber(record.fullScore, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateNumber(record.sortNo, EXAM_TEMPLATE_DATA_ERROR)
}

function validateExamTemplateContract(record: ExamTemplateVO): ExamTemplateVO {
  requireTemplateText(record.templateId, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateText(record.examId, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateText(record.templateName, EXAM_TEMPLATE_DATA_ERROR)
  requireTemplateNumber(record.totalPages, EXAM_TEMPLATE_DATA_ERROR)
  strictEnumLabel(EFFECTIVE_STATUS_LABEL, record.status, '试卷模板生效状态')
  strictEnumLabel(SUBJECTIVE_ANONYMITY_MODE_LABEL, record.subjectiveAnonymityMode, '主观题匿名模式')
  if (!Array.isArray(record.pages)) {
    throw new TypeError(EXAM_TEMPLATE_DATA_ERROR)
  }
  if (!Array.isArray(record.questions)) {
    throw new TypeError(EXAM_TEMPLATE_DATA_ERROR)
  }
  record.pages.forEach(validateExamPaperPageTemplateContract)
  record.questions.forEach(validateExamQuestionTemplateContract)
  return record
}

/**
 * 客观题比较策略编码 - 与后端 com.nybc.edu.common.enums.ObjectiveComparePolicy 一一对齐。
 * <ul>
 *   <li>EXACT_NORMALIZED：去空白并统一大小写后精确比较；</li>
 *   <li>CHOICE_SET：选择题集合判等，忽略顺序与分隔符；</li>
 *   <li>REGEX：教师配置正则表达式匹配 OCR 答案；</li>
 *   <li>NUMERIC_TOLERANCE：数值题按标准值、容差和可选单位判等；</li>
 *   <li>AI_GRADE：客观题未配标准答案或显式选 AI 评分时由 AI 给出评分（NEED_REVIEW），教师复核确认后落地。</li>
 * </ul>
 */
export type ObjectiveComparePolicyCode =
  | 'EXACT_NORMALIZED'
  | 'CHOICE_SET'
  | 'REGEX'
  | 'NUMERIC_TOLERANCE'
  | 'AI_GRADE'

/** 客观题比较策略选项，供前端 a-select 渲染 */
export const OBJECTIVE_COMPARE_POLICY_OPTIONS: Array<{
  value: ObjectiveComparePolicyCode
  label: string
}> = [
  { value: 'EXACT_NORMALIZED', label: '规范化精确比较（填空 / 单空对比）' },
  { value: 'CHOICE_SET', label: '选择题集合判等（多选 / 顺序无关）' },
  { value: 'REGEX', label: '正则匹配（自定义答案模式）' },
  { value: 'NUMERIC_TOLERANCE', label: '数值容差（标准值 + 容差 + 单位）' },
  { value: 'AI_GRADE', label: 'AI 评分（无标答时由 AI 给出评分，教师复核）' },
]

/** 选择题标准答案选项请求 - 对应后端 ExamQuestionStandardAnswerOptionRequest */
export interface ExamQuestionStandardAnswerOptionRequest {
  /** 正确选项标签 */
  optionLabel: string
  /** 选项排序号 */
  sortNo: number
}

/** 标准答案保存请求 - 对应 ExamStandardAnswerSaveRequest */
export interface ExamStandardAnswerSaveRequest {
  examId: string
  questionTemplateId: string
  /**
   * 文本类策略填写；选择集合、数值容差和 AI 评分策略由结构化字段承接。
   * 主观题 standardAnswer 一律可选。
   */
  standardAnswer?: string
  choiceOptions?: ExamQuestionStandardAnswerOptionRequest[]
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: string
  numericTolerance?: string
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveNow?: boolean
}

/** 标准答案查询请求 - 对应 ExamStandardAnswerQueryRequest */
export interface ExamStandardAnswerQueryRequest {
  examId: string
  questionTemplateId: string
}

/** 选择题标准答案选项响应 - 对应 ExamQuestionStandardAnswerOptionResponse */
export interface ExamQuestionStandardAnswerOptionVO {
  optionId: string
  optionLabel: string
  sortNo: number
}

/** 标准答案响应 - 对应 ExamStandardAnswerResponse */
export interface ExamStandardAnswerVO {
  standardAnswerId: string
  examId: string
  questionTemplateId: string
  standardAnswer?: string
  choiceOptions: ExamQuestionStandardAnswerOptionVO[]
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: number
  numericTolerance?: number
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveStatus?: EffectiveStatusCode
}

function validateStandardAnswerOptionContract(record: ExamQuestionStandardAnswerOptionVO): void {
  requireTemplateText(record.optionId, STANDARD_ANSWER_DATA_ERROR)
  requireTemplateText(record.optionLabel, STANDARD_ANSWER_DATA_ERROR)
  requireTemplateNumber(record.sortNo, STANDARD_ANSWER_DATA_ERROR)
}

function validateStandardAnswerContract(
  record: ExamStandardAnswerVO | null,
): ExamStandardAnswerVO | null {
  if (record === null) {
    return null
  }
  requireTemplateText(record.standardAnswerId, STANDARD_ANSWER_DATA_ERROR)
  requireTemplateText(record.examId, STANDARD_ANSWER_DATA_ERROR)
  requireTemplateText(record.questionTemplateId, STANDARD_ANSWER_DATA_ERROR)
  if (record.comparePolicy) {
    strictEnumLabel(
      {
        EXACT_NORMALIZED: '规范化精确比较',
        CHOICE_SET: '选择题集合判等',
        REGEX: '正则匹配',
        NUMERIC_TOLERANCE: '数值容差',
        AI_GRADE: 'AI 评分',
      },
      record.comparePolicy,
      '客观题比较策略',
    )
  }
  if (!Array.isArray(record.choiceOptions)) {
    throw new TypeError(STANDARD_ANSWER_DATA_ERROR)
  }
  record.choiceOptions.forEach(validateStandardAnswerOptionContract)
  if (record.effectiveStatus) {
    strictEnumLabel(EFFECTIVE_STATUS_LABEL, record.effectiveStatus, '标准答案生效状态')
  }
  return record
}

/** 考生响应 - 对应 ExamCandidateResponse */
export interface ExamCandidateVO {
  candidateRosterId: string
  classId?: string
  className?: string
  studentUserId: string
  studentNo: string
  studentName: string
  status?: CandidateStatusCode
}

// ─── API 调用 ──────────────────────────────────────────────────

/**
 * 分页查询考试列表
 * POST /api/mark/exams/page
 */
export function pageExams(request: ExamPageQueryRequest): Promise<PageResult<ExamSummaryVO>> {
  return http.post<PageResult<ExamSummaryVO>>('/api/mark/exams/page', request)
}

/**
 * 查询考试详情
 * POST /api/mark/exams/detail
 */
export function getExamDetail(examId: string): Promise<ExamDetailVO> {
  return http.post<ExamDetailVO>('/api/mark/exams/detail', { examId })
}

/**
 * 保存考试制卷形态与整卷印刷来源
 * POST /api/mark/exams/material-layout/save
 */
export function saveMaterialLayout(request: ExamMaterialLayoutSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/material-layout/save', request)
}

/**
 * 创建考试主记录（创建即可进入扫描批改链路）
 * POST /api/mark/exams/create
 * 返回新考试ID
 */
export function createExam(request: ExamCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/create', request)
}

/**
 * 更新考试主信息
 * POST /api/mark/exams/update
 */
export function updateExam(request: ExamUpdateRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/update', request)
}

/**
 * 删除尚未进入后续链路的考试
 * POST /api/mark/exams/delete
 */
export function deleteExam(request: ExamDeleteRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/delete', request)
}

/** 增量合并考生名册 */
export interface ExamCandidateMergeRequest {
  examId: string
  candidates: ExamCandidateRosterRequest[]
}

export function mergeExamCandidates(request: ExamCandidateMergeRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/candidates/merge', request)
}

/** 增量移除考生名册 */
export interface ExamCandidateRemoveRequest {
  examId: string
  studentUserIds: string[]
}

export function removeExamCandidates(request: ExamCandidateRemoveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/candidates/remove', request)
}

/** 增量保存考试班级范围 */
export interface ExamClassScopeSaveRequest {
  examId: string
  classIds?: string[]
}

export function saveExamClassScope(request: ExamClassScopeSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/class-scope/save', request)
}

/** 名册可选班级 */
export interface ExamClassOptionVO {
  classId: string
  className: string
  departmentId?: string
}

export function listExamClassOptions(examId: string): Promise<ExamClassOptionVO[]> {
  return http.post<ExamClassOptionVO[]>('/api/mark/exams/scope/class-options', { examId })
}

/** 预览考生名册绑定行（不落库） */
export interface ExamCandidatePreviewRequest {
  examId: string
  classIds?: string[]
  candidates: ExamCandidateRosterRequest[]
}

export function previewExamCandidates(
  request: ExamCandidatePreviewRequest,
): Promise<ExamCandidateVO[]> {
  return http.post<ExamCandidateVO[]>('/api/mark/exams/scope/candidates/preview', request)
}

/** 名册班级学生分页 */
export interface ExamClassStudentsPageRequest {
  examId: string
  classId: string
  keyword?: string
  pageNum: number
  pageSize: number
}

export function listExamClassStudents(
  request: ExamClassStudentsPageRequest,
): Promise<PageResult<UserDto>> {
  return http.post<PageResult<UserDto>>('/api/mark/exams/scope/class-students/page', request)
}

/** 名册班级学生树节点（与 user 侧 ClassStudentTreeNode 对齐） */
export interface ExamClassStudentTreeNodeVO {
  id: string
  name: string
  nodeType: 'DEPARTMENT' | 'CLASS' | 'STUDENT'
  originalId: string
  parentId: string | null
  majorId?: string
  majorName?: string
  studentNumber?: string
  studentCount?: number
  classCount?: number
  selectable: boolean
  isLeaf: boolean
  children?: ExamClassStudentTreeNodeVO[]
}

export interface ExamStudentTreeRequest {
  examId: string
  classIds?: string[]
}

export function listExamStudentTree(
  request: ExamStudentTreeRequest,
): Promise<ExamClassStudentTreeNodeVO[]> {
  return http.post<ExamClassStudentTreeNodeVO[]>('/api/mark/exams/scope/student-tree', request)
}

/**
 * 保存试卷模板（含页面 + 题目），全量替换
 * POST /api/mark/exams/template/save
 */
export function saveExamTemplate(request: ExamTemplateSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/template/save', request)
}

/**
 * 保存答题卡页面模板（只替换页面配置，不修改题目结构）
 * POST /api/mark/exams/answer-sheet-template/save
 */
export function saveAnswerSheetTemplate(
  request: ExamAnswerSheetTemplateSaveRequest,
): Promise<string> {
  return http.post<string>('/api/mark/exams/answer-sheet-template/save', request)
}

/**
 * 查询考试当前模板
 * POST /api/mark/exams/template
 *
 * 注意：模板不存在、缺少页面或缺少题目时，后端返回 PAPER_TEMPLATE_NOT_CONFIGURED_CODE。
 */
export function getExamTemplate(examId: string): Promise<ExamTemplateVO> {
  return http
    .post<ExamTemplateVO>('/api/mark/exams/template', { examId })
    .then(validateExamTemplateContract)
}

/**
 * 判断后端是否返回“试卷模板尚未配置”业务态。
 * 只读取稳定 code，不依赖可变错误文案。
 */
export function isPaperTemplateNotConfiguredError(error: MarkBusinessError): boolean {
  const code = error.code ?? error.response?.data.code
  return Number(code) === PAPER_TEMPLATE_NOT_CONFIGURED_CODE
}

/**
 * 保存题目标准答案
 * POST /api/mark/exams/standard-answer/save
 */
export function saveStandardAnswer(request: ExamStandardAnswerSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/standard-answer/save', request)
}

/**
 * 查询题目当前标准答案
 * POST /api/mark/exams/standard-answer/get
 */
export function getStandardAnswer(
  request: ExamStandardAnswerQueryRequest,
): Promise<ExamStandardAnswerVO | null> {
  return http
    .post<ExamStandardAnswerVO | null>('/api/mark/exams/standard-answer/get', request)
    .then(validateStandardAnswerContract)
}

/**
 * 分页查询考试考生名单
 * POST /api/mark/exams/candidates
 */
export interface ExamCandidatePageQueryRequest {
  examId: string
  /** 班级 ID 过滤 */
  classId?: string
  /** 学号或姓名关键词 */
  keyword?: string
  pageNum: number
  pageSize: number
}

export function pageExamCandidates(
  request: ExamCandidatePageQueryRequest,
): Promise<PageResult<ExamCandidateVO>> {
  return http.post<PageResult<ExamCandidateVO>>('/api/mark/exams/candidates', request)
}

/**
 * 查询考试当前考生名单（自动分页拉全）
 * POST /api/mark/exams/candidates
 */
const EXAM_CANDIDATE_PAGE_SIZE = 500

export async function listExamCandidates(examId: string): Promise<ExamCandidateVO[]> {
  const all: ExamCandidateVO[] = []
  let pageNum = 1
  while (true) {
    const page = await pageExamCandidates({
      examId,
      pageNum,
      pageSize: EXAM_CANDIDATE_PAGE_SIZE,
    })
    all.push(...page.list)
    if (pageNum >= page.pages || page.list.length === 0) {
      break
    }
    pageNum += 1
  }
  return all
}

// ─── 考试成绩汇总（成绩确认 / 成绩发布列表） ──────────────────────────

/** 与后端 FinalScoreStatus 枚举对齐（共 6 个状态） */
export type FinalScoreStatusCode =
  | 'PENDING'
  | 'CALCULATED'
  | 'CONFIRMED'
  | 'CORRECTED'
  | 'PUBLISHED'
  | 'WITHDRAWN'

/** 最终成绩状态文案映射 */
export const FINAL_SCORE_STATUS_LABEL: Record<FinalScoreStatusCode, string> = {
  PENDING: '待计算',
  CALCULATED: '已计算',
  CONFIRMED: '已确认',
  CORRECTED: '已更正',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
}
/** 最终成绩状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const FINAL_SCORE_STATUS_TONE: Record<FinalScoreStatusCode, BadgeTone> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'orange',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
}

/** 最终成绩状态下拉选项，值必须与后端 FinalScoreStatus 枚举完全一致 */
export const FINAL_SCORE_STATUS_OPTIONS: Array<{
  label: string
  value: FinalScoreStatusCode
}> = [
  { value: 'PENDING', label: FINAL_SCORE_STATUS_LABEL.PENDING },
  { value: 'CALCULATED', label: FINAL_SCORE_STATUS_LABEL.CALCULATED },
  { value: 'CONFIRMED', label: FINAL_SCORE_STATUS_LABEL.CONFIRMED },
  { value: 'CORRECTED', label: FINAL_SCORE_STATUS_LABEL.CORRECTED },
  { value: 'PUBLISHED', label: FINAL_SCORE_STATUS_LABEL.PUBLISHED },
  { value: 'WITHDRAWN', label: FINAL_SCORE_STATUS_LABEL.WITHDRAWN },
]
/** 答卷展示基础信息 - 对应 PaperInstanceDisplayVO 公共字段 */
interface PaperInstanceDisplayBaseVO {
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className?: string
  anonymousNo?: string
  primaryText: string
  secondaryText?: string
}

/** 实名答卷展示信息 - 后端 REAL_NAME 分支必须返回学生身份字段 */
export interface RealNamePaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'REAL_NAME'
  paperInstanceId: string
  studentUserId: string
  studentNo: string
  studentName: string
}

/** 匿名答卷展示信息 - 后端 ANONYMOUS 分支以匿名号作为主展示锚点 */
export interface AnonymousPaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'ANONYMOUS'
  paperInstanceId: string
  anonymousNo: string
}

/** 未绑定答卷展示信息 - 后端 UNBOUND 分支表达合法扫描未绑定态 */
export interface UnboundPaperInstanceDisplayVO extends PaperInstanceDisplayBaseVO {
  displayMode: 'UNBOUND'
}

/** 答卷展示信息 - 对应 PaperInstanceDisplayVO */
export type PaperInstanceDisplayVO =
  | RealNamePaperInstanceDisplayVO
  | AnonymousPaperInstanceDisplayVO
  | UnboundPaperInstanceDisplayVO

/** 考试成绩汇总查询请求 - 对应 ExamScoreSummaryQueryRequest */
export interface ExamScoreSummaryQueryRequest extends QueryDto {
  examId: string
  /** 最终成绩状态过滤；空表示不过滤，含未生成最终成绩的考生 */
  finalScoreStatus?: FinalScoreStatusCode
  /** 学号或姓名关键词（模糊匹配） */
  keyword?: string
}

/** 考试成绩汇总项 - 对应 ExamScoreSummaryItemResponse */
export interface ExamScoreSummaryItemVO {
  candidateRosterId: string
  classId: string
  studentClassName: string
  studentUserId: string
  studentNo: string
  studentName: string
  candidateStatus?: CandidateStatusCode
  /** 试卷实例ID，未绑定试卷时为 undefined */
  paperInstanceId?: string
  bindingStatus?: BindingStatusCode
  scanBatchId?: string
  finalScoreStatus: FinalScoreStatusCode
  finalScoreStatusMessage: string
  finalScore?: number
  confirmedTime?: string
  confirmedBy?: string
  paperDisplay: PaperInstanceDisplayVO
}

/**
 * 分页查询考试成绩汇总
 * POST /api/mark/exams/score-summary
 */
export function pageExamScoreSummary(
  request: ExamScoreSummaryQueryRequest,
): Promise<PageResult<ExamScoreSummaryItemVO>> {
  return http.post<PageResult<ExamScoreSummaryItemVO>>('/api/mark/exams/score-summary', request)
}

// ─── 扫描与导入链路 ─────────────────────────────────────────────
/** 扫描异常待办查询请求 - 对应 ScanAttentionQueryRequest */
export type ScanAttentionTypeCode =
  | 'QUALITY_BLOCK'
  | 'PROCESSING_BLOCK'
  | 'DUPLICATE_PENDING'
  | 'RECOGNITION_REVIEW'
  | 'BINDING_CONFLICT'

/** 扫描异常来源类型 - 对应后端扫描异常聚合 SQL 固定来源 */
export type ScanAttentionSourceTypeCode =
  | 'SCANNED_PAGE'
  | 'PROCESSING_TASK'
  | 'DUPLICATE_RESOLUTION'
  | 'GRADE_RESULT'
  | 'PAPER_INSTANCE'

export interface ScanAttentionQueryRequest extends QueryDto {
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  attentionType?: ScanAttentionTypeCode
}

/** 扫描异常待办项 - 对应 ScanAttentionItemResponse */
export interface ScanAttentionItemVO {
  id: string
  attentionType: ScanAttentionTypeCode
  sourceType: ScanAttentionSourceTypeCode
  sourceId: string
  sourceDisplayName: string
  examId: string
  scanBatchId?: string
  scanBatchDisplayName: string
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  classId?: string
  className?: string
  anonymousNo?: string
  paperDisplay: PaperInstanceDisplayVO
  pageId?: string
  pageDisplayName: string
  questionTemplateId?: string
  questionDisplayName: string
  qualityDecision?: QualityDecisionCode
  processingStatus?: TaskStatusCode
  duplicateResolutionStatus?: DuplicateResolutionStatusCode
  gradeStatus?: GradeStatusCode
  diagnostic?: string
  updateTime?: string
}

// ─── 扫描事件 / 批次 / 设备 模型重构（2026-05-06） ─────────────────

/**
 * 扫描批次状态码 - 对应后端 ScanBatchStatus 枚举。
 *
 * - DISCARDED：教师在扫描审阅 / 异常处置时显式废弃整批，与封存（sealed_at）互斥；
 *   状态机进入 DISCARDED 后不再产生新页、不再纳入归档与统计。
 */
export type ScanBatchStatusCode = 'RECEIVED' | 'BLOCKED' | 'BOUND' | 'COMPLETED' | 'DISCARDED'

/** 扫描批次状态文案映射 - 与后端 ScanBatchStatus.message 完整一致 */
export const SCAN_BATCH_STATUS_LABEL: Record<ScanBatchStatusCode, string> = {
  RECEIVED: '已接收',
  BLOCKED: '已阻断',
  BOUND: '已绑定',
  COMPLETED: '已完成',
  DISCARDED: '已废弃',
}

/** 扫描批次状态 BadgeTone 映射 */
export const SCAN_BATCH_STATUS_TONE: Record<ScanBatchStatusCode, BadgeTone> = {
  RECEIVED: 'blue',
  BLOCKED: 'red',
  BOUND: 'green',
  COMPLETED: 'green',
  DISCARDED: 'gray',
}

/** 扫描批次视图 - 对应 ExamScannerBatchResponse */
export interface ExamScannerBatchVO {
  /** 扫描批次ID */
  scanBatchId: string
  examId: string
  /** 扫描录入模式 */
  scanMode?: ScannerKioskScanMode
  batchNo: string
  batchExternalNo?: string
  scannerDeviceId?: string
  scannerStationId?: string
  /** 来源文件引用集合 */
  sourceFiles: ExamFileRefVO[]
  /** 来源文件数量 */
  sourceFileCount: number
  /** 补扫目标页号 */
  targetPageNo?: number
  /** 补扫原因 */
  supplementReason?: string
  pageCount: number
  status: ScanBatchStatusCode
  statusMessage: string
  diagnostic?: string
  scanStartTime: string
  scanEndTime: string
  createTime?: string
  updateTime?: string
  /** 批次内事件数量 */
  eventCount: number
  /** 是否替换目标页（仅 SUPPLEMENT 模式有意义） */
  replaceTargetPage: boolean
  /** 批次封存时间（与 discardedAt 互斥） */
  sealedAt?: string
  /** 批次封存执行人 ID */
  sealedBy?: string
  /** 批次废弃时间 */
  discardedAt?: string
  /** 批次废弃执行人 ID */
  discardedBy?: string
  /** 批次废弃原因（教师可见） */
  discardReason?: string
}

/** 扫描批次创建响应 - 对应 ExamScannerBatchCreateResponse */
export interface ExamScannerBatchCreateVO {
  scanBatchId: string
  batchNo: string
  eventCount: number
  fileCount: number
  pageCount: number
  scanStartTime: string
  scanEndTime: string
}

/** 扫描批次创建请求 - 对应 ExamScannerBatchCreateRequest */
export interface ExamScannerBatchCreateRequest {
  examId: string
  /** 扫描设备ID集合（必填，至少 1 个） */
  scannerDeviceIds: string[]
  /** 可选：扫描仪 IP 集合，用于在同一组设备里按 IP 进一步过滤 */
  scannerIps?: string[]
  /** 扫描时间窗口起点 */
  scanStartTime: string
  /** 扫描时间窗口终点 */
  scanEndTime: string
}

/** 扫描批次分页查询请求 - 对应 ExamScannerBatchQueryRequest */
export interface ExamScannerBatchQueryRequest extends QueryDto {
  examId: string
  scannerDeviceId?: string
  status?: ScanBatchStatusCode
  scanStartTimeFrom?: string
  scanStartTimeTo?: string
  /**
   * 是否包含已废弃（DISCARDED）批次。
   *
   * 缺省（false / 不传）时后端列表自动屏蔽 DISCARDED 批次；教师在"扫描审计"页面
   * 显式查看废弃记录时传 true。
   */
  includeDiscarded?: boolean
}

/**
 * 教师按扫描仪集合 + 时间区间聚合扫描事件成批次
 * POST /api/mark/exams/scanner-batches/create
 */
export function createScanBatchByCondition(
  request: ExamScannerBatchCreateRequest,
): Promise<ExamScannerBatchCreateVO> {
  return http.post<ExamScannerBatchCreateVO>('/api/mark/exams/scanner-batches/create', request)
}

/** 按设备的事件分布片段 - 对应 ExamScannerBatchDeviceBreakdown */
export interface ExamScannerBatchDeviceBreakdownVO {
  scannerDeviceId: string
  scannerIp: string
  eventCount: number
  pageCount: number
}

/** 扫描批次聚合预览响应 - 对应 ExamScannerBatchPreviewResponse */
export interface ExamScannerBatchPreviewVO {
  eventCount: number
  fileCount: number
  pageCount: number
  scanStartTime?: string
  scanEndTime?: string
  deviceBreakdown: ExamScannerBatchDeviceBreakdownVO[]
}

/**
 * 预览扫描批次聚合统计（仅返回数量/时间跨度/按设备分布，不含事件明细）
 * POST /api/mark/exams/scanner-batches/preview
 */
export function previewScanBatchAggregation(
  request: ExamScannerBatchCreateRequest,
): Promise<ExamScannerBatchPreviewVO> {
  return http.post<ExamScannerBatchPreviewVO>('/api/mark/exams/scanner-batches/preview', request)
}

/**
 * 分页查询扫描批次
 * POST /api/mark/exams/scanner-batches/page
 */
export function pageScannerBatches(
  request: ExamScannerBatchQueryRequest,
): Promise<PageResult<ExamScannerBatchVO>> {
  return http.post<PageResult<ExamScannerBatchVO>>('/api/mark/exams/scanner-batches/page', request)
}
/**
 * 查询扫描异常待办列表
 * POST /api/mark/exams/scan-attentions
 */
export function listScanAttentions(
  request: ScanAttentionQueryRequest,
): Promise<PageResult<ScanAttentionItemVO>> {
  return http.post<PageResult<ScanAttentionItemVO>>('/api/mark/exams/scan-attentions', {
    ...request,
    pageNum: request.pageNum ?? 1,
    pageSize: request.pageSize ?? 500,
  })
}

// ─── 试卷身份绑定 ────────────────────────────────────────

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

/**
 * 确认试卷和考生身份绑定关系
 * POST /api/mark/exams/papers/bind
 */
export function bindPaper(request: ExamPaperBindRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/papers/bind', request)
}

// ─── 识别结果提交 ──────────────────────────────────────────────
// ─── 评分确认与试卷成绩 ─────────────────────────────────────────

/** 题目成绩确认请求 - 对应 ExamGradeConfirmRequest */
export interface ExamGradeConfirmRequest {
  examId: string
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  commentText?: string
  annotationText?: string
}

/** 试卷最终成绩确认请求 - 对应 ExamFinalScoreConfirmRequest */
export interface ExamFinalScoreConfirmRequest {
  examId: string
  paperInstanceId: string
}

/** 试卷题目得分明细 - 对应 ExamQuestionScoreDto */
export interface ExamQuestionScoreVO {
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  teacherReviewScore?: number
  gradeStatus?: GradeStatusCode
  objectiveResult?: ObjectiveResultCode
}

/** 试卷成绩明细响应 - 对应 ExamPaperScoreResponse */
export interface ExamPaperScoreVO {
  examId: string
  paperInstanceId: string
  candidateRosterId: string
  studentUserId: string
  studentNo: string
  studentName: string
  totalScore?: number
  finalScoreStatus: FinalScoreStatusCode
  questions?: ExamQuestionScoreVO[]
}

/**
 * 教师确认题目得分
 * POST /api/mark/exams/question-grades/confirm
 */
export function confirmQuestionGrade(request: ExamGradeConfirmRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/confirm', request)
}

/** 题目成绩驳回请求 - 对应 ExamGradeRejectRequest */
export interface ExamGradeRejectRequest {
  examId: string
  gradeResultId: string
  rejectReason: string
}

/**
 * 教师驳回题目复核
 * POST /api/mark/exams/question-grades/reject
 */
export function rejectQuestionGrade(request: ExamGradeRejectRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/reject', request)
}
/** 题目成绩批量确认条目 - 对应 ExamGradeBatchConfirmRequest.Item */
export interface ExamGradeBatchConfirmItem {
  /** 题目批改结果ID */
  gradeResultId: string
  /** 教师复核评分（必填） */
  teacherReviewScore: number
  /** 评语，可空 */
  commentText?: string
  /** 批注内容，可空 */
  annotationText?: string
}

/** 题目成绩批量确认请求 - 对应 ExamGradeBatchConfirmRequest */
export interface ExamGradeBatchConfirmRequest {
  examId: string
  items: ExamGradeBatchConfirmItem[]
}

/** 题目成绩批量确认失败明细 - 对应 ExamGradeBatchConfirmResponse.FailureItem */
export interface ExamGradeBatchConfirmFailureItem {
  gradeResultId: string
  /** 失败业务码（来自 ResultCodeEnum） */
  code: number
  /** 失败业务消息 */
  message: string
}

/** 题目成绩批量确认响应 - 对应 ExamGradeBatchConfirmResponse */
export interface ExamGradeBatchConfirmResponse {
  totalCount: number
  successCount: number
  failureCount: number
  successGradeResultIds: string[]
  failures: ExamGradeBatchConfirmFailureItem[]
}

/**
 * 教师批量确认题目得分。
 * 阅卷工作台对识别后处于 NEED_REVIEW 状态的批改结果进行批量审核确认；
 * 客观题硬比对、客观题 AI、主观题 AI 三类来源统一通过本接口闭环。
 * 单题失败不阻塞其余条目，返回成功条目和失败明细。
 * POST /api/mark/exams/question-grades/batch-confirm
 */
export function batchConfirmQuestionGrades(
  request: ExamGradeBatchConfirmRequest,
): Promise<ExamGradeBatchConfirmResponse> {
  return http.post<ExamGradeBatchConfirmResponse>(
    '/api/mark/exams/question-grades/batch-confirm',
    request,
  )
}

/** 单题 AI 复评请求 - 对应 ExamQuestionAiRescoreRequest */
export interface ExamQuestionAiRescoreRequest {
  examId: string
  gradeResultId: string
}

/** AI 风险标记 - 对应 SubjectiveAiRiskFlag */
export interface SubjectiveAiRiskFlagVO {
  code?: string
  message?: string
}

/** AI 供应商类型编码 - 对应后端 AiProviderType */
export type AiProviderTypeCode = 'OPENAI' | 'DEEPSEEK' | 'QWEN'

/** AI 供应商类型中文文案映射 */
export const AI_PROVIDER_TYPE_LABEL: Record<AiProviderTypeCode, string> = {
  OPENAI: 'OpenAI 模型服务',
  DEEPSEEK: 'DeepSeek 模型服务',
  QWEN: '通义千问模型服务',
}

/** 单题 AI 复评结果 - 对应后端 SubjectiveGradeSuggestionResult 合同 */
export interface SubjectiveGradeSuggestionResultVO {
  scored?: boolean
  aiScore?: number
  modelProfileId?: string
  providerType?: AiProviderTypeCode
  modelName?: string
  diagnostic?: string
  evidenceSummary?: string
  traceId?: string
  limited?: boolean
  riskFlags?: SubjectiveAiRiskFlagVO[]
}

/**
 * 教师异议场景单题 AI 复评。
 *
 * 仅服务教师在阅卷工作台对整卷 AI 评分有异议时的题目级辅助复评；
 * 不属于首次 OCR 后的整卷 AI 主链，也不对学生开放。
 * 复评只覆盖 AI 评分 / aiTraceId / aiDiagnostic / aiLimited 与教师可读诊断；
 * gradeStatus 保持 NEED_REVIEW，teacherReviewScore 保持为空，仍需教师确认入口写教师复核评分。
 *
 * POST /api/mark/exams/question-grades/ai-rescore
 */
export function rescoreQuestionByAi(
  request: ExamQuestionAiRescoreRequest,
): Promise<SubjectiveGradeSuggestionResultVO> {
  return http.post<SubjectiveGradeSuggestionResultVO>(
    '/api/mark/exams/question-grades/ai-rescore',
    request,
  )
}

/** AI 能力编码 - 17B 文档定义；首次整卷 AI / 教师异议单题 AI 复评 */
export type AiAbilityCode = 'PAPER_GRADE_SUGGESTION' | 'SUBJECTIVE_GRADE_SUGGESTION'

/** AI 能力编码 -> 来源中文文案 */
export const AI_ABILITY_LABEL: Record<AiAbilityCode, string> = {
  PAPER_GRADE_SUGGESTION: '整卷 AI 批阅',
  SUBJECTIVE_GRADE_SUGGESTION: '单题 AI 复评',
}

/** AI 能力编码 -> 来源徽标色调 */
export const AI_ABILITY_TONE: Record<AiAbilityCode, BadgeTone> = {
  PAPER_GRADE_SUGGESTION: 'blue',
  SUBJECTIVE_GRADE_SUGGESTION: 'purple',
}

/** AI 执行状态编码 - 对应后端 AiExecutionStatus */
export type AiExecutionStatusCode = 'SUCCESS' | 'BLOCKED' | 'FAILED'

/** AI 执行状态文案映射 */
export const AI_EXECUTION_STATUS_LABEL: Record<AiExecutionStatusCode, string> = {
  SUCCESS: '成功',
  BLOCKED: '阻断',
  FAILED: '失败',
}

/** AI 执行状态徽标色调 */
export const AI_EXECUTION_STATUS_TONE: Record<AiExecutionStatusCode, BadgeTone> = {
  SUCCESS: 'green',
  BLOCKED: 'orange',
  FAILED: 'red',
}

/** 单题历次 AI 执行查询请求 - 对应 ExamQuestionAiExecutionsRequest */
export interface ExamQuestionAiExecutionsRequest {
  examId: string
  gradeResultId: string
}

/** 单题历次 AI 执行记录条目 - 对应 ExamQuestionAiExecutionItemResponse */
export interface ExamQuestionAiExecutionItemVO {
  traceId: string
  abilityCode: AiAbilityCode
  status: AiExecutionStatusCode
  providerType: AiProviderTypeCode
  modelName: string
  requestSummary?: string
  responseSummary?: string
  diagnostic?: string
  latencyMs: string
  createTime: string
  createUser: string
}

/**
 * 查询单题历次 AI 执行记录。
 *
 * 用于教师批阅工作台"查看 AI 历史"抽屉，展示首次整卷 AI 与教师异议阶段单题复评的全部审计记录。
 * 仅暴露审计真源，不引入版本化业务读取；最终成绩仍由 confirmQuestionGrade 写入。
 *
 * POST /api/mark/exams/question-grades/ai-executions
 */
export function listAiExecutionsForQuestion(
  request: ExamQuestionAiExecutionsRequest,
): Promise<ExamQuestionAiExecutionItemVO[]> {
  return http.post<ExamQuestionAiExecutionItemVO[]>(
    '/api/mark/exams/question-grades/ai-executions',
    request,
  )
}

/**
 * 确认试卷最终成绩。
 * 状态机：未存在 / CALCULATED / WITHDRAWN / CORRECTED → CONFIRMED。
 * 该接口仅落库 CONFIRMED 状态，不发送学生通知；通知由 publishFinalScore 触发。
 * POST /api/mark/exams/final-scores/confirm
 * @returns 最终成绩ID
 */
export function confirmFinalScore(request: ExamFinalScoreConfirmRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/confirm', request)
}

/** 试卷最终成绩发布请求 - 对应 ExamFinalScorePublishRequest */
export interface ExamFinalScorePublishRequest {
  examId: string
  paperInstanceId: string
}

/**
 * 发布试卷最终成绩。
 * 状态机：CONFIRMED / WITHDRAWN / CORRECTED → PUBLISHED，并向学生发送通知。
 * POST /api/mark/exams/final-scores/publish
 * @returns 最终成绩ID
 */
export function publishFinalScore(request: ExamFinalScorePublishRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/publish', request)
}

/** 试卷最终成绩撤回请求 - 对应 ExamFinalScoreWithdrawRequest */
export interface ExamFinalScoreWithdrawRequest {
  examId: string
  paperInstanceId: string
  /** 撤回原因（必填，落入审计日志） */
  reason: string
}

/**
 * 撤回试卷最终成绩。
 * 状态机：PUBLISHED / CORRECTED → WITHDRAWN，撤回后学生侧成绩不再可见。
 * POST /api/mark/exams/final-scores/withdraw
 * @returns 最终成绩ID
 */
export function withdrawFinalScore(request: ExamFinalScoreWithdrawRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/withdraw', request)
}

/**
 * 查询试卷当前成绩明细
 * POST /api/mark/exams/paper-score
 */
export function getPaperScore(examId: string, paperInstanceId: string): Promise<ExamPaperScoreVO> {
  return http.post<ExamPaperScoreVO>('/api/mark/exams/paper-score', { examId, paperInstanceId })
}

// ─── 复核任务（匿名批阅）─────────────────────────────────────────

/** 匿名批阅任务查询请求 - 对应 ReviewTaskQueryRequest */
export interface ReviewTaskQueryRequest extends QueryDto {
  examId: string
  /** 复核状态编码，空查全部 */
  status?: ReviewTaskStatusCode
  questionTemplateId?: string
}

/**
 * 复核任务类型编码 - 与后端 com.nybc.edu.common.enums.TaskType 一一对齐。
 * 仅复核任务相关 3 类（其它任务类型不会出现在复核任务列表中）。
 */
export type ReviewTaskTypeCode =
  | 'OBJECTIVE_AUTO_REVIEW'
  | 'OBJECTIVE_AI_REVIEW'
  | 'SUBJECTIVE_AI_REVIEW'

/** 复核任务类型中文标签与颜色，便于前端 tag 渲染 */
export const REVIEW_TASK_TYPE_META: Record<
  ReviewTaskTypeCode,
  { label: string; color: 'blue' | 'green' | 'purple' }
> = {
  OBJECTIVE_AUTO_REVIEW: { label: '客观题（硬比对）', color: 'green' },
  OBJECTIVE_AI_REVIEW: { label: '客观题（AI 评分）', color: 'blue' },
  SUBJECTIVE_AI_REVIEW: { label: '主观题（AI 评分）', color: 'purple' },
}

/**
 * 批改来源编码 - 与后端 com.nybc.edu.common.enums.GradeSource 一一对齐。
 */
export type GradeSourceCode =
  | 'AUTO_OBJECTIVE'
  | 'AUTO_OBJECTIVE_AI'
  | 'LOCAL_SUBJECTIVE_AI'
  | 'TEACHER'
  | 'RECOGNITION_FAILURE'
/** 复核任务状态编码 - 与后端 ReviewTaskStatus 枚举对齐 */
export type ReviewTaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'

/** 复核任务状态中文标签 */
export const REVIEW_TASK_STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待复核',
  IN_PROGRESS: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

/** 复核任务状态标签色 */
export const REVIEW_TASK_STATUS_TONE: Record<ReviewTaskStatusCode, BadgeTone> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
}

/** 匿名批阅任务项 - 对应 ReviewTaskItemResponse */
export interface ReviewTaskItemVO {
  reviewTaskId: string
  examId: string
  anonymousNo: string
  paperInstanceId: string
  candidateRosterId?: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
  className: string
  paperDisplay: PaperInstanceDisplayVO
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  gradeResultId: string
  aiScore?: number
  status: ReviewTaskStatusCode
  assignedTeacherUserId?: string
  assignedTeacherName?: string
  /** 复核任务类型编码，区分客观题硬比对 / 客观题 AI / 主观题 AI 三个通道 */
  reviewType: ReviewTaskTypeCode
  /** 批改来源编码，便于前端按通道筛选与显示颜色标签 */
  gradeSource: GradeSourceCode
  updateTime?: string
}

/** 匿名批阅任务动作请求 - 对应 ReviewTaskActionRequest */
export interface ReviewTaskActionRequest {
  examId: string
  reviewTaskId: string
}

/** 匿名批阅任务详情 - 对应 ReviewTaskDetailResponse */
export interface ReviewTaskDetailVO {
  reviewTaskId: string
  anonymousNo: string
  /** AI trace ID，便于教师在批阅工作台定位本题 AI 执行记录 */
  aiTraceId?: string
  /** AI 能力编码，来源于后端 AI 执行记录，前端不得从 traceId 推断 */
  aiAbilityCode?: AiAbilityCode
  /** AI 是否被限流或阻断，为 true 时教师需依赖人工复核 */
  aiLimited?: boolean
  examId: string
  paperInstanceId: string
  candidateRosterId?: string
  studentUserId: string
  studentNo: string
  studentName: string
  classId?: string
  className: string
  paperDisplay: PaperInstanceDisplayVO
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore: number
  sliceFileId?: string
  /** 原始扫描页引用，供教师对照整页扫描影像 */
  sourceScanPage?: MarkingScanPageRefVO
  recognizedAnswer?: string
  gradeResultId: string
  aiScore?: number
  aiDiagnostic?: string
  commentText?: string
  status: ReviewTaskStatusCode
}

/**
 * 查询匿名批阅任务列表
 * POST /api/mark/exams/review-tasks
 */
export function listReviewTasks(
  request: ReviewTaskQueryRequest,
): Promise<PageResult<ReviewTaskItemVO>> {
  return http.post<PageResult<ReviewTaskItemVO>>('/api/mark/exams/review-tasks', request)
}

/**
 * 查询匿名批阅任务详情
 * POST /api/mark/exams/review-tasks/detail
 */
export function getReviewTaskDetail(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailVO> {
  return http.post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/detail', request)
}

/**
 * 领取匿名批阅任务（分派给当前教师）
 * POST /api/mark/exams/review-tasks/claim
 */
export function claimReviewTask(request: ReviewTaskActionRequest): Promise<ReviewTaskDetailVO> {
  return http.post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/claim', request)
}

// ─── 批注与阅卷进度 ─────────────────────────────────────────────

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryRequest extends QueryDto {
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  gradeResultId?: string
}

/** 批注范围 - 与后端 AnnotationScope 枚举一致 */
export type AnnotationScopeCode = 'QUESTION' | 'PAGE'

/** 批注响应 - 对应 AnnotationResponse */
export interface AnnotationVO {
  annotationId: string
  examId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  pageId?: string
  gradeResultId?: string
  annotationScope?: AnnotationScopeCode
  annotationText?: string
  correlationId?: string
  createTime?: string
}
/** 阅卷进度响应 - 对应 MarkingProgressResponse */
export interface MarkingProgressVO {
  examId: string
  /** 试卷数量（含未绑定 / 冲突 / 已绑定的全部扫描卷面） */
  paperCount: number
  /** 可阅卷试卷数（bindingStatus = BOUND，完成率分母真源） */
  gradablePaperCount: number
  questionCount: number
  /** 应批阅题目总数 = gradablePaperCount × questionCount，已排除缺考 / 未绑定 / 冲突卷 */
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  openProcessingTaskCount: number
  scanAttentionCount: number
  reviewTaskStatusSummaryList: ReviewTaskStatusSummaryVO[]
  reviewQuestionProgressList: ReviewQuestionProgressItemVO[]
}

/** 复核任务状态汇总项 - 对应 ReviewTaskStatusSummaryResponse */
export interface ReviewTaskStatusSummaryVO {
  statusCode: ReviewTaskStatusCode
  taskCount: number
}

/** 按题目聚合的复核进度项 - 对应 ReviewQuestionProgressItemResponse */
export interface ReviewQuestionProgressItemVO {
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  totalTaskCount: number
  pendingTaskCount: number
  inProgressTaskCount: number
  approvedTaskCount: number
  rejectedTaskCount: number
}

/**
 * 查询批注记录
 * POST /api/mark/exams/annotations
 */
export function listAnnotations(
  request: AnnotationQueryRequest,
): Promise<PageResult<AnnotationVO>> {
  return http.post<PageResult<AnnotationVO>>('/api/mark/exams/annotations', request)
}

/**
 * 查询阅卷进度
 * POST /api/mark/exams/marking-progress
 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressVO> {
  return http.post<MarkingProgressVO>('/api/mark/exams/marking-progress', { examId })
}

/** 考试分数分布查询请求 */
export interface ExamScoreDistributionQueryRequest {
  examId: string
  classId?: string
}

/** 考试分数分布响应 */
export interface ExamScoreDistributionVO {
  examId: string
  classId?: string
  fullScore: number
  passScore: number
  participantCount: number
  passCount: number
  avgScore: number
  maxScore: number
  minScore: number
  stdDev: number
  ranges: string[]
  counts: number[]
}

/**
 * 查询考试分数分布（五级分段直方图）
 * POST /api/mark/exams/score-distribution
 */
export function getExamScoreDistribution(
  request: ExamScoreDistributionQueryRequest,
): Promise<ExamScoreDistributionVO> {
  return http.post<ExamScoreDistributionVO>('/api/mark/exams/score-distribution', request)
}
