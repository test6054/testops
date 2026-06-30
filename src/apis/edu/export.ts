import type { PageResult } from '@/types'
import type { AsyncTaskStatusEnum, ExportFormatEnum } from '@/types/enums'
import http from '@/config/axios'

/**
 * 导出业务类型枚举（与后端ExportBusinessType对应）
 */
export enum ExportBusinessType {
  /** 实践数据导出（ZIP格式：成绩表+交付物+答辩记录） */
  PRACTICE_EXPORT = 'practice_export',
  /** 学生成绩导出（Excel/PDF/Word） */
  STUDENT_GRADES = 'student_grades',
  /** 能力映射矩阵导出Excel */
  COMPETENCY_MAPPING_MATRIX = 'competency_mapping_matrix',
  /** 达成度报告PDF导出 */
  COMPETENCY_ACHIEVEMENT_REPORT = 'competency_achievement_report',
  /** 质量评价达成度结果导出 */
  QUALITY_ACHIEVEMENT_RESULT_EXPORT = 'quality_achievement_result_export',
  /** 质量评价成绩批次导出 */
  QUALITY_SCORE_BATCH_EXPORT = 'quality_score_batch_export',
  /** 质量评价成绩明细导出 */
  QUALITY_SCORE_RECORD_EXPORT = 'quality_score_record_export',
}

/**
 * 创建导出任务请求
 */
export interface ExportJobCreateRequest {
  /** 业务类型 */
  businessType: ExportBusinessType
  /** 导出格式 */
  exportFormat: ExportFormatEnum
  /** 租户导出配置ID（可选） */
  configId?: string
  /** 实践ID */
  practiceId?: string
  /** 班级ID */
  classId?: string
  /** 班级ID列表 */
  classIds?: string[]
  /** 能力图谱ID */
  mapId?: string
  /** 学生ID */
  studentId?: string
  /** 组织名称（用于文件命名） */
  orgName?: string
  /** 业务名称（用于文件命名） */
  bizName?: string
  /** 业务关键字（用于文件命名） */
  businessKey?: string
  /** 业务查询参数（JSON 字符串，传递给业务服务） */
  queryParams?: string
}

export interface ExportJobStatusVO {
  jobId: string
  businessType: ExportBusinessType
  exportFormat: ExportFormatEnum
  status: AsyncTaskStatusEnum
  /** 进度百分比（0-100） */
  progress?: number
  fileName?: string
  fileSize?: number
  fileContentType?: string
  fileNodeId?: string
  /** 失败原因 */
  failReason?: string
  /** 错误信息（前端展示用，等同failReason） */
  errorMessage?: string
  createdTime: string
  completedTime?: string
  configId?: string
}

/**
 * 导出任务分页查询参数
 */
export interface ExportJobQueryRequest {
  pageNum: number
  pageSize: number
  businessType?: ExportBusinessType
  status?: AsyncTaskStatusEnum
  startTime?: string
  endTime?: string
}


/**
 * 创建导出任务（统一入口）
 * @param request 创建请求
 * @returns 任务ID
 */
export function createExportJob(request: ExportJobCreateRequest): Promise<string> {
  return http.post<string>('/api/storage/export/jobs/create', request)
}

/**
 * 分页查询导出任务列表
 */
export function queryExportJobs(
  data: ExportJobQueryRequest,
): Promise<PageResult<ExportJobStatusVO>> {
  return http.post<PageResult<ExportJobStatusVO>>('/api/storage/export/jobs/list', data)
}

/**
 * 查询导出任务状态
 */
export function getExportJobStatus(jobId: string): Promise<ExportJobStatusVO> {
  return http.get<ExportJobStatusVO>('/api/storage/export/jobs/status', { params: { jobId } })
}

/**
 * 删除导出任务
 */
export function deleteExportJob(jobId: string): Promise<void> {
  return http.post<void>('/api/storage/export/jobs/delete', null, { params: { jobId } })
}

/**
 * 获取支持的业务类型列表
 */
export function getBusinessTypes(): Promise<ExportBusinessType[]> {
  return http.get<ExportBusinessType[]>('/api/storage/export/jobs/business-types')
}
