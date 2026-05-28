import type { ScannerKioskScanMode } from './scanner-kiosk'
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
import http from '@/config/axios'

/** 试卷模板未配置业务码 - 与后端 ResultCodeEnum.EXAM_MARK_PAPER_TEMPLATE_NOT_CONFIGURED 对齐 */
export const PAPER_TEMPLATE_NOT_CONFIGURED_CODE = 20014

/** 考试状态编码 - 对应后端 ExamStatus 枚举（仅保留批改链有意义的状态） */
export type ExamStatusCode = 'ACTIVE' | 'CLOSED'

/** 考试状态文案映射 */
export const EXAM_STATUS_LABEL: Record<ExamStatusCode, string> = {
  ACTIVE: '正常',
  CLOSED: '已关闭',
}

/** 考试状态徽标颜色（统一 BadgeTone） */
export const EXAM_STATUS_COLOR: Record<ExamStatusCode, BadgeTone> = {
  ACTIVE: 'green',
  CLOSED: 'red',
}

/** 考试状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const EXAM_STATUS_TONE: Record<ExamStatusCode, BadgeTone> = {
  ACTIVE: 'green',
  CLOSED: 'gray',
}

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface ExamPageQueryPayload extends QueryDto {
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
  gradingStrategy?: string
  remark?: string
  createUser?: string
  createTime?: string
}

/** 考试范围班级引用 - 对应 ExamClassRefVO */
export interface ExamClassRefVO {
  classId: string
  className: string
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
  gradingStrategy?: string
  remark?: string
  createUser?: string
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
}

/** 创建考试请求 - 对应 ExamCreateRequest */
export interface ExamCreatePayload {
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
  gradingStrategy?: string
  remark?: string
}

/** 更新考试请求 - 对应 ExamUpdateRequest */
export interface ExamUpdatePayload extends ExamCreatePayload {
  /** 考试ID */
  examId: string
}

/** 删除考试请求 - 对应 ExamDeleteRequest */
export interface ExamDeletePayload {
  /** 考试ID */
  examId: string
}

/** 考生名册项 - 对应 ExamCandidateRosterRequest */
export interface ExamCandidateRosterPayload {
  classId?: string
  studentUserId: string
  studentNo: string
  studentName: string
}

/** 范围保存请求 - 对应 ExamScopeSaveRequest */
export interface ExamScopeSavePayload {
  examId: string
  classIds?: string[]
  candidates?: ExamCandidateRosterPayload[]
}

/** 页面模板项 - 对应 ExamPageTemplateRequest */
export interface ExamPageTemplatePayload {
  pageNo: number
  templateFileId?: string
  widthPx?: number
  heightPx?: number
}

/** 题目模板项 - 对应 ExamQuestionTemplateRequest */
export interface ExamQuestionTemplatePayload {
  questionNo: string
  questionType: string
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
export interface ExamTemplateSavePayload {
  examId: string
  templateName: string
  totalPages?: number
  pages?: ExamPageTemplatePayload[]
  questions?: ExamQuestionTemplatePayload[]
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
  questionType: string
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
  status?: string
  pages: ExamPaperPageTemplateVO[]
  questions: ExamQuestionTemplateVO[]
}

/**
 * 客观题比较策略编码 - 与后端 com.nybc.edu.common.enums.ObjectiveComparePolicy 一一对齐。
 * <ul>
 *   <li>EXACT_NORMALIZED：去空白并统一大小写后精确比较；</li>
 *   <li>CHOICE_SET：选择题集合判等，忽略顺序与分隔符；</li>
 *   <li>REGEX：教师配置正则表达式匹配 OCR 答案；</li>
 *   <li>NUMERIC_TOLERANCE：数值题按标准值、容差和可选单位判等；</li>
 *   <li>AI_GRADE：客观题未配标准答案或显式选 AI 评分时由 AI 给出建议得分（NEED_REVIEW），教师审核确认后落地。</li>
 * </ul>
 */
export type ObjectiveComparePolicyCode
  = | 'EXACT_NORMALIZED'
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
  { value: 'AI_GRADE', label: 'AI 评分（无标答时由 AI 给建议分，教师审核）' },
]

/** 标准答案保存请求 - 对应 ExamStandardAnswerSaveRequest */
export interface ExamStandardAnswerSavePayload {
  examId: string
  questionTemplateId: string
  /**
   * 客观题非 AI_GRADE 策略下必填；客观题 AI_GRADE 策略允许留空。
   * 主观题 standardAnswer 一律可选。
   */
  standardAnswer?: string
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: string
  numericTolerance?: string
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveNow?: boolean
}

/** 考生响应 - 对应 ExamCandidateResponse */
export interface ExamCandidateVO {
  candidateRosterId: string
  classId?: string
  className?: string
  studentUserId: string
  studentNo: string
  studentName: string
  status?: string
}

// ─── API 调用 ──────────────────────────────────────────────────

/**
 * 分页查询考试列表
 * POST /api/mark/exams/page
 */
export function pageExams(
  payload: ExamPageQueryPayload,
): Promise<PageResult<ExamSummaryVO>> {
  return http.post<unknown>('/api/mark/exams/page', payload)
    .then((value) => validatePageResult(value, validateExamSummary, '考试分页'))
}

/**
 * 查询考试详情
 * POST /api/mark/exams/detail
 */
export function getExamDetail(examId: string): Promise<ExamDetailVO> {
  return http.post<unknown>('/api/mark/exams/detail', { examId })
    .then(validateExamDetail)
}

/**
 * 创建考试主记录（创建即可进入扫描批改链路）
 * POST /api/mark/exams/create
 * 返回新考试ID
 */
export function createExam(payload: ExamCreatePayload): Promise<string> {
  return http.post<string>('/api/mark/exams/create', payload)
}

/**
 * 更新考试主信息
 * POST /api/mark/exams/update
 */
export function updateExam(payload: ExamUpdatePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/update', payload)
}

/**
 * 删除尚未进入后续链路的考试
 * POST /api/mark/exams/delete
 */
export function deleteExam(payload: ExamDeletePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/delete', payload)
}

/**
 * 保存考试范围（班级 + 考生名册），全量替换
 * POST /api/mark/exams/scope/save
 */
export function saveExamScope(payload: ExamScopeSavePayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/save', payload)
}

/**
 * 保存试卷模板（含页面 + 题目），全量替换
 * POST /api/mark/exams/template/save
 */
export function saveExamTemplate(
  payload: ExamTemplateSavePayload,
): Promise<string> {
  return http.post<string>('/api/mark/exams/template/save', payload)
}

/**
 * 查询考试当前模板
 * POST /api/mark/exams/template
 *
 * 注意：模板不存在、缺少页面或缺少题目时，后端返回 PAPER_TEMPLATE_NOT_CONFIGURED_CODE。
 */
export function getExamTemplate(examId: string): Promise<ExamTemplateVO> {
  return http.post<unknown>('/api/mark/exams/template', { examId })
    .then(validateExamTemplate)
}

/**
 * 判断后端是否返回“试卷模板尚未配置”业务态。
 * 只读取稳定 code，不依赖可变错误文案。
 */
export function isPaperTemplateNotConfiguredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const businessError = error as {
    code?: number | string
    response?: {
      data?: {
        code?: number | string
      }
    }
  }
  const code = businessError.code ?? businessError.response?.data?.code
  return Number(code) === PAPER_TEMPLATE_NOT_CONFIGURED_CODE
}

/**
 * 保存题目标准答案
 * POST /api/mark/exams/standard-answer/save
 */
export function saveStandardAnswer(
  payload: ExamStandardAnswerSavePayload,
): Promise<string> {
  return http.post<string>('/api/mark/exams/standard-answer/save', payload)
}

/**
 * 查询考试当前考生名单
 * POST /api/mark/exams/candidates
 */
export function listExamCandidates(examId: string): Promise<ExamCandidateVO[]> {
  return http.post<unknown>('/api/mark/exams/candidates', { examId })
    .then(validateExamCandidateList)
}

// ─── 考试成绩汇总（成绩确认 / 成绩发布列表） ──────────────────────────

/** 与后端 FinalScoreStatus 枚举对齐（共 6 个状态） */
export type FinalScoreStatusCode
  = | 'PENDING'
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

/** 最终成绩状态徽标颜色（统一 BadgeTone，cyan 不在 BadgeTone 中改为 blue） */
export const FINAL_SCORE_STATUS_COLOR: Record<FinalScoreStatusCode, BadgeTone> = {
  PENDING: 'gray',
  CALCULATED: 'blue',
  CONFIRMED: 'blue',
  CORRECTED: 'orange',
  PUBLISHED: 'green',
  WITHDRAWN: 'red',
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

/** 考试成绩汇总查询请求 - 对应 ExamScoreSummaryQueryRequest */
export interface ExamScoreSummaryQueryPayload extends QueryDto {
  examId: string
  /** 最终成绩状态过滤；空表示不过滤，含未生成最终成绩的考生 */
  finalScoreStatus?: FinalScoreStatusCode
  /** 学号或姓名关键词（模糊匹配） */
  keyword?: string
}

/** 考试成绩汇总项 - 对应 ExamScoreSummaryItemResponse */
export interface ExamScoreSummaryItemVO {
  candidateRosterId: string
  classId?: string
  studentClassName?: string
  studentUserId: string
  studentNo: string
  studentName: string
  candidateStatus?: string
  /** 试卷实例ID，未绑定试卷时为 undefined */
  paperInstanceId?: string
  bindingStatus?: string
  scanBatchId?: string
  finalScoreStatus: FinalScoreStatusCode
  finalScoreStatusMessage?: string
  finalScore?: number
  confirmedTime?: string
  confirmedBy?: string
}

/**
 * 分页查询考试成绩汇总
 * POST /api/mark/exams/score-summary
 */
export function pageExamScoreSummary(
  payload: ExamScoreSummaryQueryPayload,
): Promise<PageResult<ExamScoreSummaryItemVO>> {
  return http.post<PageResult<ExamScoreSummaryItemVO>>('/api/mark/exams/score-summary', payload)
}

// ─── 扫描与导入链路 ─────────────────────────────────────────────

/** 扫描页登记请求 - 对应 ExamScannedPageRegisterRequest */
export interface ExamScannedPageRegisterPayload {
  examId: string
  scanBatchId: string
  paperInstanceId?: string
  pageSeq?: number
  templatePageNo?: number
  /** 扫描页文件ID（必填） */
  fileId: string
  qualityStatus?: string
}

/** 扫描页登记响应 - 对应 ExamScannedPageRegisterResponse */
export interface ExamScannedPageRegisterVO {
  pageId?: string
  paperInstanceId?: string
}

/** 扫描来源页映射 - 对应 ExamScanSourcePageMappingRequest */
export interface ExamScanSourcePageMappingPayload {
  /** PDF 页号（从 1 开始），单张图片固定为 1 */
  sourcePageNo: number
  pageSeq?: number
  /** 对应模板页号（必填） */
  templatePageNo: number
}

/** 扫描来源文件导入请求 - 对应 ExamScanSourceImportRequest */
export interface ExamScanSourceImportPayload {
  examId: string
  scanBatchId: string
  paperInstanceId?: string
  /** 扫描来源文件ID（必填） */
  sourceFileId: string
  startPageSeq?: number
  startTemplatePageNo?: number
  /** 来源页到模板页的显式映射；不传时按起始页号顺序映射 */
  pageMappings?: ExamScanSourcePageMappingPayload[]
}

/** 扫描来源文件导入响应 - 对应 ExamScanSourceImportResponse */
export interface ExamScanSourceImportVO {
  paperInstanceId?: string
  registeredPageCount?: number
  pageIds?: string[]
}

/** 扫描异常待办查询请求 - 对应 ScanAttentionQueryRequest */
export type ScanAttentionTypeCode
  = | 'QUALITY_BLOCK'
    | 'PROCESSING_BLOCK'
    | 'DUPLICATE_PENDING'
    | 'RECOGNITION_REVIEW'

export type ScanAttentionStatusCode = 'BLOCKED' | 'FAILED' | 'PENDING' | 'NEED_REVIEW'

/** 扫描异常来源类型 - 对应后端扫描异常聚合 SQL 固定来源 */
export type ScanAttentionSourceTypeCode
  = | 'SCANNED_PAGE'
    | 'PROCESSING_TASK'
    | 'DUPLICATE_RESOLUTION'
    | 'GRADE_RESULT'

export interface ScanAttentionQueryPayload {
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
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  pageId?: string
  questionTemplateId?: string
  status: ScanAttentionStatusCode
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
export type ScanBatchStatusCode
  = | 'RECEIVED'
    | 'BLOCKED'
    | 'BOUND'
    | 'COMPLETED'
    | 'DISCARDED'

/** 扫描批次视图 - 对应 ExamScannerBatchResponse */
export interface ExamScannerBatchVO {
  /** 扫描批次ID */
  scanBatchId: string
  examId: string
  /** 扫描录入模式 */
  scanMode?: ScannerKioskScanMode
  batchNo?: string
  batchExternalNo?: string
  scannerDeviceId?: string
  scannerStationId?: string
  /** 来源文件ID集合 */
  sourceFileIds?: string[]
  /** 补扫目标页号 */
  targetPageNo?: number
  /** 补扫原因 */
  supplementReason?: string
  pageCount?: number
  status: ScanBatchStatusCode
  statusMessage: string
  diagnostic?: string
  scanStartTime?: string
  scanEndTime?: string
  createTime?: string
  updateTime?: string
  /** 批次内事件数量 */
  eventCount?: number
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
  batchNo?: string
  eventCount?: number
  fileCount?: number
  pageCount?: number
  scanStartTime?: string
  scanEndTime?: string
}

/** 扫描批次创建请求 - 对应 ExamScannerBatchCreateRequest */
export interface ExamScannerBatchCreatePayload {
  examId: string
  /** 扫描设备ID集合（必填，至少 1 个） */
  scannerDeviceIds: string[]
  /** 可选：扫描仪 IP 集合，用于在同一组设备里按 IP 进一步过滤 */
  scannerIps?: string[]
  /** 扫描时间窗口起点 */
  scanStartTime: string
  /** 扫描时间窗口终点 */
  scanEndTime: string
  /** 教师备注的批次外部编号（可选） */
  batchExternalNo?: string
}

/** 扫描批次分页查询请求 - 对应 ExamScannerBatchQueryRequest */
export interface ExamScannerBatchQueryPayload extends QueryDto {
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
  payload: ExamScannerBatchCreatePayload,
): Promise<ExamScannerBatchCreateVO> {
  return http.post<unknown>('/api/mark/exams/scanner-batches/create', payload)
    .then(validateScannerBatchCreate)
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
  payload: ExamScannerBatchCreatePayload,
): Promise<ExamScannerBatchPreviewVO> {
  return http.post<unknown>('/api/mark/exams/scanner-batches/preview', payload)
    .then(validateScannerBatchPreview)
}

/**
 * 分页查询扫描批次
 * POST /api/mark/exams/scanner-batches/page
 */
export function pageScannerBatches(
  payload: ExamScannerBatchQueryPayload,
): Promise<PageResult<ExamScannerBatchVO>> {
  return http.post<unknown>('/api/mark/exams/scanner-batches/page', payload)
    .then((value) => validatePageResult(value, validateScannerBatch, '扫描批次分页'))
}

/**
 * 登记扫描页并返回试卷实例
 * POST /api/mark/exams/scanned-pages/register
 */
export function registerScannedPage(
  payload: ExamScannedPageRegisterPayload,
): Promise<ExamScannedPageRegisterVO> {
  return http.post<unknown>('/api/mark/exams/scanned-pages/register', payload)
    .then(validateScannedPageRegister)
}

/**
 * 导入扫描来源文件并登记扫描页
 * POST /api/mark/exams/scan-sources/import
 */
export function importScanSource(
  payload: ExamScanSourceImportPayload,
): Promise<ExamScanSourceImportVO> {
  return http.post<unknown>('/api/mark/exams/scan-sources/import', payload)
    .then(validateScanSourceImport)
}

/**
 * 查询扫描异常待办列表
 * POST /api/mark/exams/scan-attentions
 */
export function listScanAttentions(
  payload: ScanAttentionQueryPayload,
): Promise<ScanAttentionItemVO[]> {
  return http.post<unknown>('/api/mark/exams/scan-attentions', payload)
    .then(validateScanAttentionList)
}

// ─── 试卷身份绑定与解匿名 ────────────────────────────────────────

/** 试卷身份绑定请求 - 对应 ExamPaperBindRequest */
export interface ExamPaperBindPayload {
  examId: string
  scanBatchId: string
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus: 'NORMAL' | 'MAKEUP' | 'RETAKE'
  attemptNo?: string
}

/** 解匿名请求 - 对应 DeanonymizeRequest */
export interface DeanonymizePayload {
  examId: string
  paperInstanceId: string
  /** 解匿名业务场景（必填） */
  revealScenario: string
  /** 解匿名原因（必填） */
  reason: string
}

/** 解匿名响应 - 对应 DeanonymizeResponse */
export interface DeanonymizeVO {
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
}

/**
 * 确认试卷和考生身份绑定关系
 * POST /api/mark/exams/papers/bind
 */
export function bindPaper(payload: ExamPaperBindPayload): Promise<boolean> {
  return http.post<unknown>('/api/mark/exams/papers/bind', payload)
    .then(validateBooleanResult)
}

/**
 * 解匿名查看试卷身份
 * POST /api/mark/exams/papers/deanonymize
 */
export function deanonymizePaper(payload: DeanonymizePayload): Promise<DeanonymizeVO> {
  return http.post<unknown>('/api/mark/exams/papers/deanonymize', payload)
    .then(validateDeanonymize)
}

// ─── 识别结果提交 ──────────────────────────────────────────────

/** 题目识别结果提交请求 - 对应 ExamRecognitionSubmitRequest */
export interface ExamRecognitionSubmitPayload {
  examId: string
  paperInstanceId: string
  questionTemplateId: string
  responseSliceId?: string
  pageId?: string
  sliceFileId?: string
  recognizedAnswer?: string
  engineTraceId?: string
}

/** 识别失败复核提交请求 - 对应 RecognitionFailureSubmitRequest */
export interface RecognitionFailureSubmitPayload {
  examId: string
  paperInstanceId: string
  questionTemplateId?: string
  /** 失败诊断（必填） */
  diagnostic: string
}

/**
 * 提交题目识别结果并生成批改结果
 * POST /api/mark/exams/recognition/submit
 * @returns 批改结果ID
 */
export function submitRecognition(payload: ExamRecognitionSubmitPayload): Promise<string> {
  return http.post<string>('/api/mark/exams/recognition/submit', payload)
}

/**
 * 提交识别失败复核任务
 * POST /api/mark/exams/recognition/failure
 * @returns 批改结果ID
 */
export function submitRecognitionFailure(
  payload: RecognitionFailureSubmitPayload,
): Promise<string> {
  return http.post<string>('/api/mark/exams/recognition/failure', payload)
}

// ─── 评分确认与试卷成绩 ─────────────────────────────────────────

/** 题目成绩确认请求 - 对应 ExamGradeConfirmRequest */
export interface ExamGradeConfirmPayload {
  examId: string
  /** 题目批改结果ID */
  gradeResultId: string
  /** 最终分（必填） */
  finalScore: number
  commentText?: string
  annotationText?: string
  anchorText?: string
}

/** 试卷最终成绩确认请求 - 对应 ExamFinalScoreConfirmRequest */
export interface ExamFinalScoreConfirmPayload {
  examId: string
  paperInstanceId: string
}

/** 试卷题目得分明细 - 对应 ExamQuestionScoreDto */
export interface ExamQuestionScoreVO {
  questionTemplateId: string
  questionNo: string
  questionType: string
  fullScore: number
  finalScore?: number
  gradeStatus?: string
  objectiveResult?: string
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
export function confirmQuestionGrade(payload: ExamGradeConfirmPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/confirm', payload)
}

/** 题目成绩批量确认条目 - 对应 ExamGradeBatchConfirmRequest.Item */
export interface ExamGradeBatchConfirmItem {
  /** 题目批改结果ID */
  gradeResultId: string
  /** 最终分（必填） */
  finalScore: number
  /** 评语，可空 */
  commentText?: string
  /** 批注内容，可空 */
  annotationText?: string
  /** 批注锚点，可空 */
  anchorText?: string
}

/** 题目成绩批量确认请求 - 对应 ExamGradeBatchConfirmRequest */
export interface ExamGradeBatchConfirmPayload {
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
 * 单题失败不阻塞其余条目，响应汇总成功条目和失败明细。
 * POST /api/mark/exams/question-grades/batch-confirm
 */
export function batchConfirmQuestionGrades(
  payload: ExamGradeBatchConfirmPayload,
): Promise<ExamGradeBatchConfirmResponse> {
  return http.post<ExamGradeBatchConfirmResponse>(
    '/api/mark/exams/question-grades/batch-confirm',
    payload,
  )
}

/** 单题 AI 复评请求 - 对应 ExamQuestionAiRescoreRequest */
export interface ExamQuestionAiRescorePayload {
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

/** 单题 AI 复评结果 - 对应 SubjectiveGradeSuggestionResult */
export interface SubjectiveGradeSuggestionResultVO {
  suggested?: boolean
  suggestedScore?: number
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
 * 仅服务教师在阅卷工作台对整卷 AI 建议有异议时的题目级辅助复评；
 * 不属于首次 OCR 后的整卷 AI 主链，也不对学生开放。
 * 复评只覆盖 suggestedScore / aiTraceId / aiDiagnostic / aiLimited 与教师可读诊断；
 * gradeStatus 保持 NEED_REVIEW，finalScore 保持为空，仍需教师确认入口写最终分。
 *
 * POST /api/mark/exams/question-grades/ai-rescore
 */
export function rescoreQuestionByAi(
  payload: ExamQuestionAiRescorePayload,
): Promise<SubjectiveGradeSuggestionResultVO> {
  return http.post<unknown>(
    '/api/mark/exams/question-grades/ai-rescore',
    payload,
  ).then(validateSubjectiveGradeSuggestionResult)
}

/** AI 能力编码 - 17B 文档定义；首次整卷 AI / 教师异议单题 AI 复评 */
export type AiAbilityCode
  = | 'PAPER_GRADE_SUGGESTION'
    | 'SUBJECTIVE_GRADE_SUGGESTION'

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
export interface ExamQuestionAiExecutionsPayload {
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

function assertRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName}必须是对象`)
  }
  return value as Record<string, unknown>
}

function requireRecordString(record: Record<string, unknown>, key: string, fieldName: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName}不能为空`)
  }
  return value
}

function optionalRecordString(record: Record<string, unknown>, key: string, fieldName: string): string | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName}必须是字符串`)
  }
  return value
}

function requireRecordNumber(record: Record<string, unknown>, key: string, fieldName: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName}必须是数字`)
  }
  return value
}

function optionalRecordNumber(record: Record<string, unknown>, key: string, fieldName: string): number | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName}必须是数字`)
  }
  return value
}

function optionalRecordBoolean(record: Record<string, unknown>, key: string, fieldName: string): boolean | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName}必须是布尔值`)
  }
  return value
}

function requireAiAbilityCode(record: Record<string, unknown>, key: string): AiAbilityCode {
  const value = record[key]
  if (value === 'PAPER_GRADE_SUGGESTION' || value === 'SUBJECTIVE_GRADE_SUGGESTION') {
    return value
  }
  throw new Error(`AI 能力编码存在未定义枚举值：${String(value)}`)
}

function requireAiExecutionStatus(record: Record<string, unknown>, key: string): AiExecutionStatusCode {
  const value = record[key]
  if (value === 'SUCCESS' || value === 'BLOCKED' || value === 'FAILED') {
    return value
  }
  throw new Error(`AI 执行状态存在未定义枚举值：${String(value)}`)
}

function optionalAiProviderType(record: Record<string, unknown>, key: string, fieldName: string): AiProviderTypeCode | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (value === 'OPENAI' || value === 'DEEPSEEK' || value === 'QWEN') {
    return value
  }
  throw new Error(`${fieldName}存在未定义枚举值：${String(value)}`)
}

function requireAiProviderType(record: Record<string, unknown>, key: string, fieldName: string): AiProviderTypeCode {
  const value = optionalAiProviderType(record, key, fieldName)
  if (!value) {
    throw new Error(`${fieldName}不能为空`)
  }
  return value
}

function validateSubjectiveGradeSuggestionResult(payload: unknown): SubjectiveGradeSuggestionResultVO {
  const record = assertRecord(payload, '单题 AI 复评结果')
  const suggested = optionalRecordBoolean(record, 'suggested', '单题 AI 复评结果.suggested')
  const suggestedScore = optionalRecordNumber(record, 'suggestedScore', '单题 AI 复评结果.suggestedScore')
  const diagnostic = optionalRecordString(record, 'diagnostic', '单题 AI 复评结果.diagnostic')
  if (suggested === true && suggestedScore === undefined) {
    throw new Error('单题 AI 复评结果已建议但缺少建议分')
  }
  if (suggested !== true && !diagnostic) {
    throw new Error('单题 AI 复评结果未建议时必须返回诊断信息')
  }
  return {
    suggested,
    suggestedScore,
    modelProfileId: optionalRecordString(record, 'modelProfileId', '单题 AI 复评结果.modelProfileId'),
    providerType: optionalAiProviderType(record, 'providerType', '单题 AI 复评结果.providerType'),
    modelName: optionalRecordString(record, 'modelName', '单题 AI 复评结果.modelName'),
    diagnostic,
    evidenceSummary: optionalRecordString(record, 'evidenceSummary', '单题 AI 复评结果.evidenceSummary'),
    traceId: optionalRecordString(record, 'traceId', '单题 AI 复评结果.traceId'),
    limited: optionalRecordBoolean(record, 'limited', '单题 AI 复评结果.limited'),
    riskFlags: Array.isArray(record.riskFlags)
      ? record.riskFlags as SubjectiveAiRiskFlagVO[]
      : undefined,
  }
}

function validateAiExecutionItem(payload: unknown): ExamQuestionAiExecutionItemVO {
  const record = assertRecord(payload, '单题 AI 执行记录')
  return {
    traceId: requireRecordString(record, 'traceId', '单题 AI 执行记录.traceId'),
    abilityCode: requireAiAbilityCode(record, 'abilityCode'),
    status: requireAiExecutionStatus(record, 'status'),
    providerType: requireAiProviderType(record, 'providerType', '单题 AI 执行记录.providerType'),
    modelName: requireRecordString(record, 'modelName', '单题 AI 执行记录.modelName'),
    requestSummary: optionalRecordString(record, 'requestSummary', '单题 AI 执行记录.requestSummary'),
    responseSummary: optionalRecordString(record, 'responseSummary', '单题 AI 执行记录.responseSummary'),
    diagnostic: optionalRecordString(record, 'diagnostic', '单题 AI 执行记录.diagnostic'),
    latencyMs: requireRecordString(record, 'latencyMs', '单题 AI 执行记录.latencyMs'),
    createTime: requireRecordString(record, 'createTime', '单题 AI 执行记录.createTime'),
    createUser: requireRecordString(record, 'createUser', '单题 AI 执行记录.createUser'),
  }
}

function validateAiExecutionList(payload: unknown): ExamQuestionAiExecutionItemVO[] {
  if (!Array.isArray(payload)) {
    throw new TypeError('单题 AI 执行记录列表必须是数组')
  }
  return payload.map(validateAiExecutionItem)
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
  payload: ExamQuestionAiExecutionsPayload,
): Promise<ExamQuestionAiExecutionItemVO[]> {
  return http.post<unknown>(
    '/api/mark/exams/question-grades/ai-executions',
    payload,
  ).then(validateAiExecutionList)
}

/**
 * 确认试卷最终成绩。
 * 状态机：未存在 / CALCULATED / WITHDRAWN / CORRECTED → CONFIRMED。
 * 该接口仅落库 CONFIRMED 状态，不发送学生通知；通知由 publishFinalScore 触发。
 * POST /api/mark/exams/final-scores/confirm
 * @returns 最终成绩ID
 */
export function confirmFinalScore(payload: ExamFinalScoreConfirmPayload): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/confirm', payload)
}

/** 试卷最终成绩发布请求 - 对应 ExamFinalScorePublishRequest */
export interface ExamFinalScorePublishPayload {
  examId: string
  paperInstanceId: string
}

/**
 * 发布试卷最终成绩。
 * 状态机：CONFIRMED / WITHDRAWN / CORRECTED → PUBLISHED，并向学生发送通知。
 * POST /api/mark/exams/final-scores/publish
 * @returns 最终成绩ID
 */
export function publishFinalScore(payload: ExamFinalScorePublishPayload): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/publish', payload)
}

/** 试卷最终成绩撤回请求 - 对应 ExamFinalScoreWithdrawRequest */
export interface ExamFinalScoreWithdrawPayload {
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
export function withdrawFinalScore(payload: ExamFinalScoreWithdrawPayload): Promise<string> {
  return http.post<string>('/api/mark/exams/final-scores/withdraw', payload)
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
export interface ReviewTaskQueryPayload extends QueryDto {
  examId: string
  /** 复核状态编码，空查全部 */
  status?: ReviewTaskStatusCode
  questionTemplateId?: string
}

/**
 * 复核任务类型编码 - 与后端 com.nybc.edu.common.enums.TaskType 一一对齐。
 * 仅复核任务相关 3 类（其它任务类型不会出现在复核任务列表中）。
 */
export type ReviewTaskTypeCode
  = | 'OBJECTIVE_AUTO_REVIEW'
    | 'OBJECTIVE_AI_REVIEW'
    | 'SUBJECTIVE_AI_REVIEW'

/** 复核任务类型中文标签与颜色，便于前端 tag 渲染 */
export const REVIEW_TASK_TYPE_META: Record<
  ReviewTaskTypeCode,
  { label: string, color: 'blue' | 'green' | 'purple' }
> = {
  OBJECTIVE_AUTO_REVIEW: { label: '客观题（硬比对）', color: 'green' },
  OBJECTIVE_AI_REVIEW: { label: '客观题（AI 评分）', color: 'blue' },
  SUBJECTIVE_AI_REVIEW: { label: '主观题（AI 评分）', color: 'purple' },
}

/**
 * 批改来源编码 - 与后端 com.nybc.edu.common.enums.GradeSource 一一对齐。
 */
export type GradeSourceCode
  = | 'AUTO_OBJECTIVE'
    | 'AUTO_OBJECTIVE_AI'
    | 'LOCAL_SUBJECTIVE_AI'
    | 'TEACHER'
    | 'RECOGNITION_FAILURE'

/** 批改来源中文标签 */
export const GRADE_SOURCE_LABEL: Record<GradeSourceCode, string> = {
  AUTO_OBJECTIVE: '客观题硬比对',
  AUTO_OBJECTIVE_AI: '客观题 AI 评分',
  LOCAL_SUBJECTIVE_AI: '主观题 AI 评分',
  TEACHER: '教师人工批改',
  RECOGNITION_FAILURE: 'OCR 识别失败转人工',
}

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
  questionTemplateId: string
  questionNo: string
  fullScore: number
  gradeResultId: string
  suggestedScore?: number
  status: ReviewTaskStatusCode
  assignedTeacherUserId?: string
  /** 复核任务类型编码，区分客观题硬比对 / 客观题 AI / 主观题 AI 三个通道 */
  reviewType?: ReviewTaskTypeCode
  /** 批改来源编码，便于前端按通道筛选与显示颜色标签 */
  gradeSource?: GradeSourceCode
  updateTime?: string
}

/** 匿名批阅任务动作请求 - 对应 ReviewTaskActionRequest */
export interface ReviewTaskActionPayload {
  examId: string
  reviewTaskId: string
}

/** 匿名批阅任务详情 - 对应 ReviewTaskDetailResponse */
export interface ReviewTaskDetailVO {
  reviewTaskId: string
  anonymousNo: string
  /** AI trace ID，便于教师在批阅工作台定位本题 AI 执行记录 */
  aiTraceId?: string
  /** AI 是否被限流或阻断，为 true 时教师需依赖人工复核 */
  aiLimited?: boolean
  examId: string
  paperInstanceId: string
  questionTemplateId: string
  questionNo: string
  questionType: string
  fullScore: number
  sliceFileId?: string
  recognizedAnswer?: string
  gradeResultId: string
  suggestedScore?: number
  aiDiagnostic?: string
  commentText?: string
  status: ReviewTaskStatusCode
}

/**
 * 查询匿名批阅任务列表
 * POST /api/mark/exams/review-tasks
 */
export function listReviewTasks(payload: ReviewTaskQueryPayload): Promise<PageResult<ReviewTaskItemVO>> {
  return http.post<unknown>('/api/mark/exams/review-tasks', payload)
    .then((value) => validatePageResult(value, validateReviewTaskItem, '复核任务分页'))
}

/**
 * 查询匿名批阅任务详情
 * POST /api/mark/exams/review-tasks/detail
 */
export function getReviewTaskDetail(payload: ReviewTaskActionPayload): Promise<ReviewTaskDetailVO> {
  return http.post<unknown>('/api/mark/exams/review-tasks/detail', payload)
    .then(validateReviewTaskDetail)
}

/**
 * 领取匿名批阅任务（分派给当前教师）
 * POST /api/mark/exams/review-tasks/claim
 */
export function claimReviewTask(payload: ReviewTaskActionPayload): Promise<ReviewTaskDetailVO> {
  return http.post<unknown>('/api/mark/exams/review-tasks/claim', payload)
    .then(validateReviewTaskDetail)
}

// ─── 批注与阅卷进度 ─────────────────────────────────────────────

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryPayload extends QueryDto {
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  gradeResultId?: string
}

/** 批注响应 - 对应 AnnotationResponse */
export interface AnnotationVO {
  annotationId: string
  examId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  gradeResultId?: string
  annotationText?: string
  anchorText?: string
  createTime?: string
}

/** 阅卷进度查询请求 - 对应 MarkingProgressQueryRequest */
export interface MarkingProgressQueryPayload {
  examId: string
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
export function listAnnotations(payload: AnnotationQueryPayload): Promise<PageResult<AnnotationVO>> {
  return http.post<PageResult<AnnotationVO>>('/api/mark/exams/annotations', payload)
}

/**
 * 查询阅卷进度
 * POST /api/mark/exams/marking-progress
 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressVO> {
  return http.post<unknown>('/api/mark/exams/marking-progress', { examId })
    .then(validateMarkingProgress)
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requirePageNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) {
      return parsed
    }
  }
  throw new TypeError(`${fieldName} 接口返回格式错误`)
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateBooleanResult(value: unknown): boolean {
  return requireBoolean(value, '操作结果')
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalFiniteNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}
function optionalStringList(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireStringList(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateExamSummary(value: unknown): ExamSummaryVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考试列表项接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    examId: requireString(result.examId, '考试 ID'),
    courseId: optionalString(result.courseId, '课程 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: requireString(result.examNo, '考试编号'),
    academicYear: optionalString(result.academicYear, '学年'),
    semester: optionalString(result.semester, '学期'),
    status: requireExamStatus(result.status, '考试状态'),
    statusMessage: requireString(result.statusMessage, '考试状态文案'),
    examStartTime: optionalString(result.examStartTime, '考试开始时间'),
    examEndTime: optionalString(result.examEndTime, '考试结束时间'),
    gradingStrategy: optionalString(result.gradingStrategy, '批改策略'),
    remark: optionalString(result.remark, '备注'),
    createUser: optionalString(result.createUser, '创建人'),
    createTime: optionalString(result.createTime, '创建时间'),
  }
}

function validateExamClassRef(value: unknown): ExamClassRefVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考试班级引用接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    classId: requireString(result.classId, '班级 ID'),
    className: requireString(result.className, '班级名称'),
  }
}

function validateExamClassRefs(
  value: unknown,
  classIds: string[],
): ExamClassRefVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('考试班级引用集合接口返回格式错误')
  }
  if (value.length !== classIds.length) {
    throw new TypeError('考试班级引用与班级 ID 数量不一致')
  }
  const refs = value.map(validateExamClassRef)
  for (let i = 0; i < refs.length; i += 1) {
    if (refs[i].classId !== classIds[i]) {
      throw new TypeError('考试班级引用与班级 ID 顺序不一致')
    }
  }
  return refs
}

function validateExamDetail(value: unknown): ExamDetailVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考试详情接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  const templateId = optionalString(result.templateId, '模板 ID')
  const templateName = optionalString(result.templateName, '模板名称')
  const totalPages = optionalFiniteNumber(result.totalPages, '模板总页数')
  if (templateId && (!templateName || totalPages === undefined)) {
    throw new TypeError('考试详情接口模板摘要返回格式错误')
  }
  const classIds = requireStringList(result.classIds, '班级范围')
  return {
    examId: requireString(result.examId, '考试 ID'),
    courseId: optionalString(result.courseId, '课程 ID'),
    examName: requireString(result.examName, '考试名称'),
    examNo: requireString(result.examNo, '考试编号'),
    academicYear: optionalString(result.academicYear, '学年'),
    semester: optionalString(result.semester, '学期'),
    status: requireExamStatus(result.status, '考试状态'),
    statusMessage: requireString(result.statusMessage, '考试状态文案'),
    examStartTime: optionalString(result.examStartTime, '考试开始时间'),
    examEndTime: optionalString(result.examEndTime, '考试结束时间'),
    gradingStrategy: optionalString(result.gradingStrategy, '批改策略'),
    remark: optionalString(result.remark, '备注'),
    createUser: optionalString(result.createUser, '创建人'),
    createTime: optionalString(result.createTime, '创建时间'),
    updateTime: optionalString(result.updateTime, '更新时间'),
    classIds,
    classRefs: validateExamClassRefs(result.classRefs, classIds),
    templateId,
    templateName,
    totalPages,
    questionCount: requireFiniteNumber(result.questionCount, '题目数量'),
    answerCount: requireFiniteNumber(result.answerCount, '标准答案数量'),
    candidateCount: requireFiniteNumber(result.candidateCount, '考生数量'),
  }
}

function validateExamPageTemplate(value: unknown): ExamPaperPageTemplateVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('试卷页面模板接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    pageTemplateId: requireString(result.pageTemplateId, '页面模板 ID'),
    pageNo: requireFiniteNumber(result.pageNo, '页码'),
    templateFileId: optionalString(result.templateFileId, '模板文件 ID'),
    widthPx: optionalFiniteNumber(result.widthPx, '模板页宽度'),
    heightPx: optionalFiniteNumber(result.heightPx, '模板页高度'),
  }
}

function validateExamQuestionTemplate(value: unknown): ExamQuestionTemplateVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('试题模板接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    questionTemplateId: requireString(result.questionTemplateId, '题目模板 ID'),
    questionNo: requireString(result.questionNo, '题号'),
    questionType: requireString(result.questionType, '题型'),
    fullScore: requireFiniteNumber(result.fullScore, '满分'),
    pageNo: optionalFiniteNumber(result.pageNo, '题目页码'),
    x: optionalFiniteNumber(result.x, '题目区域 X 坐标'),
    y: optionalFiniteNumber(result.y, '题目区域 Y 坐标'),
    width: optionalFiniteNumber(result.width, '题目区域宽度'),
    height: optionalFiniteNumber(result.height, '题目区域高度'),
    knowledgeId: optionalString(result.knowledgeId, '知识点 ID'),
    sortNo: optionalFiniteNumber(result.sortNo, '排序号'),
    questionStem: optionalString(result.questionStem, '题干文本'),
  }
}

function validateExamTemplate(value: unknown): ExamTemplateVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('试卷模板接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.pages)) {
    throw new TypeError('试卷模板页面列表接口返回格式错误')
  }
  if (!Array.isArray(result.questions)) {
    throw new TypeError('试卷模板题目列表接口返回格式错误')
  }
  return {
    templateId: requireString(result.templateId, '模板 ID'),
    examId: requireString(result.examId, '考试 ID'),
    templateName: requireString(result.templateName, '模板名称'),
    totalPages: requireFiniteNumber(result.totalPages, '模板总页数'),
    status: optionalString(result.status, '模板状态'),
    pages: result.pages.map(validateExamPageTemplate),
    questions: result.questions.map(validateExamQuestionTemplate),
  }
}

function validatePageResult<T>(
  value: unknown,
  itemValidator: (item: unknown) => T,
  fieldName: string,
): PageResult<T> {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.list)) {
    throw new TypeError(`${fieldName} 列表接口返回格式错误`)
  }
  return {
    list: result.list.map(itemValidator),
    total: requirePageNumber(result.total, `${fieldName} 总数`),
    pageNum: requirePageNumber(result.pageNum, `${fieldName} 页码`),
    pageSize: requirePageNumber(result.pageSize, `${fieldName} 每页数量`),
    pages: requirePageNumber(result.pages, `${fieldName} 总页数`),
  }
}

function requireScanBatchStatus(
  value: unknown,
  fieldName: string,
): ScanBatchStatusCode {
  if (
    value !== 'RECEIVED'
    && value !== 'BLOCKED'
    && value !== 'BOUND'
    && value !== 'COMPLETED'
    && value !== 'DISCARDED'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalScannerKioskScanMode(
  value: unknown,
  fieldName: string,
): ScannerKioskScanMode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== 'DIRECT' && value !== 'SUPPLEMENT' && value !== 'ARCHIVE') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireExamStatus(value: unknown, fieldName: string): ExamStatusCode {
  if (value !== 'ACTIVE' && value !== 'CLOSED') {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function requireReviewTaskStatus(value: unknown, fieldName: string): ReviewTaskStatusCode {
  if (
    value !== 'PENDING'
    && value !== 'IN_PROGRESS'
    && value !== 'APPROVED'
    && value !== 'REJECTED'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalReviewTaskType(
  value: unknown,
  fieldName: string,
): ReviewTaskTypeCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (
    value !== 'OBJECTIVE_AUTO_REVIEW'
    && value !== 'OBJECTIVE_AI_REVIEW'
    && value !== 'SUBJECTIVE_AI_REVIEW'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function optionalGradeSource(value: unknown, fieldName: string): GradeSourceCode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (
    value !== 'AUTO_OBJECTIVE'
    && value !== 'AUTO_OBJECTIVE_AI'
    && value !== 'LOCAL_SUBJECTIVE_AI'
    && value !== 'TEACHER'
    && value !== 'RECOGNITION_FAILURE'
  ) {
    throw new TypeError(`${fieldName} 接口返回格式错误`)
  }
  return value
}

function validateExamCandidate(value: unknown): ExamCandidateVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('考生名册项接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  const classId = optionalString(result.classId, '班级 ID')
  return {
    candidateRosterId: requireString(result.candidateRosterId, '考生名册 ID'),
    classId,
    className: classId ? requireString(result.className, '班级名称') : optionalString(result.className, '班级名称'),
    studentUserId: requireString(result.studentUserId, '学生用户 ID'),
    studentNo: requireString(result.studentNo, '学号'),
    studentName: requireString(result.studentName, '学生姓名'),
    status: optionalString(result.status, '考生状态'),
  }
}

function validateExamCandidateList(value: unknown): ExamCandidateVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('考生名册列表接口返回格式错误')
  }
  return value.map(validateExamCandidate)
}

function validateScannerBatchDeviceBreakdown(value: unknown): ExamScannerBatchDeviceBreakdownVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描设备分布接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    scannerDeviceId: requireString(result.scannerDeviceId, '扫描设备业务 ID'),
    scannerIp: requireString(result.scannerIp, '扫描设备 IP'),
    eventCount: requireFiniteNumber(result.eventCount, '扫描事件数量'),
    pageCount: requireFiniteNumber(result.pageCount, '扫描页数'),
  }
}

function validateScannerBatchCreate(value: unknown): ExamScannerBatchCreateVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描批次创建接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    scanBatchId: requireString(result.scanBatchId, '扫描批次 ID'),
    batchNo: optionalString(result.batchNo, '扫描批次号'),
    eventCount: optionalFiniteNumber(result.eventCount, '扫描事件数量'),
    fileCount: optionalFiniteNumber(result.fileCount, '扫描文件数量'),
    pageCount: optionalFiniteNumber(result.pageCount, '扫描页数'),
    scanStartTime: optionalString(result.scanStartTime, '扫描开始时间'),
    scanEndTime: optionalString(result.scanEndTime, '扫描结束时间'),
  }
}

function validateScannerBatchPreview(value: unknown): ExamScannerBatchPreviewVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描批次预览接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.deviceBreakdown)) {
    throw new TypeError('扫描批次设备分布接口返回格式错误')
  }
  return {
    eventCount: requireFiniteNumber(result.eventCount, '扫描事件数量'),
    fileCount: requireFiniteNumber(result.fileCount, '扫描文件数量'),
    pageCount: requireFiniteNumber(result.pageCount, '扫描页数'),
    scanStartTime: optionalString(result.scanStartTime, '扫描开始时间'),
    scanEndTime: optionalString(result.scanEndTime, '扫描结束时间'),
    deviceBreakdown: result.deviceBreakdown.map(validateScannerBatchDeviceBreakdown),
  }
}

function validateScannerBatch(value: unknown): ExamScannerBatchVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描批次接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    scanBatchId: requireString(result.scanBatchId, '扫描批次 ID'),
    examId: requireString(result.examId, '考试 ID'),
    scanMode: optionalScannerKioskScanMode(result.scanMode, '扫描录入模式'),
    batchNo: optionalString(result.batchNo, '扫描批次号'),
    batchExternalNo: optionalString(result.batchExternalNo, '扫描批次外部编号'),
    scannerDeviceId: optionalString(result.scannerDeviceId, '扫描设备业务 ID'),
    scannerStationId: optionalString(result.scannerStationId, '扫描站点 ID'),
    sourceFileIds: optionalStringList(result.sourceFileIds, '扫描来源文件 ID 列表'),
    targetPageNo: optionalFiniteNumber(result.targetPageNo, '补扫目标页号'),
    supplementReason: optionalString(result.supplementReason, '补扫原因'),
    pageCount: optionalFiniteNumber(result.pageCount, '扫描页数'),
    status: requireScanBatchStatus(result.status, '扫描批次状态'),
    statusMessage: requireString(result.statusMessage, '扫描批次状态文案'),
    diagnostic: optionalString(result.diagnostic, '扫描批次诊断'),
    scanStartTime: optionalString(result.scanStartTime, '扫描开始时间'),
    scanEndTime: optionalString(result.scanEndTime, '扫描结束时间'),
    createTime: optionalString(result.createTime, '创建时间'),
    updateTime: optionalString(result.updateTime, '更新时间'),
    eventCount: optionalFiniteNumber(result.eventCount, '扫描事件数量'),
    replaceTargetPage: requireBoolean(result.replaceTargetPage, '是否替换目标页'),
    sealedAt: optionalString(result.sealedAt, '封存时间'),
    sealedBy: optionalString(result.sealedBy, '封存执行人 ID'),
    discardedAt: optionalString(result.discardedAt, '废弃时间'),
    discardedBy: optionalString(result.discardedBy, '废弃执行人 ID'),
    discardReason: optionalString(result.discardReason, '废弃原因'),
  }
}

function validateScannedPageRegister(value: unknown): ExamScannedPageRegisterVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描页登记接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    pageId: optionalString(result.pageId, '扫描页 ID'),
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
  }
}

function validateScanSourceImport(value: unknown): ExamScanSourceImportVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描来源导入接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    registeredPageCount: optionalFiniteNumber(result.registeredPageCount, '已登记页数'),
    pageIds: optionalStringList(result.pageIds, '扫描页 ID 列表'),
  }
}

function validateScanAttention(value: unknown): ScanAttentionItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('扫描异常待办接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    id: requireString(result.id, '扫描异常 ID'),
    attentionType: validateScanAttentionType(result.attentionType),
    sourceType: validateScanAttentionSourceType(result.sourceType),
    sourceId: requireString(result.sourceId, '扫描异常来源 ID'),
    examId: requireString(result.examId, '考试 ID'),
    scanBatchId: optionalString(result.scanBatchId, '扫描批次 ID'),
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    pageId: optionalString(result.pageId, '扫描页 ID'),
    questionTemplateId: optionalString(result.questionTemplateId, '题目模板 ID'),
    status: validateScanAttentionStatus(result.status),
    diagnostic: optionalString(result.diagnostic, '扫描异常诊断'),
    updateTime: optionalString(result.updateTime, '更新时间'),
  }
}

export function validateScanAttentionStatus(
  value: unknown,
  fieldName = '扫描异常状态',
): ScanAttentionStatusCode {
  if (
    value !== 'BLOCKED'
    && value !== 'FAILED'
    && value !== 'PENDING'
    && value !== 'NEED_REVIEW'
  ) {
    throw new TypeError(`${fieldName}接口返回格式错误`)
  }
  return value
}

function validateScanAttentionType(value: unknown): ScanAttentionTypeCode {
  if (
    value !== 'QUALITY_BLOCK'
    && value !== 'PROCESSING_BLOCK'
    && value !== 'DUPLICATE_PENDING'
    && value !== 'RECOGNITION_REVIEW'
  ) {
    throw new TypeError('扫描异常类型接口返回格式错误')
  }
  return value
}

export function validateScanAttentionSourceType(
  value: unknown,
  fieldName = '扫描异常来源类型',
): ScanAttentionSourceTypeCode {
  if (
    value !== 'SCANNED_PAGE'
    && value !== 'PROCESSING_TASK'
    && value !== 'DUPLICATE_RESOLUTION'
    && value !== 'GRADE_RESULT'
  ) {
    throw new TypeError(`${fieldName}接口返回格式错误`)
  }
  return value
}

function validateScanAttentionList(value: unknown): ScanAttentionItemVO[] {
  if (!Array.isArray(value)) {
    throw new TypeError('扫描异常待办列表接口返回格式错误')
  }
  return value.map(validateScanAttention)
}

function validateDeanonymize(value: unknown): DeanonymizeVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('解匿名接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    paperInstanceId: optionalString(result.paperInstanceId, '试卷实例 ID'),
    candidateRosterId: optionalString(result.candidateRosterId, '考生名册 ID'),
    studentUserId: optionalString(result.studentUserId, '学生用户 ID'),
    studentNo: optionalString(result.studentNo, '学号'),
    studentName: optionalString(result.studentName, '学生姓名'),
  }
}

function validateReviewTaskItem(value: unknown): ReviewTaskItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('复核任务列表项接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    reviewTaskId: requireString(result.reviewTaskId, '复核任务 ID'),
    examId: requireString(result.examId, '考试 ID'),
    anonymousNo: requireString(result.anonymousNo, '匿名号'),
    paperInstanceId: requireString(result.paperInstanceId, '试卷实例 ID'),
    questionTemplateId: requireString(result.questionTemplateId, '题目模板 ID'),
    questionNo: requireString(result.questionNo, '题号'),
    fullScore: requireFiniteNumber(result.fullScore, '满分'),
    gradeResultId: requireString(result.gradeResultId, '批改结果 ID'),
    suggestedScore: optionalFiniteNumber(result.suggestedScore, 'AI 建议分'),
    status: requireReviewTaskStatus(result.status, '复核任务状态'),
    assignedTeacherUserId: optionalString(result.assignedTeacherUserId, '指派教师用户 ID'),
    reviewType: optionalReviewTaskType(result.reviewType, '复核任务类型'),
    gradeSource: optionalGradeSource(result.gradeSource, '批改来源'),
    updateTime: optionalString(result.updateTime, '更新时间'),
  }
}

function validateReviewTaskDetail(value: unknown): ReviewTaskDetailVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('复核任务详情接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    reviewTaskId: requireString(result.reviewTaskId, '复核任务 ID'),
    anonymousNo: requireString(result.anonymousNo, '匿名号'),
    aiTraceId: optionalString(result.aiTraceId, 'AI trace ID'),
    aiLimited: result.aiLimited === undefined || result.aiLimited === null
      ? undefined
      : requireBoolean(result.aiLimited, 'AI 是否限流或阻断'),
    examId: requireString(result.examId, '考试 ID'),
    paperInstanceId: requireString(result.paperInstanceId, '试卷实例 ID'),
    questionTemplateId: requireString(result.questionTemplateId, '题目模板 ID'),
    questionNo: requireString(result.questionNo, '题号'),
    questionType: requireString(result.questionType, '题型'),
    fullScore: requireFiniteNumber(result.fullScore, '满分'),
    sliceFileId: optionalString(result.sliceFileId, '切片文件 ID'),
    recognizedAnswer: optionalString(result.recognizedAnswer, '识别答案'),
    gradeResultId: requireString(result.gradeResultId, '批改结果 ID'),
    suggestedScore: optionalFiniteNumber(result.suggestedScore, 'AI 建议分'),
    aiDiagnostic: optionalString(result.aiDiagnostic, 'AI 诊断'),
    commentText: optionalString(result.commentText, '评语'),
    status: requireReviewTaskStatus(result.status, '复核任务状态'),
  }
}

function validateReviewTaskStatusSummary(value: unknown): ReviewTaskStatusSummaryVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('复核任务状态汇总接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    statusCode: requireReviewTaskStatus(result.statusCode, '复核任务状态'),
    taskCount: requireFiniteNumber(result.taskCount, '复核任务数量'),
  }
}

function validateReviewQuestionProgressItem(value: unknown): ReviewQuestionProgressItemVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('按题目聚合的复核进度接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  return {
    questionTemplateId: requireString(result.questionTemplateId, '题目模板 ID'),
    questionNo: requireString(result.questionNo, '题号'),
    totalTaskCount: requireFiniteNumber(result.totalTaskCount, '复核任务总数'),
    pendingTaskCount: requireFiniteNumber(result.pendingTaskCount, '待领取任务数'),
    inProgressTaskCount: requireFiniteNumber(result.inProgressTaskCount, '处理中任务数'),
    approvedTaskCount: requireFiniteNumber(result.approvedTaskCount, '已通过任务数'),
    rejectedTaskCount: requireFiniteNumber(result.rejectedTaskCount, '已驳回任务数'),
  }
}

function validateMarkingProgress(value: unknown): MarkingProgressVO {
  if (!value || typeof value !== 'object') {
    throw new TypeError('阅卷进度接口返回格式错误')
  }
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.reviewTaskStatusSummaryList)) {
    throw new TypeError('复核任务状态汇总列表接口返回格式错误')
  }
  if (!Array.isArray(result.reviewQuestionProgressList)) {
    throw new TypeError('按题目聚合的复核进度列表接口返回格式错误')
  }
  return {
    examId: requireString(result.examId, '考试 ID'),
    paperCount: requireFiniteNumber(result.paperCount, '试卷数量'),
    gradablePaperCount: requireFiniteNumber(result.gradablePaperCount, '可阅卷试卷数'),
    questionCount: requireFiniteNumber(result.questionCount, '题目数量'),
    totalQuestionGradeCount: requireFiniteNumber(result.totalQuestionGradeCount, '题目批阅总数'),
    confirmedQuestionGradeCount: requireFiniteNumber(result.confirmedQuestionGradeCount, '已确认题目批阅数'),
    pendingReviewTaskCount: requireFiniteNumber(result.pendingReviewTaskCount, '待处理复核任务数'),
    inProgressReviewTaskCount: requireFiniteNumber(result.inProgressReviewTaskCount, '处理中复核任务数'),
    openProcessingTaskCount: requireFiniteNumber(result.openProcessingTaskCount, '开放处理任务数'),
    scanAttentionCount: requireFiniteNumber(result.scanAttentionCount, '扫描异常数'),
    reviewTaskStatusSummaryList: result.reviewTaskStatusSummaryList.map(validateReviewTaskStatusSummary),
    reviewQuestionProgressList: result.reviewQuestionProgressList.map(validateReviewQuestionProgressItem),
  }
}
