import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'


/** 操作日志查询参数 - 对应后端LogQueryDto */
export interface OperationLogQueryDto extends QueryDto {
  /** 项目ID */
  projectId?: string
  /** 业务类别 */
  category?: string
  /** 功能模块 */
  module?: string
  /** 操作类型 */
  type?: string
  /** 操作类型列表 */
  types?: string[]
  /** 用户信息（用户名或用户ID） */
  user?: string
  /** 操作状态（1成功 0失败） */
  status?: number
  /** 操作描述 */
  description?: string
}

/** 操作日志DTO - 与后端OperateLogDto完全对应 */
export interface OperationLogDto {
  /** 记录ID - 后端Long转String */
  id: string
  /** 业务类别 */
  category: string
  /** 功能模块 */
  module: string
  /** 操作类型 */
  type: string
  /** 业务ID - 后端Long转String */
  bizId?: string
  /** 租户ID - 后端String */
  tenantId: string
  /** 业务名称 */
  bizName?: string
  /** 项目名称 */
  projectName?: string
  /** 操作详情 */
  detail: string
  /** 请求URL */
  requestUrl?: string
  /** 被调用的方法名 */
  calledMethod: string
  /** 用户信息 - 后端返回UserDto对象 */
  userDto: {
    id: string
    userName: string
    nickName: string
  }
  /** 请求参数 */
  requestParam?: string
  /** 响应结果 */
  responseResult?: string
  /** 操作状态（1成功 0失败） */
  status: number
  /** 错误消息和堆栈 */
  errorStack?: string
  /** 操作时间 */
  createTime: string
  /** 变更详情 (JSON格式) */
  changeDetails?: string
}

/** 操作日志详情 - 对应后端 OperateLogDto 详情接口返回 */
export interface OperationLogDetailDto extends OperationLogDto {
  /** 追踪ID */
  traceId?: string
  /** 请求方法 */
  requestMethod?: string
  /** 请求头 */
  requestHeaders?: string
  /** 请求体 */
  requestBody?: string
  /** 状态码 */
  statusCode?: number
  /** 响应头 */
  responseHeaders?: string
  /** 响应体 */
  responseBody?: string
}


/**
 * 分页查询操作日志 - 对应后端 POST /api/admin/operation-logs/page
 */
export function getOperationLogPage(
  data: OperationLogQueryDto,
): Promise<PageResult<OperationLogDto>> {
  return http.post<PageResult<OperationLogDto>>('/api/admin/operation-logs/page', data)
}

/**
 * 查询操作日志详情 - 对应后端 POST /api/admin/operation-logs/detail
 */
export function getOperationLogDetail(id: string): Promise<OperationLogDetailDto> {
  return http.post<OperationLogDetailDto>('/api/admin/operation-logs/detail', { id })
}

/**
 * 批量删除操作日志 - 对应后端 POST /api/admin/operation-logs/batch-delete
 */
export function batchDeleteOperationLogs(ids: string[]): Promise<void> {
  return http.post<void>('/api/admin/operation-logs/batch-delete', ids)
}

/**
 * 获取操作模块列表 - 对应后端 GET /api/admin/operation-logs/modules
 */
export function getOperationModules(): Promise<string[]> {
  return http.get<string[]>('/api/admin/operation-logs/modules')
}

/**
 * 获取业务类别列表 - 对应后端 GET /api/admin/operation-logs/categories
 */
export function getOperationCategories(): Promise<string[]> {
  return http.get<string[]>('/api/admin/operation-logs/categories')
}

/**
 * 清空操作日志 - 对应后端 POST /api/admin/operation-logs/clear
 */
export function clearOperationLogs(): Promise<void> {
  return http.post<void>('/api/admin/operation-logs/clear')
}
