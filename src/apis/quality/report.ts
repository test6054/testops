import type { ReportExportStatusCode, ReportStatusCode, ReportTypeCode } from './types'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
/**
 * 教学质量评价报告 API - 对接 edu-quality / ReportController
 *
 * 后端路径: /api/quality/reports
 * 方法：create / update / delete / detail / page / transit-status / export
 *
 * 字段与 ReportVO / ReportSaveRequest / ReportStatusTransitRequest / ReportQueryRequest 严格一致。
 * /export 返回本次 exportTaskId，文件 ID 由后端写库后通过 /detail 拿回。
 */
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/reports'

/** 后端 ReportVO 真值（一一对应 Java 字段；Long ID 在接口中以 string 透传） */
export interface ReportVO {
  id: string
  tenantId?: string
  reportType: ReportTypeCode
  programId?: string
  programName?: string
  trainingPlanId?: string
  trainingPlanCode?: string
  trainingPlanName?: string
  accreditationCycleId?: string
  accreditationCycleName?: string
  qualityCourseId?: string
  qualityCourseCode?: string
  qualityCourseName?: string
  achievementResultId?: string
  achievementResultLabel?: string
  title: string
  schoolYear: string
  semester: SemesterCode
  bodyContent?: string
  wordFileId?: string
  pdfFileId?: string
  excelFileId?: string
  status: ReportStatusCode
  confirmedUserId?: string
  confirmedTime?: string
  archivedUserId?: string
  archivedTime?: string
  /** 三格式导出状态机（IDLE/PENDING/PROCESSING/COMPLETED/FAILED） */
  exportStatus: ReportExportStatusCode
  /** 当前导出任务唯一身份；轮询必须绑定该值 */
  exportTaskId?: string
  /** 导出失败原因（FAILED 状态下由 QualityReportExportExecutor 回填） */
  exportErrorMessage?: string
  exportStartedTime?: string
  exportFinishedTime?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
}

/** 后端 ReportQueryRequest 真值 */
export interface ReportQueryRequest extends QueryDto {
  reportType?: ReportTypeCode
  programId?: string
  trainingPlanId?: string
  accreditationCycleId?: string
  qualityCourseId?: string
  achievementResultId?: string
  schoolYear?: string
  semester?: SemesterCode
  status?: ReportStatusCode
  keyword?: string
  /** 是否装配达成度结果展示标签；导出监控等轻量分页传 false */
  includeAchievementDisplay?: boolean
}

/** 后端 ReportSaveRequest 真值 */
export interface ReportSaveRequest {
  id?: string
  reportType: ReportTypeCode
  programId: string
  trainingPlanId?: string
  accreditationCycleId?: string
  qualityCourseId?: string
  achievementResultId?: string
  title: string
  schoolYear: string
  semester: SemesterCode
  bodyContent?: string
}

/** 报告编辑表单：学期未选时为 undefined，提交前须显式选择，禁止静默默认 */
export interface ReportEditorForm {
  id?: string
  reportType: ReportTypeCode
  programId: string
  trainingPlanId?: string
  accreditationCycleId?: string
  qualityCourseId?: string
  achievementResultId?: string
  title: string
  schoolYear: string
  semester?: SemesterCode
  bodyContent?: string
}

/** 后端 ReportStatusTransitRequest 真值 */
export interface ReportStatusTransitRequest {
  id: string
  targetStatus: ReportStatusCode
}

/** 按状态分组统计行 - 对齐后端 QualityStatusStatRow */
export interface ReportQualityStatusStatRow {
  status: ReportStatusCode
  recordCount: number
}

/** 按导出状态分组统计行 - 对齐后端 QualityStatusStatRow（export_status 分组） */
export interface ReportExportQualityStatusStatRow {
  status: ReportExportStatusCode
  recordCount: number
}

/** 按状态分组统计响应 - 对齐后端 QualityStatusCountsResponse */
export interface QualityStatusCountsResponse {
  totalCount: number
  statusCounts: ReportQualityStatusStatRow[]
  exportStatusCounts?: ReportExportQualityStatusStatRow[]
}

export const reportApi = {
  page: (data: ReportQueryRequest, config?: ExtendedAxiosRequestConfig) =>
    http.post<PageResult<ReportVO>>(`${BASE}/page`, data, config),
  statusCounts: (data: ReportQueryRequest) =>
    http.post<QualityStatusCountsResponse>(`${BASE}/status-counts`, data),
  detail: (id: string) =>
    http.post<ReportVO>(`${BASE}/detail`, { id }),
  create: (data: ReportSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ReportSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 状态流转 DRAFT→SUBMITTED→CONFIRMED/RETURNED→ARCHIVED */
  transitStatus: (data: ReportStatusTransitRequest) =>
    http.post<void>(`${BASE}/transit-status`, data),
  /**
   * 触发异步三格式导出：后端写 exportStatus=PENDING 并返回本次 exportTaskId；
   * 事务提交后立即抢占入导出池，QualityReportExportScheduler 兜底扫尾；
   * QualityReportExportExecutor 生成 Word/PDF/Excel 并上传 edu-storage，
   * 成功回写 fileId + COMPLETED，失败 FAILED + exportErrorMessage。
   * 前端通过 detail 按 exportTaskId 轮询 exportStatus，禁止混淆前后两次任务。
   */
  export: (id: string) => http.post<string>(`${BASE}/export`, { id }),
}
