import type { ExamCandidateResponse, ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
/**
 * 阅卷考试主记录 API - 对接 edu-mark 模块 ExamMarkController 的考试主对象接口。
 *
 * 仅保留考试主记录、详情、状态与制卷形态字段；考试范围、模板、扫描、成绩、复核等
 * 后端对象分别由同目录具体 API 文件承接。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { ExamRosterScopeModeCode } from '@/types/enums/exam-roster-scope-mode-enum'
import type { MarkingOrganizationStatusCode } from '@/types/enums/marking-organization-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  ALL_EXAM_GRADING_STRATEGY_CODES,
  ExamGradingStrategyCode,
  ExamGradingStrategyDescription
} from '@/types/enums/exam-grading-strategy-enum'
import { ALL_EXAM_KIND_CODES, ExamKindCode, ExamKindDescription } from '@/types/enums/exam-kind-enum'
import {
  ALL_EXAM_LIST_SCOPE_CODES,
  ExamListScopeCode,
  ExamListScopeDescription
} from '@/types/enums/exam-list-scope-enum'
import {
  ALL_EXAM_MATERIAL_LAYOUT_MODE_CODES,
  ExamMaterialLayoutModeCode,
  ExamMaterialLayoutModeDescription
} from '@/types/enums/exam-material-layout-mode-enum'
import {
  ALL_EXAM_PRINT_SOURCE_MODE_CODES,
  ExamPrintSourceModeCode,
  ExamPrintSourceModeDescription
} from '@/types/enums/exam-print-source-mode-enum'
import {
  ALL_EXAM_ROSTER_SCOPE_MODE_CODES,
  ExamRosterScopeModeDescription
} from '@/types/enums/exam-roster-scope-mode-enum'
import {
  ALL_EXAM_SCORE_POLICY_CODES,
  ExamScorePolicyCode,
  ExamScorePolicyDescription
} from '@/types/enums/exam-score-policy-enum'
import { ALL_EXAM_STATUS_CODES, ExamStatusCode, ExamStatusDescription } from '@/types/enums/exam-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 考试状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const EXAM_STATUS_TONE: Record<ExamStatusCode, BadgeTone> = {
  [ExamStatusCode.ACTIVE]: 'green',
  [ExamStatusCode.CLOSED]: 'gray',
}

/** 考试状态筛选项（Select 专用，首屏即带中文 label，不依赖接口 filterOptions） */
export const EXAM_STATUS_FILTER_OPTIONS: Array<{ label: string, value: ExamStatusCode }>
  = ALL_EXAM_STATUS_CODES.map((value) => ({
    label: strictEnumLabel(ExamStatusDescription, value, '考试状态'),
    value,
  }))

export { ALL_EXAM_GRADING_STRATEGY_CODES, ExamGradingStrategyCode, ExamGradingStrategyDescription }

export { ALL_EXAM_KIND_CODES, ExamKindCode, ExamKindDescription }

export { ALL_EXAM_LIST_SCOPE_CODES, ExamListScopeCode, ExamListScopeDescription }

export {
  ALL_EXAM_MATERIAL_LAYOUT_MODE_CODES,
  ExamMaterialLayoutModeCode,
  ExamMaterialLayoutModeDescription,
}

export { ALL_EXAM_PRINT_SOURCE_MODE_CODES, ExamPrintSourceModeCode, ExamPrintSourceModeDescription }

export {
  ALL_EXAM_ROSTER_SCOPE_MODE_CODES,
  ExamRosterScopeModeCode,
  ExamRosterScopeModeDescription,
} from '@/types/enums/exam-roster-scope-mode-enum'

export { ALL_EXAM_SCORE_POLICY_CODES, ExamScorePolicyCode, ExamScorePolicyDescription }

/** 批改策略选项（普通期末考试固定单评） */
export const GRADING_STRATEGY_FILTER_OPTIONS: Array<{
  label: string
  value: ExamGradingStrategyCode
}> = ALL_EXAM_GRADING_STRATEGY_CODES.map((value) => ({
  label: strictEnumLabel(ExamGradingStrategyDescription, value, '阅卷策略'),
  value,
}))

/** 考试性质 BadgeTone 映射 */
export const EXAM_KIND_TONE: Record<ExamKindCode, BadgeTone> = {
  [ExamKindCode.REGULAR]: 'blue',
  [ExamKindCode.MAKEUP]: 'orange',
  [ExamKindCode.RETAKE]: 'purple',
  [ExamKindCode.REEXAM]: 'red',
  [ExamKindCode.DEFERRED]: 'gray',
}

/** 考试性质筛选项 */
export const EXAM_KIND_FILTER_OPTIONS: Array<{ label: string, value: ExamKindCode }>
  = ALL_EXAM_KIND_CODES.map((value) => ({
    label: strictEnumLabel(ExamKindDescription, value, '考试类型'),
    value,
  }))

/** 需关联原正考的考试性质 */
export const EXAM_KIND_REQUIRES_SOURCE: ExamKindCode[] = [
  ExamKindCode.MAKEUP,
  ExamKindCode.RETAKE,
  ExamKindCode.REEXAM,
  ExamKindCode.DEFERRED,
]

/** 判断考试性质是否须选择原考试 */
export function examKindRequiresSource(examKind: ExamKindCode): boolean {
  return EXAM_KIND_REQUIRES_SOURCE.includes(examKind)
}

/** 成绩合成策略 BadgeTone 映射 */
export const EXAM_SCORE_POLICY_TONE: Record<ExamScorePolicyCode, BadgeTone> = {
  [ExamScorePolicyCode.FULL]: 'blue',
  [ExamScorePolicyCode.DAILY_PLUS_PAPER]: 'blue',
  [ExamScorePolicyCode.MAKEUP_CAP60]: 'orange',
  [ExamScorePolicyCode.ACTUAL_ONLY]: 'gray',
}

export const EXAM_PRINT_SOURCE_MODE_OPTIONS: Array<{
  value: ExamPrintSourceModeCode
  label: string
}> = ALL_EXAM_PRINT_SOURCE_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ExamPrintSourceModeDescription, value, '印刷来源模式'),
}))

/** 考试列表 Tab 范围产品说明（列表头 scope hint，非 mock 数据） */
export const EXAM_LIST_SCOPE_HINT: Record<ExamListScopeCode, string> = {
  [ExamListScopeCode.PRIORITY]: '有待处理信号或批阅滞后的 ACTIVE 考试',
  [ExamListScopeCode.ONGOING]: '当前筛选域内的 ACTIVE 考试',
  [ExamListScopeCode.ALL]: '当前筛选条件下的全部考试',
}

/** 考试分页查询请求 - 对应 ExamPageQueryRequest */
export interface ExamPageQueryRequest extends QueryDto {
  /** 课程ID（可选） */
  courseId?: string
  /** 班级 ID（edu-user）；非空时仅返回 t_exam_class_scope 命中该班级的考试 */
  classId?: string
  /** 参考院系 ID（edu-user）；非空时仅返回 reference_department_id 命中该院系的考试 */
  referenceDepartmentId?: string
  /** 考试状态 */
  status?: ExamStatusCode
  /** 学年，如 '2024-2025' */
  academicYear?: string
  /** 学期：1=秋季学期，2=春季学期 */
  semester?: SemesterCode
  /** 开课学年，如 '2024-2025' */
  teachingAcademicYear?: string
  /** 开课学期：1=秋季学期，2=春季学期 */
  teachingSemester?: SemesterCode
  /** 创建时间范围下界 */
  startTime?: string
  /** 创建时间范围上界 */
  endTime?: string
  /** 名称关键词（模糊匹配 exam_name / exam_no） */
  keyword?: string
}

/** 考试列表项 - 对应 ExamSummaryResponse */
export interface ExamSummaryResponse {
  examId: string
  courseId?: string
  /** 课程名称 - 服务层按 courseId 反查 */
  courseName?: string
  /** 参考院系 ID - 对应 t_exam.reference_department_id */
  referenceDepartmentId?: string
  /** 参考院系名称 - 服务层按 referenceDepartmentId 经 edu-user 反查 */
  departmentName?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: SemesterCode
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: ExamGradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamSummaryResponse.createUser */
  createUser?: string
  createTime?: string
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
  /** 考试性质 */
  examKind: ExamKindCode
  /** 考试性质展示名称 */
  examKindMessage?: string
  /** 原期末考试 ID */
  sourceExamId?: string
  /** 成绩合成策略 */
  scorePolicy?: ExamScorePolicyCode
  /** 开课学年 - 对应 ExamSummaryResponse.teachingAcademicYear */
  teachingAcademicYear?: string
  /** 开课学期 - 对应 ExamSummaryResponse.teachingSemester */
  teachingSemester?: SemesterCode
}

/** 考试工作台分页查询请求 - 对应 ExamWorkbenchPageQueryRequest */
export interface ExamWorkbenchPageQueryRequest extends ExamPageQueryRequest {
  /** 列表范围 */
  listScope: ExamListScopeCode
}

/** 考试工作台范围计数 - 对应 ExamWorkbenchScopeCountResponse */
export interface ExamWorkbenchScopeCountResponse {
  priorityCount: number
  ongoingCount: number
  allCount: number
  activeCount: number
  closedCount: number
  /** 待推进 Signal：ACTIVE 且创建超过 30 天 */
  stalePushCount: number
}

/** 考试工作台列表项 - 对应 ExamWorkbenchSummaryResponse */
export interface ExamWorkbenchSummaryResponse {
  examId: string
  courseId?: string
  /** 课程名称 - 服务层按 courseId 反查 */
  courseName?: string
  /** 参考院系 ID - 对应 t_exam.reference_department_id */
  referenceDepartmentId?: string
  /** 参考院系名称 - 服务层按 referenceDepartmentId 经 edu-user 反查 */
  departmentName?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: SemesterCode
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy?: ExamGradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamWorkbenchSummaryResponse.createUser */
  createUser?: string
  createTime?: string
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
  /** 考试性质 */
  examKind: ExamKindCode
  /** 考试性质展示名称 */
  examKindMessage?: string
  /** 原期末考试 ID */
  sourceExamId?: string
  /** 成绩合成策略 */
  scorePolicy?: ExamScorePolicyCode
  /** 开课学年 - 对应 ExamWorkbenchSummaryResponse.teachingAcademicYear */
  teachingAcademicYear?: string
  /** 开课学期 - 对应 ExamWorkbenchSummaryResponse.teachingSemester */
  teachingSemester?: SemesterCode
  questionCount: number
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  openProcessingTaskCount: number
  scanAttentionCount: number
  needReviewGradeResultCount: number
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

/** 考试准备场景引导 - 对应 ExamPrepScenarioGuideResponse */
export interface ExamPrepScenarioGuideResponse {
  scenarioTitle: string
  scenarioSummary: string
  operationalSteps: string[]
  scanGuidance: string
  printGuidance?: string
}

/** 考试详情 - 对应 ExamDetailResponse */
export interface ExamDetailResponse {
  examId: string
  courseId?: string
  /** 课程名称 - 对应 ExamDetailResponse.courseName */
  courseName?: string
  /** 院系名称 - 对应 ExamDetailResponse.departmentName（按 referenceDepartmentId 经 edu-user 反查） */
  departmentName?: string
  /** 参考班级维护上下文院系 ID - 对应 ExamDetailResponse.referenceDepartmentId */
  referenceDepartmentId?: string
  /** 参考班级维护上下文院系名称 - 对应 ExamDetailResponse.referenceDepartmentName */
  referenceDepartmentName?: string
  examName: string
  examNo: string
  academicYear?: string
  semester?: SemesterCode
  status: ExamStatusCode
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
  gradingStrategy: ExamGradingStrategyCode
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
  layoutConfigured?: boolean
  layoutName?: string
  layoutRegionReady?: boolean
  subjectiveRegionReady?: boolean
  subjectiveQuestionCount?: number
  subjectiveRegionConfiguredCount?: number
  printPackageReady?: boolean
  printPackageCount?: number
  /** 制卷入口形态编码 - 对应 ExamDetailResponse.layoutEntryKind */
  layoutEntryKind?: string
  layoutEntryKindMessage?: string
  /** 制卷纸张规格编码 - 对应 ExamDetailResponse.layoutPaperSpec */
  layoutPaperSpec?: string
  layoutPaperSpecMessage?: string
  /** 扫描印张说明（1张1面 / 1张2面 / N页）- 对应 ExamDetailResponse.scanPaperStyleText */
  scanPaperStyleText?: string
  /** 准备建议项（提示能力缺口，不阻断扫描） */
  prepAdvisoryReasons: string[]
  /** 准备硬阻断项（当前为空列表；扫描登记不依赖制卷形态硬阻断） */
  prepBlockingReasons: string[]
  /** 按制卷形态与印刷来源生成的教务场景引导 */
  prepScenarioGuide?: ExamPrepScenarioGuideResponse
  /** 涉密 / 统考涉密场次；为 true 时前端启用强制水印与警示条 */
  confidential?: boolean
  /** 名册纳入方式；创建时未配置名册则为 undefined */
  rosterScopeMode?: ExamRosterScopeModeCode
  /** 名册纳入方式展示名称 */
  rosterScopeModeMessage?: string
  /** 考试性质 */
  examKind: ExamKindCode
  /** 考试性质展示名称 */
  examKindMessage?: string
  /** 原期末考试 ID */
  sourceExamId?: string
  /** 成绩合成策略 */
  scorePolicy?: ExamScorePolicyCode
  /** 开课学年 - 对应 ExamDetailResponse.teachingAcademicYear */
  teachingAcademicYear?: string
  /** 开课学期 - 对应 ExamDetailResponse.teachingSemester */
  teachingSemester?: SemesterCode
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
  semester: SemesterCode
  /** 考试名称（必填） */
  examName: string
  /** 考试编号（必填） */
  examNo: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 批改策略编码 */
  gradingStrategy: ExamGradingStrategyCode
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
  /** 开课学年；未传时后端默认与考试发生学年一致 */
  teachingAcademicYear?: string
  /** 开课学期；未传时后端默认与考试发生学期一致 */
  teachingSemester?: SemesterCode
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
  semester?: SemesterCode
  /** 考试名称 */
  examName: string
  /** 考试编号 */
  examNo: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 批改策略编码 */
  gradingStrategy: ExamGradingStrategyCode
  remark?: string
  dailyScoreFull?: number | null
  /** 是否涉密考试场次 */
  confidential?: boolean
  /** 开课学年；与 teachingSemester 须同时填写或同时留空 */
  teachingAcademicYear?: string
  /** 开课学期；与 teachingAcademicYear 须同时填写或同时留空 */
  teachingSemester?: SemesterCode
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

export {
  ALL_EXAM_STATUS_CODES,
  ExamStatusCode,
  ExamStatusDescription,
} from '@/types/enums/exam-status-enum'

/** 名册纳入方式筛选项 */
export const EXAM_ROSTER_SCOPE_MODE_OPTIONS: Array<{
  label: string
  value: ExamRosterScopeModeCode
}> = ALL_EXAM_ROSTER_SCOPE_MODE_CODES.map((value) => ({
  label: strictEnumLabel(ExamRosterScopeModeDescription, value, '名册范围模式'),
  value,
}))

/** 创建考试时的考生名册配置 - 对应 ExamRosterCreateRequest */
export interface ExamRosterCreateRequest {
  scopeMode: ExamRosterScopeModeCode
  classIds: string[]
  /** 参考班级维护上下文院系 ID */
  referenceDepartmentId?: string
  candidates: ExamCandidateRosterRequest[]
}

/** 创建考试前名册预览请求 - 对应 ExamCreateRosterPreviewRequest */
export interface ExamCreateRosterPreviewRequest {
  scopeMode: ExamRosterScopeModeCode
  classIds: string[]
  candidates?: ExamCandidateRosterRequest[]
}

/** 创建考试前名册预览响应 - 对应 ExamCreateRosterPreviewResponse */
export interface ExamCreateRosterPreviewResponse {
  scopeMode: ExamRosterScopeModeCode
  classIds: string[]
  candidates: ExamCandidateResponse[]
  candidateCount: number
}

/** 创建考试前可纳入参考班级查询请求 - 对应 ExamCreateEnrollableClassesQueryRequest */
export interface ExamCreateEnrollableClassesQueryRequest {
  referenceDepartmentId: string
}

/** 创建考试可纳入参考班级选项 - 对应 ExamEnrollableClassOptionResponse */
export interface ExamEnrollableClassOptionResponse {
  classId: string
  className: string
  studentCount: number
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
  organizationStatus: MarkingOrganizationStatusCode
  reviewerCount: number
  /** 租户 OCR 扫描渠道提示，未启用 OCR 时返回说明文案 */
  ocrScanAdvisory?: string
}

/** 分页查询考试列表。 */
export function pageExams(request: ExamPageQueryRequest): Promise<PageResult<ExamSummaryResponse>> {
  return http.post<PageResult<ExamSummaryResponse>>('/api/mark/exams/page', request)
}

/** 分页查询考试工作台列表（内嵌阅卷进度摘要）。 */
export function pageExamWorkbench(
  request: ExamWorkbenchPageQueryRequest,
): Promise<PageResult<ExamWorkbenchSummaryResponse>> {
  return http.post<PageResult<ExamWorkbenchSummaryResponse>>('/api/mark/exams/workbench-page', request)
}

/** 聚合统计考试工作台三 Tab 与 ACTIVE/CLOSED 概览计数。 */
export function countExamWorkbenchScopes(
  request: ExamPageQueryRequest,
): Promise<ExamWorkbenchScopeCountResponse> {
  return http.post<ExamWorkbenchScopeCountResponse>('/api/mark/exams/workbench-scope-counts', request)
}

/** 查询考试详情。 */
export function getExamDetail(examId: string): Promise<ExamDetailResponse> {
  return http.post<ExamDetailResponse>('/api/mark/exams/detail', { examId })
}

/** 保存考试制卷形态与整卷印刷来源。 */
export function saveMaterialLayout(request: ExamMaterialLayoutSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/material-layout/save', request)
}

/** 创建考试并初始化阅卷组织。 */
export function createExamBundle(
  request: ExamCreateBundleRequest,
): Promise<ExamCreateBundleResponse> {
  return http.post<ExamCreateBundleResponse>('/api/mark/exams/create-bundle', request)
}

/** 创建考试前预览名册（edu-user 真源）。 */
export function previewCreateExamRoster(
  request: ExamCreateRosterPreviewRequest,
): Promise<ExamCreateRosterPreviewResponse> {
  return http.post<ExamCreateRosterPreviewResponse>(
    '/api/mark/exams/create-roster-preview',
    request,
  )
}

/** 创建考试前按院系查询可纳入参考班级（过滤零学生班级）。 */
export function listCreateEnrollableClasses(
  request: ExamCreateEnrollableClassesQueryRequest,
): Promise<ExamEnrollableClassOptionResponse[]> {
  return http.post<ExamEnrollableClassOptionResponse[]>(
    '/api/mark/exams/create-enrollable-classes',
    request,
  )
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
  /** 班级 ID（edu-user）；非空时仅统计该班级考试范围内的学期 */
  classId?: string
  /** 参考院系 ID（edu-user）；非空时仅统计该院系参考上下文下的考试学期 */
  referenceDepartmentId?: string
}

/** DISTINCT 学期项 - 对应 ExamDistinctTermItemResponse */
export interface ExamDistinctTermItemResponse {
  academicYear: string
  /** 考试发生学期：1 秋季、2 春季（与后端 SemesterEnum 一致） */
  semester: SemesterCode
}

/** 查询租户内 DISTINCT 考试学期列表，按学期编码倒序。 */
export function listDistinctExamTerms(
  request: ExamDistinctTermQueryRequest = {},
): Promise<ExamDistinctTermItemResponse[]> {
  return http.post<ExamDistinctTermItemResponse[]>('/api/exam/distinct-terms', request)
}

/** 从缺考记录派生补考考试请求 - 对应 ExamMakeupDeriveRequest */
export interface ExamMakeupDeriveRequest {
  /** 原期末考试 ID */
  sourceExamId: string
  /** 补考发生学年，如 2024-2025 */
  academicYear: string
  /** 补考发生学期：1=秋季学期，2=春季学期 */
  semester: SemesterCode
  /** 补考名称 */
  examName: string
  /** 补考编号 */
  examNo: string
  /** 补考开始时间 */
  examStartTime: string
  /** 补考结束时间 */
  examEndTime: string
}

/** 从 CONFIRMED + PENDING_MAKEUP 缺考记录派生补考考试，返回新建补考考试 ID。 */
export function deriveMakeupExam(request: ExamMakeupDeriveRequest): Promise<string> {
  return http.post<string>('/api/exam/makeup/derive', request)
}
