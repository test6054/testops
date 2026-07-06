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
  /** 业务主键 ID - 后端 Long */
  bizId?: string
}

/** 操作日志DTO - 与后端 OperateLogDto 完全对应 */
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
  /** 业务变更摘要 */
  changeDetails?: string
}

/** 日志清空请求 - 对应后端 LogClearRequest */
export interface LogClearRequest {
  /** 清空多少天前的日志，默认 30 天 */
  beforeDays?: number
  /** 租户ID，不传则清空所有租户的日志 */
  tenantId?: string
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
export function getOperationLogDetail(id: string): Promise<OperationLogDto> {
  return http.post<OperationLogDto>('/api/admin/operation-logs/detail', { id })
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
export function clearOperationLogs(request: LogClearRequest): Promise<void> {
  return http.post<void>('/api/admin/operation-logs/clear', request)
}
