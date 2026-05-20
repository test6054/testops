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
  /** 名称关键词（模糊匹配 exam_name / exam_no） */
  keyword?: string
}

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface ExamSummaryVO {
  examId: string
  courseId?: string
  examName: string
  examNo?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: string
  remark?: string
  createUser?: string
  createTime?: string
}

/** 考试详情 - 对应 ExamDetailResponse */
export interface ExamDetailVO {
  examId: string
  courseId?: string
  examName: string
  examNo?: string
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
  courseId?: string
  /** 考试名称（必填） */
  examName: string
  examNo?: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: string
  remark?: string
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
}

/** 模板查询响应 - 对应 ExamTemplateResponse */
export interface ExamTemplateVO {
  templateId: string
  examId: string
  templateName: string
  totalPages?: number
  status?: string
  pages: ExamPaperPageTemplateVO[]
  questions: ExamQuestionTemplateVO[]
}

/** 标准答案保存请求 - 对应 ExamStandardAnswerSaveRequest */
export interface ExamStandardAnswerSavePayload {
  examId: string
  questionTemplateId: string
  standardAnswer: string
  answerExplain?: string
  comparePolicy?: string
  answerPayload?: string
  aiHint?: string
  effectiveNow?: boolean
}

/** 考生响应 - 对应 ExamCandidateResponse */
export interface ExamCandidateVO {
  candidateRosterId: string
  classId?: string
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
  return http.post<PageResult<ExamSummaryVO>>('/api/mark/exams/page', payload)
}

/**
 * 查询考试详情
 * POST /api/mark/exams/detail
 */
export function getExamDetail(examId: string): Promise<ExamDetailVO> {
  return http.post<ExamDetailVO>('/api/mark/exams/detail', { examId })
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
 * 注意：当页面或题目为空时后端会抛 DATA_NOT_FOUND，业务层应捕获以显示"尚未配置"状态
 */
export function getExamTemplate(examId: string): Promise<ExamTemplateVO> {
  return http.post<ExamTemplateVO>('/api/mark/exams/template', { examId })
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
  return http.post<ExamCandidateVO[]>('/api/mark/exams/candidates', { examId })
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
  finalScoreStatus?: FinalScoreStatusCode
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
export interface ScanAttentionQueryPayload {
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  attentionType?: string
}

/** 扫描异常待办项 - 对应 ScanAttentionItemResponse */
export interface ScanAttentionItemVO {
  id: string
  attentionType?: string
  sourceType?: string
  sourceId?: string
  examId?: string
  scanBatchId?: string
  paperInstanceId?: string
  pageId?: string
  questionTemplateId?: string
  status?: string
  diagnostic?: string
  updateTime?: string
}

// ─── 扫描事件 / 批次 / 设备 模型重构（2026-05-06） ─────────────────

/** 扫描批次状态码 - 对应后端 ScanBatchStatus 枚举 */
export type ScanBatchStatusCode = 'RECEIVED' | 'BLOCKED' | 'BOUND' | 'COMPLETED'

/** 扫描批次视图 - 对应 ExamScannerBatchResponse */
export interface ExamScannerBatchVO {
  /** 扫描批次ID */
  scanBatchId: string
  examId: string
  batchNo?: string
  batchExternalNo?: string
  scannerDeviceId?: string
  scannerStationId?: string
  /** 来源文件ID集合 */
  sourceFileIds?: string[]
  pageCount?: number
  status?: ScanBatchStatusCode
  statusMessage?: string
  diagnostic?: string
  scanStartTime?: string
  scanEndTime?: string
  createTime?: string
  updateTime?: string
  /** 批次内事件数量 */
  eventCount?: number
}

// ExamScannerDeviceVO 完整定义在 exam-mark-scanner.ts，此处再导出保持现有消费者兼容
export type { ExamScannerDeviceVO } from './exam-mark-scanner'

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
}

// ExamScannerDeviceQueryPayload 完整定义在 exam-mark-scanner.ts，此处再导出
export type { ExamScannerDeviceQueryPayload } from './exam-mark-scanner'

/**
 * 教师按扫描仪集合 + 时间区间聚合扫描事件成批次
 * POST /api/mark/exams/scanner-batches/create
 */
export function createScanBatchByCondition(
  payload: ExamScannerBatchCreatePayload,
): Promise<ExamScannerBatchCreateVO> {
  return http.post<ExamScannerBatchCreateVO>('/api/mark/exams/scanner-batches/create', payload)
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
  return http.post<ExamScannerBatchPreviewVO>('/api/mark/exams/scanner-batches/preview', payload)
}

/**
 * 分页查询扫描批次
 * POST /api/mark/exams/scanner-batches/page
 */
export function pageScannerBatches(
  payload: ExamScannerBatchQueryPayload,
): Promise<PageResult<ExamScannerBatchVO>> {
  return http.post<PageResult<ExamScannerBatchVO>>('/api/mark/exams/scanner-batches/page', payload)
}

// listScannerDevices 完整实现在 exam-mark-scanner.ts，此处再导出
export { listScannerDevices } from './exam-mark-scanner'

/**
 * 登记扫描页并返回试卷实例
 * POST /api/mark/exams/scanned-pages/register
 */
export function registerScannedPage(
  payload: ExamScannedPageRegisterPayload,
): Promise<ExamScannedPageRegisterVO> {
  return http.post<ExamScannedPageRegisterVO>('/api/mark/exams/scanned-pages/register', payload)
}

/**
 * 导入扫描来源文件并登记扫描页
 * POST /api/mark/exams/scan-sources/import
 */
export function importScanSource(
  payload: ExamScanSourceImportPayload,
): Promise<ExamScanSourceImportVO> {
  return http.post<ExamScanSourceImportVO>('/api/mark/exams/scan-sources/import', payload)
}

/**
 * 查询扫描异常待办列表
 * POST /api/mark/exams/scan-attentions
 */
export function listScanAttentions(
  payload: ScanAttentionQueryPayload,
): Promise<ScanAttentionItemVO[]> {
  return http.post<ScanAttentionItemVO[]>('/api/mark/exams/scan-attentions', payload)
}

// ─── 试卷身份绑定与解匿名 ────────────────────────────────────────

/** 试卷身份绑定请求 - 对应 ExamPaperBindRequest */
export interface ExamPaperBindPayload {
  examId: string
  scanBatchId: string
  paperInstanceId: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus?: string
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
  return http.post<boolean>('/api/mark/exams/papers/bind', payload)
}

/**
 * 解匿名查看试卷身份
 * POST /api/mark/exams/papers/deanonymize
 */
export function deanonymizePaper(payload: DeanonymizePayload): Promise<DeanonymizeVO> {
  return http.post<DeanonymizeVO>('/api/mark/exams/papers/deanonymize', payload)
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
  questionTemplateId?: string
  questionNo?: string
  questionType?: string
  fullScore?: number
  finalScore?: number
  gradeStatus?: string
  objectiveResult?: string
}

/** 试卷成绩明细响应 - 对应 ExamPaperScoreResponse */
export interface ExamPaperScoreVO {
  examId?: string
  paperInstanceId?: string
  candidateRosterId?: string
  studentUserId?: string
  studentNo?: string
  studentName?: string
  totalScore?: number
  finalScoreStatus?: string
  questions?: ExamQuestionScoreVO[]
}

/**
 * 教师确认题目得分
 * POST /api/mark/exams/question-grades/confirm
 */
export function confirmQuestionGrade(payload: ExamGradeConfirmPayload): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/question-grades/confirm', payload)
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
export interface ReviewTaskQueryPayload {
  examId: string
  /** 复核状态编码，空查全部 */
  status?: string
  questionTemplateId?: string
}

/** 匿名批阅任务项 - 对应 ReviewTaskItemResponse */
export interface ReviewTaskItemVO {
  reviewTaskId: string
  examId: string
  anonymousNo?: string
  paperInstanceId?: string
  questionTemplateId?: string
  questionNo?: string
  fullScore?: number
  gradeResultId?: string
  suggestedScore?: number
  status?: string
  assignedTeacherUserId?: string
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
  anonymousNo?: string
  examId: string
  paperInstanceId?: string
  questionTemplateId?: string
  questionNo?: string
  questionType?: string
  fullScore?: number
  sliceFileId?: string
  recognizedAnswer?: string
  gradeResultId?: string
  suggestedScore?: number
  aiDiagnostic?: string
  commentText?: string
  status?: string
}

/**
 * 查询匿名批阅任务列表
 * POST /api/mark/exams/review-tasks
 */
export function listReviewTasks(payload: ReviewTaskQueryPayload): Promise<ReviewTaskItemVO[]> {
  return http.post<ReviewTaskItemVO[]>('/api/mark/exams/review-tasks', payload)
}

/**
 * 查询匿名批阅任务详情
 * POST /api/mark/exams/review-tasks/detail
 */
export function getReviewTaskDetail(payload: ReviewTaskActionPayload): Promise<ReviewTaskDetailVO> {
  return http.post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/detail', payload)
}

/**
 * 领取匿名批阅任务（分派给当前教师）
 * POST /api/mark/exams/review-tasks/claim
 */
export function claimReviewTask(payload: ReviewTaskActionPayload): Promise<ReviewTaskDetailVO> {
  return http.post<ReviewTaskDetailVO>('/api/mark/exams/review-tasks/claim', payload)
}

// ─── 批注与阅卷进度 ─────────────────────────────────────────────

/** 批注查询请求 - 对应 AnnotationQueryRequest */
export interface AnnotationQueryPayload {
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
  examId?: string
  /** 试卷数量（含未绑定 / 冲突 / 已绑定的全部扫描卷面） */
  paperCount?: number
  /** 可阅卷试卷数（bindingStatus = BOUND，完成率分母真源） */
  gradablePaperCount?: number
  questionCount?: number
  /** 应批阅题目总数 = gradablePaperCount × questionCount，已排除缺考 / 未绑定 / 冲突卷 */
  totalQuestionGradeCount?: number
  confirmedQuestionGradeCount?: number
  pendingReviewTaskCount?: number
  inProgressReviewTaskCount?: number
  openProcessingTaskCount?: number
  scanAttentionCount?: number
}

/**
 * 查询批注记录
 * POST /api/mark/exams/annotations
 */
export function listAnnotations(payload: AnnotationQueryPayload): Promise<AnnotationVO[]> {
  return http.post<AnnotationVO[]>('/api/mark/exams/annotations', payload)
}

/**
 * 查询阅卷进度
 * POST /api/mark/exams/marking-progress
 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressVO> {
  return http.post<MarkingProgressVO>('/api/mark/exams/marking-progress', { examId })
}
