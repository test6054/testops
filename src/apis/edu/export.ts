import type { PageResult } from '@/types'
import type { AsyncTaskStatusEnum, ExportFormatEnum } from '@/types/enums'
import http from '@/config/axios'

/**
 * 导出业务类型枚举（与后端ExportBusinessType对应）
 */
export enum ExportBusinessType {
  /** 实践数据导出（ZIP格式：成绩表+交付物+答辩记录） */
  PRACTICE_EXPORT = 'PRACTICE_EXPORT',
  /** 学生成绩导出（Excel/PDF/Word） */
  STUDENT_GRADES = 'STUDENT_GRADES',
  /** 能力映射矩阵导出Excel */
  COMPETENCY_MAPPING_MATRIX = 'COMPETENCY_MAPPING_MATRIX',
  /** 达成度报告PDF导出 */
  COMPETENCY_ACHIEVEMENT_REPORT = 'COMPETENCY_ACHIEVEMENT_REPORT',
}

/**
 * 创建导出任务请求
 */
export interface ExportJobCreateRequest {
  /** 业务类型 */
  businessType: ExportBusinessType
  /** 导出格式，默认EXCEL */
  exportFormat?: ExportFormatEnum
  /** 租户导出配置ID（可选） */
  configId?: string
  /** 业务查询参数（JSON格式） */
  queryParams?: string
  /** 组织名称（用于文件命名） */
  orgName?: string
  /** 业务名称（用于文件命名） */
  bizName?: string
  /** 业务关键字（用于文件命名） */
  businessKey?: string
}

export interface ExportJobStatusVO {
  jobId: string
  businessType: string
  exportFormat: ExportFormatEnum | string
  status: AsyncTaskStatusEnum | string
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
  businessType?: string
  status?: string
  startTime?: string
  endTime?: string
}


/**
 * 创建导出任务（统一入口）
 * @param request 创建请求
 * @returns 任务ID
 */
export function createExportJob(request: ExportJobCreateRequest): Promise<string> {
  return http.post('/api/storage/export/jobs/create', request)
}

/**
 * 分页查询导出任务列表
 */
export function queryExportJobs(
  data: ExportJobQueryRequest,
): Promise<PageResult<ExportJobStatusVO>> {
  return http.post('/api/storage/export/jobs/list', data)
}

/**
 * 查询导出任务状态
 */
export function getExportJobStatus(jobId: string): Promise<ExportJobStatusVO> {
  return http.get('/api/storage/export/jobs/status', { params: { jobId } })
}

/**
 * 删除导出任务
 */
export function deleteExportJob(jobId: string): Promise<void> {
  return http.post('/api/storage/export/jobs/delete', null, { params: { jobId } })
}

/**
 * 获取支持的业务类型列表
 */
export function getBusinessTypes(): Promise<ExportBusinessType[]> {
  return http.get('/api/storage/export/jobs/business-types')
}
