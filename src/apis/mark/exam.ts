/**
 * 阅卷考试主记录 API - 对接 edu-mark 模块 ExamMarkController 的考试主对象接口。
 *
 * 仅保留考试主记录、详情、状态与制卷形态字段；考试范围、模板、扫描、成绩、复核等
 * 后端对象分别由同目录具体 API 文件承接。
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

/** 考试状态 BadgeTone 映射（用于 UiTag/UiBadge） */
export const EXAM_STATUS_TONE: Record<ExamStatusCode, BadgeTone> = {
  ACTIVE: 'green',
  CLOSED: 'gray',
}

/** 批改策略编码 */
export type GradingStrategyCode = 'SINGLE' | 'DOUBLE_BLIND'

/** 批改策略文案 */
export const GRADING_STRATEGY_LABEL: Record<GradingStrategyCode, string> = {
  SINGLE: '单评',
  DOUBLE_BLIND: '双评盲审',
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
  gradingStrategy?: GradingStrategyCode
  remark?: string
  /** 创建人用户ID - 对应后端 ExamSummaryResponse.createUser */
  createUser: string
  createTime?: string
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
}

/** 考试工作台列表范围 - 对应 ExamListScope */
export type ExamListScopeCode = 'ALL' | 'ONGOING' | 'PRIORITY'

/** 考试工作台分页查询请求 - 对应 ExamWorkbenchPageQueryRequest */
export interface ExamWorkbenchPageQueryRequest extends ExamPageQueryRequest {
  /** 列表范围 */
  listScope: ExamListScopeCode
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
  /** 日常成绩满分；为空表示本场考试不纳入日常成绩 */
  dailyScoreFull?: number
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
  /** 准备建议项（提示能力缺口，不阻断扫描） */
  prepAdvisoryReasons: string[]
  /** 准备硬阻断项（仅制卷形态与整卷印刷来源等扫描主链前置） */
  prepBlockingReasons: string[]
  /** 涉密 / 统考涉密场次；为 true 时前端启用强制水印与警示条 */
  confidential?: boolean
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
  /**
   * 平时成绩满分；为空表示本场考试仅计入考试成绩（期末笔试分），
   * 成绩确认时不采集平时分。有值时表示课程总评=考试分+平时分，确认时需录入平时分。
   */
  dailyScoreFull?: number | null
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

/** 考试归档关闭请求 - 对应 ExamCloseRequest */
export interface ExamCloseRequest {
  examId: string
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

/** 查询考试详情。 */
export function getExamDetail(examId: string): Promise<ExamDetailVO> {
  return http.post<ExamDetailVO>('/api/mark/exams/detail', { examId })
}

/** 保存考试制卷形态与整卷印刷来源。 */
export function saveMaterialLayout(request: ExamMaterialLayoutSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/material-layout/save', request)
}

/** 创建考试主记录，返回新考试ID。 */
export function createExam(request: ExamCreateRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/create', request)
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
