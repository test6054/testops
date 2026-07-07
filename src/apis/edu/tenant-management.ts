/**
 * 租户管理模块 API - 统一的租户管理接口（类型+API）
 * 整合了类型定义和API调用，与后端完全对应
 */

// UserListItemDto 已在 admin-user.ts 中定义
import type { UserListItemDto } from './admin-user'
import type { PageResult, QueryDto } from '@/types'
// 从统一枚举导入，避免分散定义
import type { TenantStatusEnum, TenantTypeEnum } from '@/types/enums'
import type { TenantRenewalTypeCode } from '@/types/enums/tenant-renewal-type-enum'
import http from '@/config/axios'


/** 租户信息 - 与后端TenantInfoDto保持一致 */
export interface TenantInfo {
    /** 租户ID */
    id: string
    /** 租户代码 */
    tenantCode: string
    /** 租户名称 */
    tenantName: string
    /** 租户描述 */
    description?: string
    /** 关联学校ID */
    schoolId?: string
    /** 关联学校名称 */
    schoolName?: string
    /** Logo URL */
    logoUrl?: string
    /** 联系人 */
    contactPerson: string
    /** 联系电话 */
    contactPhone?: string
    /** 联系邮箱 */
    contactEmail?: string
    /** 租户状态 */
    status: TenantStatusEnum
    /** 租户类型 */
    tenantType?: TenantTypeEnum
    /** 试用期开始时间 */
    trialStartTime?: string
    /** 试用期结束时间 */
    trialEndTime?: string
    /** 过期时间 - 基于试用期或订阅期计算 */
    expireTime?: string
    /** 创建时间 */
    createTime: string
    /** 更新时间 */
    updateTime?: string
    /** 创建人ID */
    createUser?: string
    /** 更新人ID */
    updateUser?: string
    /** 租户管理员列表 */
    admins?: UserListItemDto[]
    /** 管理员名称 */
    adminName?: string
    /** 当前计入配额的在册学生数 */
    userCount?: number
    /** 活跃用户数 */
    activeUsers?: number
    /** 学生数量 */
    studentCount?: number
    /** 教师数量 */
    teacherCount?: number
    /** 已使用存储空间（MB） */
    usedStorage?: number
    /** 最大存储空间（MB） */
    maxStorage?: number

    // 配额信息字段 - 与后端TenantInfoDto保持一致
    /** 在册学生配额限制 */
    maxUsers?: number
    /** 存储配额限制(MB) */
    maxStorageQuota?: number
    /** 已使用存储(MB) */
    usedStorageQuota?: number
    /** 课程设计配额限制 */
    maxCourseDesigns?: number
    /** 已使用课程设计数 */
    usedCourseDesigns?: number
    /** 实训任务配额限制 */
    maxPractices?: number
    /** 已使用实训任务数 */
    usedPractices?: number
    /** AI Token配额限制 */
    maxAiTokens?: number
    /** 已使用AI Token数 */
    usedAiTokens?: number
}


/** 租户查询参数 - 与后端GetAllTenantsRequest保持一致 */
export interface TenantQuery extends QueryDto {
    /** 搜索关键词（租户名称或代码） */
    searchTerm?: string
    /** 状态筛选 */
    statusFilter?: string
    /** 租户类型 */
    tenantType?: string
    /** 管理员名称 */
    adminName?: string
}

/** 创建租户请求DTO - 与后端CreateTenantRequest保持一致 */
export interface CreateTenantRequest {
    /** 学校名称，全局唯一 */
    schoolName: string
    /** 学校代码，全局唯一 (后端自动生成) */
    schoolCode?: string
    /** 租户类型：CHUXIN/XINGGUANG/ZHIJIAO */
    tenantType: string
    /** 院系代码 (后端自动生成) */
    deptCode?: string
    /** 院系名称 */
    deptName: string
    /** 租户状态：TRIAL/ACTIVE/SUSPENDED */
    status: string
    /** 试用天数（状态为TRIAL时生效） */
    trialDays?: number
    /** 有效期至（状态为ACTIVE时生效） */
    expireDate?: string
    /** 联系人姓名 */
    contactPerson: string
    /** 联系电话 */
    contactPhone: string
    /** 联系邮箱 */
    contactEmail?: string
    /** 资源配额配置 */
    tenantConfig?: TenantResourceConfigDto
    /** 授权课程ID列表 */
    authorizedCourseIds?: string[]
}

/** 更新租户请求DTO - 与后端UpdateTenantRequest保持一致 */
export interface UpdateTenantRequest {
    /** 租户ID（必填） */
    id: string
    /** 租户名称 */
    tenantName?: string
    /** 租户代码 */
    tenantCode?: string
    /** 租户描述 */
    description?: string
    /** 联系人姓名 */
    contactPerson?: string
    /** 联系电话 */
    contactPhone?: string
    /** 联系邮箱 */
    contactEmail?: string
    /** 最大在册学生数 */
    maxUsers?: number
    /** 存储空间配额（MB） */
    maxStorageQuota?: number
    /** 实训项目数量 */
    maxCourseDesigns?: number
    /** 实训任务数量 */
    maxPractices?: number
    /** AI资源积分 */
    maxAiTokens?: number
    /** 租户状态 */
    status?: string
    /** 租户类型 */
    tenantType?: string
}

/** 租户信息DTO - 与后端TenantInfoDto保持一致 */
export interface TenantInfoDto extends TenantInfo {}

/** 租户资源配额配置DTO - 与后端TenantResourceConfigDto完全一致 */
export interface TenantResourceConfigDto {
    /** 在册学生数量 */
    maxUsers?: number
    /** 存储空间（MB） */
    maxStorageQuota?: number
    /** 实训项目数量 */
    maxCourseDesigns?: number
    /** 实训任务数量 */
    maxPractices?: number
    /** AI资源积分 */
    maxAiTokens?: number
}

/** 租户续期请求 - 与后端TenantRenewalRequest保持一致 */
export interface TenantRenewalRequest {
    /** 租户ID */
    tenantId: string
    /** 续期类型：TRIAL_EXTEND/FORMAL_RENEW/UPGRADE */
    renewalType: TenantRenewalTypeCode
    /** 延长天数（仅适用于TRIAL_EXTEND） */
    extensionDays?: number
    /** 新的到期日期（仅适用于FORMAL_RENEW和UPGRADE，格式：yyyy-MM-dd） */
    newExpireDate?: string
    /** 续期原因 */
    reason?: string
    /** 是否同时调整资源配额 */
    adjustQuota?: boolean
    /** 资源配额配置（当adjustQuota为true时有效） */
    quotaConfig?: TenantResourceConfigDto
}


/** 学校统计响应 - 与后端TenantStatsResp保持一致 */
export interface TenantStatsResp {
    /** 总学校数 */
    totalTenants: number
    /** 活跃学校数 */
    activeTenants: number
    /** 试用学校数 */
    trialTenants: number
    /** 即将到期学校数 */
    expiringTenants: number
    /** 本月新增学校数 */
    monthlyNewTenants: number
    /** 学校类型分布 */
    typeDistribution: TypeDistribution[]
    /** 学校状态分布 */
    statusDistribution: StatusDistribution[]
}

/** 学校类型分布项 */
export interface TypeDistribution {
    type: string
    count: number
    percentage: number
}

/** 租户状态分布项 */
export interface StatusDistribution {
    status: string
    count: number
    percentage: number
}
/** 全局用户统计DTO - 对应后端GlobalUserStatisticsDto */
export interface GlobalUserStatisticsDto {
    /** 总用户数 */
    totalUsers: number
    /** 活跃用户数 */
    activeUsers: number
    /** 待审核用户数 */
    pendingApprovalUsers?: number
    /** 教师用户数（累积数据，用于dashboard显示） */
    teacherUsers?: number
    /** 学生用户数（累积数据，用于dashboard显示） */
    studentUsers?: number
    /** 租户数量 */
    totalTenants: number
    /** 今日新增用户（审核通过） */
    todayNewUsers: number
    /** 本月新增用户（审核通过） */
    monthlyNewUsers: number
}


/**
 * 获取租户列表 - 对应后端 POST /api/admin/tenant/all
 */
export function getTenantList(data: TenantQuery): Promise<PageResult<TenantInfo>> {
  return http.post<PageResult<TenantInfo>>('/api/admin/tenant/all', data)
}

/**
 * 获取租户详情 - 对应后端 GET /api/admin/tenant/get
 */
export function getTenantDetail(data: { id: string }): Promise<TenantInfo> {
  return http.get<TenantInfo>(`/api/admin/tenant/get?tenantId=${data.id}`)
}

/**
 * 获取当前租户的详细信息 - 对应后端 GET /api/admin/tenant/tenant-admin/current-tenant-info
 */
export function getCurrentTenantInfo(): Promise<TenantInfoDto> {
  return http.get<TenantInfoDto>('/api/admin/tenant/tenant-admin/current-tenant-info')
}

/**
 * 创建租户 - 对应后端 POST /api/admin/tenant/create
 */
export function createTenant(data: CreateTenantRequest): Promise<TenantInfoDto> {
  return http.post<TenantInfoDto>('/api/admin/tenant/create', data)
}

/**
 * 更新租户信息 - 对应后端 POST /api/admin/tenant/update
 */
export function updateTenant(data: UpdateTenantRequest): Promise<TenantInfoDto> {
  return http.post<TenantInfoDto>('/api/admin/tenant/update', data)
}

/**
 * 删除租户（软删除）
 * 对应后端 POST /api/admin/tenant/delete
 */
export function deleteTenant(id: string): Promise<void> {
    return http.post<void>('/api/admin/tenant/delete', {id})
}

/**
 * 租户续期 - 对应后端 POST /api/tenant/lifecycle/renew
 * 支持试用期延期、正式期续期、升级为正式版，可选配额调整
 */
export function renewTenant(data: TenantRenewalRequest): Promise<TenantInfoDto> {
  return http.post<TenantInfoDto>('/api/tenant/lifecycle/renew', data)
}


/**
 * 获取租户统计信息 - 对应后端 GET /api/admin/tenant/statistics
 */
export function getTenantStats(): Promise<TenantStatsResp> {
  return http.get<TenantStatsResp>('/api/admin/tenant/statistics')
}


/**
 * 获取所有活跃租户列表 - 对应后端 GET /api/admin/tenant/active
 */
export function getAllActiveTenants(): Promise<TenantInfoDto[]> {
  return http.get<TenantInfoDto[]>('/api/admin/tenant/active')
}


/**
 * 获取全局用户统计 - 对应后端 GET /api/admin/tenant/user/global/statistics
 */
export function getUserStats(): Promise<GlobalUserStatisticsDto> {
  return http.get<GlobalUserStatisticsDto>('/api/admin/tenant/user/global/statistics')
}
/** 租户和院系树节点 - 与后端TenantDepartmentTreeNodeDto保持一致 */
export interface TenantDepartmentTreeNode {
  /** 节点唯一标识 */
  id: string
  /** 节点显示名称 */
  label: string
  /** 租户ID */
  tenantId: string
  /** 院系ID（租户节点为null） */
  departmentId?: string
  /** 节点类型：tenant-租户节点，department-院系节点 */
  type: 'tenant' | 'department'
  /** 子节点列表 */
  children?: TenantDepartmentTreeNode[]
}

/**
 * 获取所有租户及其院系的树结构（仅SUPER_ADMIN可用）
 * 用于SUPER_ADMIN创建用户时选择租户和院系
 * 对应后端 POST /api/admin/tenant/department-tree
 */
export function getTenantDepartmentTree(): Promise<TenantDepartmentTreeNode[]> {
  return http.post<TenantDepartmentTreeNode[]>('/api/admin/tenant/department-tree', {})
}
