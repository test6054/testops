/**
 * 租户用户管理API
 * 专门用于租户管理员管理本租户下的用户
 * 对接后端 TenantUserController 接口
 */

import type { UserDetailDto, UserListItemDto } from './admin-user'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'


/** 租户用户查询DTO */
export interface TenantUserQueryDto extends QueryDto {
  /** 搜索关键词（用户名、昵称、邮箱） */
  keyword?: string
  /** 用户状态筛选 */
  status?: string
  /** 角色键筛选 */
  roleKey?: string
  /** 租户ID（通常由后端自动获取） */
  tenantId?: string
}

/** 租户用户统计信息 - 与后端TenantUserStatisticsDTO匹配 */
export interface TenantUserStatistics {
  /** 租户ID */
  tenantId: string
  /** 总用户数 */
  totalUsers: number
  /** 教师数量 */
  teacherCount: number
  /** 学生数量 */
  studentCount: number
  /** 管理员数量 */
  adminCount: number
  /** 活跃用户数（最近30天有登录的用户） */
  activeUsers: number
  /** 新用户数（最近30天注册的用户） */
  newUsers: number
}

/** 用户登录历史记录DTO */
export interface UserLoginHistoryDto {
  /** 记录ID */
  id: string
  /** 用户ID */
  userId: string
  /** 用户类型 */
  userType: string
  /** 用户账号 */
  userName: string
  /** 登录IP */
  userIp: string
  /** 浏览器信息 */
  userAgent: string
  /** 登录时间 */
  createTime: string
  /** 租户ID */
  tenantId: string
  /** 登录是否成功 */
  success: boolean
}


/**
 * 获取租户用户列表（分页）
 * 对应后端 POST /api/tenant/admin/users
 */
export function getTenantUserList(data: TenantUserQueryDto): Promise<PageResult<UserListItemDto>> {
  return http.post<PageResult<UserListItemDto>>('/api/tenant/admin/users', data)
}

/**
 * 获取租户用户详情
 * 对应后端 POST /api/tenant/admin/user/detail
 */
export function getTenantUserDetail(data: { id: string }): Promise<UserDetailDto> {
  return http.post<UserDetailDto>('/api/tenant/admin/user/detail', data)
}

/**
 * 激活租户用户
 * 对应后端 POST /api/tenant/admin/user/activate
 */
export function activateTenantUser(data: { id: string }): Promise<void> {
  return http.post<void>('/api/tenant/admin/user/activate', data)
}

/**
 * 停用租户用户
 * 对应后端 POST /api/tenant/admin/user/deactivate
 */
export function deactivateTenantUser(data: { id: string }): Promise<void> {
  return http.post<void>('/api/tenant/admin/user/deactivate', data)
}

/**
 * 获取租户用户登录历史
 * 对应后端 POST /api/tenant/admin/user/login-history
 */
export function getTenantUserLoginHistory(data: {
  userId: string
  pageNum: number
  pageSize: number
}): Promise<PageResult<UserLoginHistoryDto>> {
  return http.post<PageResult<UserLoginHistoryDto>>('/api/tenant/admin/user/login-history', data)
}

/**
 * 获取租户用户统计信息
 * 对应后端 POST /api/tenant/admin/users/statistics
 */
export function getTenantUserStatistics(): Promise<TenantUserStatistics> {
  return http.post<TenantUserStatistics>('/api/tenant/admin/users/statistics', {})
}

/**
 * 更新租户用户基本信息
 * 对应后端 POST /api/tenant/admin/user/update
 * 注意：
 * - userName, nickName 是后端必填字段
 * - role 为可选，不传则保持原有角色不变（租户管理员不应修改角色）
 * - email 传空字符串而非 undefined
 */
export function updateTenantUser(data: {
  userId: string
  userName: string
  nickName: string
  email: string
  mobile: string
  role?: string // 可选，不传则保持原有角色
  departmentId?: string
}): Promise<void> {
  return http.post<void>('/api/tenant/admin/user/update', data)
}

/**
 * 更改租户用户状态
 * 对应后端 POST /api/tenant/admin/user/change-status
 */
export function changeTenantUserStatus(data: {
  userId: string
  targetStatus: string
}): Promise<void> {
  return http.post<void>('/api/tenant/admin/user/change-status', data)
}
