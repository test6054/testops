import type { ExamCandidateRosterRequest, ExamCandidateVO } from '@/apis/mark/exam-scope'
/**
 * 阅卷考试主记录 API - 对接 edu-mark 模块 ExamMarkController 的考试主对象接口。
 *
 * 仅保留考试主记录、详情、状态与制卷形态字段；考试范围、模板、扫描、成绩、复核等
 * 后端对象分别由同目录具体 API 文件承接。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import { isValidSemesterCode } from '@/types/enums/semester-enum'

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

/** 考试状态筛选项（Select 专用，首屏即带中文 label，不依赖接口 filterOptions） */
export const EXAM_STATUS_FILTER_OPTIONS: Array<{ label: string, value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

/** 批改策略编码 */
export type GradingStrategyCode = 'SINGLE'

/** 批改策略文案 */
export const GRADING_STRATEGY_LABEL: Record<GradingStrategyCode, string> = {
  SINGLE: '单评',
}

/** 批改策略选项（普通期末考试固定单评） */
export const GRADING_STRATEGY_FILTER_OPTIONS: Array<{ label: string, value: GradingStrategyCode }> = [
  { label: GRADING_STRATEGY_LABEL.SINGLE, value: 'SINGLE' },
]

/** 考试性质编码 - 对应后端 ExamKind 枚举 */
export type ExamKindCode = 'REGULAR' | 'MAKEUP' | 'RETAKE' | 'REEXAM' | 'DEFERRED'

/** 考试性质文案映射 */
export const EXAM_KIND_LABEL: Record<ExamKindCode, string> = {
  REGULAR: '正考',
  MAKEUP: '补考',
  RETAKE: '重修',
  REEXAM: '重考',
  DEFERRED: '缓考',
}

/** 考试性质 BadgeTone 映射 */
export const EXAM_KIND_TONE: Record<ExamKindCode, BadgeTone> = {
  REGULAR: 'blue',
  MAKEUP: 'orange',
  RETAKE: 'purple',
  REEXAM: 'red',
  DEFERRED: 'gray',
}

/** 考试性质筛选项 */
export const EXAM_KIND_FILTER_OPTIONS: Array<{ label: string, value: ExamKindCode }> = [
  { label: EXAM_KIND_LABEL.REGULAR, value: 'REGULAR' },
  { label: EXAM_KIND_LABEL.MAKEUP, value: 'MAKEUP' },
  { label: EXAM_KIND_LABEL.RETAKE, value: 'RETAKE' },
  { label: EXAM_KIND_LABEL.REEXAM, value: 'REEXAM' },
  { label: EXAM_KIND_LABEL.DEFERRED, value: 'DEFERRED' },
]

/** 需关联原正考的考试性质 */
export const EXAM_KIND_REQUIRES_SOURCE: ExamKindCode[] = ['MAKEUP', 'RETAKE', 'REEXAM', 'DEFERRED']

/** 判断考试性质是否须选择原考试 */
export function examKindRequiresSource(examKind: ExamKindCode): boolean {
  return EXAM_KIND_REQUIRES_SOURCE.includes(examKind)
}

/** 成绩合成策略编码 - 对应后端 ExamScorePolicy 枚举 */
export type ExamScorePolicyCode = 'FULL' | 'DAILY_PLUS_PAPER' | 'MAKEUP_CAP60' | 'ACTUAL_ONLY'

/** 成绩合成策略文案映射 */
export const EXAM_SCORE_POLICY_LABEL: Record<ExamScorePolicyCode, string> = {
  FULL: '卷面加日常',
  DAILY_PLUS_PAPER: '卷面加日常',
  MAKEUP_CAP60: '补考封顶60分',
  ACTUAL_ONLY: '仅卷面实际分',
}

/** 成绩合成策略 BadgeTone 映射 */
export const EXAM_SCORE_POLICY_TONE: Record<ExamScorePolicyCode, BadgeTone> = {
  FULL: 'blue',
  DAILY_PLUS_PAPER: 'blue',
  MAKEUP_CAP60: 'orange',
  ACTUAL_ONLY: 'gray',
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
  gradingStrategy: GradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamSummaryResponse.createUser */
  createUser: string
  createTime?: string
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
  /** 考试性质 */
  examKind?: ExamKindCode
  /** 考试性质展示名称 */
  examKindMessage?: string
  /** 原期末考试 ID */
  sourceExamId?: string
  /** 成绩合成策略 */
  scorePolicy?: ExamScorePolicyCode
}

/** 考试工作台列表范围 - 对应 ExamListScope */
export type ExamListScopeCode = 'ALL' | 'ONGOING' | 'PRIORITY'

/** 考试工作台分页查询请求 - 对应 ExamWorkbenchPageQueryRequest */
export interface ExamWorkbenchPageQueryRequest extends ExamPageQueryRequest {
  /** 列表范围 */
  listScope: ExamListScopeCode
}

/** 考试工作台范围计数 - 对应 ExamWorkbenchScopeCountResponse */
export interface ExamWorkbenchScopeCountVO {
  priorityCount: number
  ongoingCount: number
  allCount: number
  activeCount: number
  closedCount: number
  /** 待推进 Signal：ACTIVE 且创建超过 30 天 */
  stalePushCount: number
}

/** 考试工作台列表项 - 对应 ExamWorkbenchSummaryResponse */
export interface ExamWorkbenchSummaryVO extends ExamSummaryVO {
  questionCount: number
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  openProcessingTaskCount: number
  scanAttentionCount: number
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
  /** 课程名称 - 对应 ExamDetailResponse.courseName */
  courseName?: string
  /** 院系名称 - 对应 ExamDetailResponse.departmentName（edu-user 院系树） */
  departmentName?: string
  /** 参考班级维护上下文院系 ID - 对应 ExamDetailResponse.referenceDepartmentId */
  referenceDepartmentId?: string
  /** 参考班级维护上下文院系名称 - 对应 ExamDetailResponse.referenceDepartmentName */
  referenceDepartmentName?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy: GradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamDetailResponse.createUser */
  createUser: string
  /** 创建人昵称 - 对应 ExamDetailResponse.createUserNickName */
  createUserNickName?: string
  createTime?: string
  updateTime?: string
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
  /** 班级范围ID集合 */
  classIds: string[]
  /** 参考班级是否已写入 t_exam_class_scope */
  classScopePersisted: boolean
  /** 关考后自动建卷失败时，是否允许修正参考班级并重触发建卷 */
  archiveAutoCreateClassScopeRecoveryAllowed?: boolean
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
  /** 准备建议项（提示能力缺口，不阻断扫描） */
  prepAdvisoryReasons: string[]
  /** 准备硬阻断项（当前为空列表；扫描登记不依赖制卷形态硬阻断） */
  prepBlockingReasons: string[]
  /** 涉密 / 统考涉密场次；为 true 时前端启用强制水印与警示条 */
  confidential?: boolean
  /** 名册纳入方式；创建时未配置名册则为 undefined */
  rosterScopeMode?: ExamRosterScopeMode
  /** 名册纳入方式展示名称 */
  rosterScopeModeMessage?: string
  /** 考试性质 */
  examKind?: ExamKindCode
  /** 考试性质展示名称 */
  examKindMessage?: string
  /** 原期末考试 ID */
  sourceExamId?: string
  /** 成绩合成策略 */
  scorePolicy?: ExamScorePolicyCode
}

/** 保存制卷形态请求 - 对应 ExamMaterialLayoutSaveRequest */
export interface ExamMaterialLayoutSaveRequest {
  examId: string
  materialLayoutMode: ExamMaterialLayoutModeCode
  printSourceMode?: ExamPrintSourceModeCode
}

/** 创建考试请求 - 对应 ExamCreateRequest */
export interface ExamCreateRequest {
  /** 课程ID */
  courseId: string
  /**
   * 学年，如 '2024-2025'
   */
  academicYear: string
  /** 学期：1=秋季学期，2=春季学期 */
  semester: string
  /** 考试名称（必填） */
  examName: string
  /** 考试编号（必填） */
  examNo: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 批改策略编码 */
  gradingStrategy: GradingStrategyCode
  remark?: string
  /**
   * 平时成绩满分；为空表示本场考试仅计入考试成绩（期末笔试分），
   * 成绩确认时不采集平时分。有值时表示课程总评=考试分+平时分，确认时需录入平时分。
   */
  dailyScoreFull?: number | null
  /** 是否涉密考试场次 */
  confidential?: boolean
  /** 考试性质（必填） */
  examKind: ExamKindCode
  /** 原期末考试 ID；补考/缓考/重考/重修必填 */
  sourceExamId?: string
  /** 成绩合成策略；未传时由后端按考试性质推导 */
  scorePolicy?: ExamScorePolicyCode
}

/** 更新考试主信息请求 - 对应 ExamUpdateRequest（学年/学期可留空，由后端沿用当前考试值） */
export interface ExamUpdateRequest {
  /** 考试ID */
  examId: string
  /** 课程ID */
  courseId: string
  /** 学年；与 semester 须同时填写或同时留空 */
  academicYear?: string
  /** 学期；与 academicYear 须同时填写或同时留空 */
  semester?: string
  /** 考试名称 */
  examName: string
  /** 考试编号 */
  examNo: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 批改策略编码 */
  gradingStrategy: GradingStrategyCode
  remark?: string
  dailyScoreFull?: number | null
  /** 是否涉密考试场次 */
  confidential?: boolean
}

/** 删除考试请求 - 对应 ExamDeleteRequest */
export interface ExamDeleteRequest {
  /** 考试ID */
  examId: string
}

/** 考试归档关闭请求 - 对应 ExamCloseRequest */
export interface ExamCloseRequest {
  examId: string
}

/** 创建考试时的阅卷队伍配置 - 对应 ExamMarkingTeamCreateRequest */
export interface ExamMarkingTeamCreateRequest {
  chiefExaminerUserId: string
  anonymousMode: boolean
  reviewerUserIds: string[]
  remark?: string
}

/** 名册纳入方式：整班纳入（正考）或按人勾选（补考/部分考生） */
export type ExamRosterScopeMode = 'BY_CLASS' | 'BY_STUDENT'

export const EXAM_ROSTER_SCOPE_MODE_LABEL: Record<ExamRosterScopeMode, string> = {
  BY_CLASS: '正考（整班纳入）',
  BY_STUDENT: '补考/部分考生（按人勾选）',
}

/** 创建考试时的考生名册配置 - 对应 ExamRosterCreateRequest */
export interface ExamRosterCreateRequest {
  scopeMode: ExamRosterScopeMode
  classIds: string[]
  /** 参考班级维护上下文院系 ID */
  referenceDepartmentId?: string
  candidates: ExamCandidateRosterRequest[]
}

/** 创建考试前名册预览请求 - 对应 ExamCreateRosterPreviewRequest */
export interface ExamCreateRosterPreviewRequest {
  scopeMode: ExamRosterScopeMode
  classIds: string[]
  candidates?: ExamCandidateRosterRequest[]
}

/** 创建考试前名册预览响应 - 对应 ExamCreateRosterPreviewResponse */
export interface ExamCreateRosterPreviewResponse {
  scopeMode: ExamRosterScopeMode
  classIds: string[]
  candidates: ExamCandidateVO[]
  candidateCount: number
}

/** 创建考试打包请求 - 对应 ExamCreateBundleRequest */
export interface ExamCreateBundleRequest {
  exam: ExamCreateRequest
  markingTeam: ExamMarkingTeamCreateRequest
  roster?: ExamRosterCreateRequest
}

/** 创建考试打包响应 - 对应 ExamCreateBundleResponse */
export interface ExamCreateBundleResponse {
  examId: string
  organizationId: string
  organizationStatus: string
  reviewerCount: number
}

/** 分页查询考试列表。 */
export function pageExams(request: ExamPageQueryRequest): Promise<PageResult<ExamSummaryVO>> {
  return http.post<PageResult<ExamSummaryVO>>('/api/mark/exams/page', request)
}

/** 分页查询考试工作台列表（内嵌阅卷进度摘要）。 */
export function pageExamWorkbench(
  request: ExamWorkbenchPageQueryRequest,
): Promise<PageResult<ExamWorkbenchSummaryVO>> {
  return http.post<PageResult<ExamWorkbenchSummaryVO>>('/api/mark/exams/workbench-page', request)
}

/** 聚合统计考试工作台三 Tab 与 ACTIVE/CLOSED 概览计数。 */
export function countExamWorkbenchScopes(
  request: ExamPageQueryRequest,
): Promise<ExamWorkbenchScopeCountVO> {
  return http.post<ExamWorkbenchScopeCountVO>('/api/mark/exams/workbench-scope-counts', request)
}

/** 查询考试详情。 */
export function getExamDetail(examId: string): Promise<ExamDetailVO> {
  return http.post<ExamDetailVO>('/api/mark/exams/detail', { examId })
}

/** 保存考试制卷形态与整卷印刷来源。 */
export function saveMaterialLayout(request: ExamMaterialLayoutSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/material-layout/save', request)
}

/** 创建考试并初始化阅卷组织。 */
export function createExamBundle(request: ExamCreateBundleRequest): Promise<ExamCreateBundleResponse> {
  return http.post<ExamCreateBundleResponse>('/api/mark/exams/create-bundle', request)
}

/** 创建考试前预览名册（edu-user 真源）。 */
export function previewCreateExamRoster(
  request: ExamCreateRosterPreviewRequest,
): Promise<ExamCreateRosterPreviewResponse> {
  return http.post<ExamCreateRosterPreviewResponse>('/api/mark/exams/create-roster-preview', request)
}

/** 更新考试主信息。 */
export function updateExam(request: ExamUpdateRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/update', request)
}

/** 删除尚未进入后续链路的考试。 */
export function deleteExam(request: ExamDeleteRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/delete', request)
}

/** 归档关闭考试（状态 ACTIVE -> CLOSED）。 */
export function closeExam(request: ExamCloseRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/close', request)
}

/** DISTINCT 学期查询请求 - 对应 ExamDistinctTermQueryRequest */
export interface ExamDistinctTermQueryRequest {
  courseId?: string
  createUserId?: string | null
}

/** DISTINCT 学期项 - 对应 ExamDistinctTermItemResponse */
export interface ExamDistinctTermItemVO {
  academicYear: string
  /** 考试发生学期：1 秋季、2 春季（与后端 SemesterEnum 一致） */
  semester: SemesterCode
}

function assertDistinctTermItem(item: unknown, index: number): ExamDistinctTermItemVO {
  if (!item || typeof item !== 'object') {
    throw new TypeError(`distinct-terms 响应缺少合法项：[${index}]`)
  }
  const row = item as Record<string, unknown>
  const academicYear = row.academicYear
  const semester = row.semester
  if (typeof academicYear !== 'string' || !academicYear.trim()) {
    throw new TypeError(`distinct-terms 响应缺少合法字段：academicYear[${index}]`)
  }
  if (typeof semester !== 'string' || !isValidSemesterCode(semester)) {
    throw new TypeError(`distinct-terms 响应缺少合法字段：semester[${index}]`)
  }
  return {
    academicYear: academicYear.trim(),
    semester,
  }
}

/** 查询租户内 DISTINCT 考试学期列表，按学期编码倒序。 */
export function listDistinctExamTerms(
  request: ExamDistinctTermQueryRequest = {},
): Promise<ExamDistinctTermItemVO[]> {
  return http.post<ExamDistinctTermItemVO[]>('/api/exam/distinct-terms', request).then((rows) => {
    if (!Array.isArray(rows)) {
      throw new TypeError('distinct-terms 响应须为数组')
    }
    return rows.map((item, index) => assertDistinctTermItem(item, index))
  })
}
