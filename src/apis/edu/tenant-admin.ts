/**
 * 租户管理员管理API
 * 对接后端 /api/admin/tenant/tenant-admin 接口
 */

import type { TenantAdminPermissionDTO } from '@/apis/auth'
import type { PageResult, QueryDto } from '@/types'
import { getTenantStorageUsage } from '@/apis/edu/storage-statistics'
import { getAllTenantQuotas } from '@/apis/edu/tenant-resource-quota'
import { getTenantUserStatistics } from '@/apis/edu/tenant-user-management'
import http from '@/config/axios'


/** 租户管理员查询DTO */
export interface TenantAdminQueryDto extends QueryDto {
  /** 关键词搜索 */
  keyword?: string
  /** 角色键 */
  roleKey?: string
  /** 是否为租户管理员 */
  tenantAdmin?: string
}

/** 租户管理员信息DTO - 对齐后端 UserListItemDto */
export interface TenantAdminDto {
  /** 用户ID */
  id: string
  /** 租户ID */
  tenantId: string
  /** 登录用户名 */
  userName: string
  /** 昵称 */
  nickName?: string
  /** 姓名 */
  name?: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  mobile?: string
  /** 角色键 */
  roleKey: string
  /** 是否为租户管理员 */
  tenantAdmin: boolean
  /** 用户状态 */
  status: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime?: string
}

/** 设置租户管理员请求DTO */
export interface SetTenantAdminRequestDto {
  /** 用户ID */
  userId: string
  /** 是否设为租户管理员 */
  tenantAdmin: boolean
  /** 备注 */
  remarks?: string
}


/**
 * 创建租户管理员 - 对应后端 POST /api/admin/tenant/tenant-admin/create
 */
export function createTenantAdmin(data: { tenantId: string, userId: string }): Promise<void> {
  return http.post<void>('/api/admin/tenant/tenant-admin/create', {
    tenantId: data.tenantId,
    userList: [data.userId],
  })
}


/**
 * 移除租户管理员权限 - 对应后端 POST /api/admin/tenant/tenant-admin/delete
 * 后端接口参数：{ tenantId: Long, userList: List<Long> }
 */
export function removeTenantAdmin(data: { userId: string, tenantId: string }): Promise<void> {
  return http.post<void>('/api/admin/tenant/tenant-admin/delete', {
    tenantId: data.tenantId,
    userList: [data.userId]
  })
}

/**
 * 获取租户管理员列表 - 对应后端 POST /api/admin/tenant/tenant-admin/admins
 */
export function getTenantAdmins(data: { tenantId: string }): Promise<TenantAdminDto[]> {
  return http.post<TenantAdminDto[]>('/api/admin/tenant/tenant-admin/admins', data)
}

/**
 * 检查租户管理员权限 - 对应后端 GET /api/admin/tenant/tenant-admin/check-permission
 */
export function checkTenantAdminPermission(): Promise<TenantAdminPermissionDTO> {
  return http.get<TenantAdminPermissionDTO>('/api/admin/tenant/tenant-admin/check-permission')
}


/** 租户管理员Dashboard统计数据 */
export interface TenantAdminDashboardStats {
  /** 租户总用户数 */
  totalUsers: number
  /** 活跃用户数 */
  activeUsers: number
  /** 教师数量 */
  teacherCount: number
  /** 学生数量 */
  studentCount: number
  /** 管理员数量 */
  adminCount: number
  /** 存储使用量（MB） */
  storageUsed: number
  /** 存储配额（MB） */
  storageQuota: number
  /** 存储使用率百分比 */
  storageUsagePercent: number
  /** CPU使用率 */
  cpuUsage: number
  /** 内存使用率 */
  memoryUsage: number
  /** 在线用户数 */
  onlineUsers: number

  // 后端计算好的百分比字段和配额相关字段
  /** 最大用户数 */
  maxUsers?: number
  /** 最大存储空间（MB） */
  maxStorage?: number
  /** 实训总数 */
  totalPractices?: number
  /** 最大实训数 */
  maxPractices?: number
  /** 用户使用率百分比（后端计算） */
  usageRate?: number
  /** 实训使用率百分比（后端计算） */
  practiceUsageRate?: number
}

/**
 * 获取租户教师列表 - 对应后端 POST /api/admin/tenant/tenant-admin/teachers
 */
export function getTenantTeachers(data: TenantAdminQueryDto): Promise<PageResult<TenantAdminDto>> {
  return http.post<PageResult<TenantAdminDto>>('/api/admin/tenant/tenant-admin/teachers', data)
}

/**
 * 获取租户教师详情 - 对应后端 POST /api/admin/tenant/tenant-admin/teacher-detail
 */
export function getTenantTeacherDetail(id: string): Promise<TenantAdminDto> {
  return http.post<TenantAdminDto>('/api/admin/tenant/tenant-admin/teacher-detail', { id })
}

/**
 * 获取系统状态统计（前端聚合）
 * - 用户统计：来源于租户用户管理接口
 * - 存储统计：来源于存储统计接口和配额接口
 */
export async function getSystemStats(): Promise<TenantAdminDashboardStats> {
  const [userStats, storageUsageBytes, allQuotas] = await Promise.all([
    getTenantUserStatistics(),
    getTenantStorageUsage(),
    getAllTenantQuotas(),
  ])

  // 从所有配额中筛选存储配额
  const storageQuota = allQuotas?.find(quota => quota.resourceType === 'STORAGE_SPACE')

  // 将字节转换为MB（与配额单位保持一致）
  const storageUsedMB = storageUsageBytes ? Math.round(storageUsageBytes / (1024 * 1024)) : 0
  const storageQuotaMB = storageQuota ? Number(storageQuota.quotaLimit) : 0

  // 计算存储使用率百分比
  const storageUsagePercent = storageQuotaMB > 0 ? Math.round((storageUsedMB / storageQuotaMB) * 100) : 0

  return {
    totalUsers: userStats?.totalUsers ?? 0,
    activeUsers: userStats?.activeUsers ?? 0,
    teacherCount: userStats?.teacherCount ?? 0,
    studentCount: userStats?.studentCount ?? 0,
    adminCount: userStats?.adminCount ?? 0,
    storageUsed: storageUsedMB,
    storageQuota: storageQuotaMB,
    storageUsagePercent,
    cpuUsage: 0,
    memoryUsage: 0,
    onlineUsers: 0,
  }
}
