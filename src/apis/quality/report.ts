import type { ReportExportStatus, ReportStatus, ReportType } from './types'
/**
 * 教学质量评价报告 API - 对接 edu-quality / ReportController
 *
 * 后端路径: /api/quality/reports
 * 方法：create / update / delete / detail / page / transit-status / export
 *
 * 字段与 ReportVO / ReportSaveRequest / ReportStatusTransitRequest / ReportQueryRequest 严格一致。
 * /export 返回 void，文件 ID 由后端写库后通过 /detail 拿回 wordFileId/pdfFileId/excelFileId。
 */
import type { PageResult, QueryDto } from '@/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'

const BASE = '/api/quality/reports'

/** 后端 ReportVO 真值（一一对应 Java 字段；Long ID 在接口中以 string 透传） */
export interface ReportVO {
  id: string
  tenantId?: string
  reportType: ReportType
  programId?: string
  programName: string
  trainingPlanId?: string
  trainingPlanCode: string
  trainingPlanName: string
  qualityCourseId?: string
  qualityCourseCode: string
  qualityCourseName: string
  achievementResultId?: string
  achievementResultLabel: string
  title: string
  schoolYear: string
  semester: SemesterCode
  bodyContent?: string
  wordFileId?: string
  pdfFileId?: string
  excelFileId?: string
  status: ReportStatus
  confirmedUserId?: string
  confirmedTime?: string
  archivedUserId?: string
  archivedTime?: string
  /** 三格式导出状态机（IDLE/PENDING/PROCESSING/COMPLETED/FAILED） */
  exportStatus: ReportExportStatus
  /** 导出失败原因（FAILED 状态下由 ReportExportExecutor 回填） */
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
  reportType?: ReportType
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  schoolYear?: string
  semester?: SemesterCode
  status?: ReportStatus
  keyword?: string
}

/** 后端 ReportSaveRequest 真值 */
export interface ReportSaveRequest {
  id?: string
  reportType: ReportType
  programId: string
  trainingPlanId?: string
  qualityCourseId?: string
  achievementResultId?: string
  title: string
  schoolYear: string
  semester: SemesterCode
  bodyContent?: string
  wordFileId?: string
  pdfFileId?: string
  excelFileId?: string
}

/** 报告编辑表单：学期未选时为 undefined，提交前须显式选择，禁止静默默认 */
export type ReportEditorForm = Omit<ReportSaveRequest, 'semester'> & {
  semester?: SemesterCode
}

/** 后端 ReportStatusTransitRequest 真值 */
export interface ReportStatusTransitRequest {
  id: string
  targetStatus: ReportStatus
}

export const reportApi = {
  page: (data: ReportQueryRequest) => http.post<PageResult<ReportVO>>(`${BASE}/page`, data),
  detail: (id: string) => http.post<ReportVO>(`${BASE}/detail`, { id }),
  create: (data: ReportSaveRequest) => http.post<string>(`${BASE}/create`, data),
  update: (data: ReportSaveRequest) => http.post<void>(`${BASE}/update`, data),
  delete: (id: string) => http.post<void>(`${BASE}/delete`, { id }),
  /** 状态流转 DRAFT→SUBMITTED→CONFIRMED/RETURNED→ARCHIVED */
  transitStatus: (data: ReportStatusTransitRequest) =>
    http.post<void>(`${BASE}/transit-status`, data),
  /**
   * 触发异步三格式导出：后端 ReportServiceImpl.export 仅写 exportStatus=PENDING 即返回；
   * ReportExportScheduler 定时抢占后由 ReportExportExecutor 生成 Word/PDF/Excel
   * 并上传 edu-storage，成功时回写 fileId + exportStatus=COMPLETED，失败则
   * exportStatus=FAILED + exportErrorMessage。
   * 前端通过 detail 轮询 exportStatus 获取进度。
   */
  export: (id: string) => http.post<void>(`${BASE}/export`, { id }),
}
