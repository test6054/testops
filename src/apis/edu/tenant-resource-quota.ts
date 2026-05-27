/**
 * 租户资源配额管理API
 * 对接后端 TenantResourceQuotaController 接口
 */

import type {PageResult} from '@/types'
import http from '@/config/axios'


/** 租户资源配额DTO - 对应后端TenantResourceQuotaDto */
export interface TenantResourceQuotaDto {
    /** 配额ID */
    id?: string
    /** 租户ID */
    tenantId: string
    /** 资源类型 */
    resourceType: string
    /** 资源类型描述 */
    resourceTypeDesc?: string
    /** 配额限制值（AI_TOKEN时为积分，其他为原始单位）— 后端 Long，FastJson2 序列化为 string */
    quotaLimit: string
    /** 当前使用量（AI_TOKEN时为积分，其他为原始单位）— 后端 Long，FastJson2 序列化为 string */
    usageCount: string
    /** 单位标识（用于前端展示，如“点”“MB”“个”） */
    unit?: string
    /** 使用率（百分比） */
    usageRate?: number
    /** 是否超出配额 */
    isExceeded?: boolean
    /** 是否显示为百分比（false表示显示为是/否） */
    showAsPercentage?: boolean
    /** 格式化显示值（如：是/否、启用/禁用） */
    displayValue?: string
    /** 最后更新时间 */
    lastUpdated?: string
}

/** 租户资源配额历史DTO - 对应后端TenantResourceQuotaHistoryDto */
export interface TenantResourceQuotaHistoryDto {
    /** 历史记录ID */
    id: string
    /** 租户ID */
    tenantId: string
    /** 资源类型 */
    resourceType: string
    /** 资源类型描述 */
    resourceTypeDesc?: string
    /** 操作类型 */
    operationType: string
    /** 操作前配额限制 */
    beforeQuotaLimit?: number
    /** 操作后配额限制 */
    afterQuotaLimit?: number
    /** 操作前使用量 */
    beforeUsageCount?: number
    /** 操作后使用量 */
    afterUsageCount?: number
    /** 变更量 */
    changeAmount?: number
    /** 变更原因 */
    reason?: string
    /** 操作者ID - 修复字段名：后端使用operatorUserId */
    operatorUserId?: string
    /** 操作者姓名 - 修复字段名：后端使用operatorUserName */
    operatorUserName?: string
    /** 操作时间 */
    operationTime: string
    /** 创建时间 */
    createTime?: string
}

/** 租户资源配额历史查询DTO - 对应后端TenantResourceQuotaHistoryQueryDto */
export interface TenantResourceQuotaHistoryQueryDto {
    /** 当前页码 - 继承自QueryDto */
    pageNum?: number
    /** 每页大小 - 继承自QueryDto */
    pageSize?: number
    /** 租户ID - 继承自QueryDto */
    tenantId?: string
    /** 开始时间 - 继承自QueryDto */
    startTime?: string
    /** 结束时间 - 继承自QueryDto */
    endTime?: string
    /** 资源类型，用于筛选特定类型的配额变更历史 */
    resourceType?: string
    /** 搜索关键词，用于模糊匹配变更原因 */
    keyword?: string
}

/** 租户资源配额批量设置DTO - 对应后端TenantResourceQuotaBatchSetDto */
export interface TenantResourceQuotaBatchSetDto {
    /** 租户ID */
    tenantId: string
    /** 变更原因 */
    reason: string
    /** 资源配额列表 */
    quotas: QuotaItem[]
}

/** 配额项 - 对应后端QuotaItem */
export interface QuotaItem {
    /** 资源类型 */
    resourceType: string
    /** 配额限制值 */
    quotaLimit: number
    /** 是否启用此资源配额（可选，默认true） */
    enabled?: boolean
}

/** 租户资源配额批量操作结果DTO - 对应后端TenantResourceQuotaBatchResultDto */
export interface TenantResourceQuotaBatchResultDto {
    /** 操作是否成功 */
    success: boolean
    /** 成功处理的资源配额数量 */
    successCount: number
    /** 失败的资源配额数量 */
    failureCount: number
    /** 总计处理的资源配额数量 */
    totalCount: number
    /** 操作结果详情 */
    results: QuotaOperationResult[]
    /** 更新后的所有资源配额信息 */
    updatedQuotas: TenantResourceQuotaDto[]
}

/** 单个配额操作结果 - 对应后端QuotaOperationResult */
export interface QuotaOperationResult {
    /** 资源类型 */
    resourceType: string
    /** 操作是否成功 */
    success: boolean
    /** 错误信息（如果操作失败） */
    errorMessage?: string
    /** 更新后的配额信息（如果操作成功） */
    quotaDto?: TenantResourceQuotaDto
}

/**
 * 获取租户所有资源配额 - 对应后端 GET /api/tenant/quota/list
 */
export function getAllTenantQuotas(tenantId?: string): Promise<TenantResourceQuotaDto[]> {
    const params = tenantId ? { tenantId } : {}
    return http.get<TenantResourceQuotaDto[]>('/api/tenant/quota/list', { params })
}


/**
 * 获取租户资源配额变更历史 - 对应后端 POST /api/tenant/quota/history
 */
export function getTenantQuotaHistory(query: TenantResourceQuotaHistoryQueryDto): Promise<PageResult<TenantResourceQuotaHistoryDto>> {
    return http.post<PageResult<TenantResourceQuotaHistoryDto>>('/api/tenant/quota/history', query)
}


/**
 * 批量设置租户资源配额 - 对应后端 POST /api/tenant/quota/batch-set
 * 单个事务处理，确保数据一致性
 */
export function batchSetTenantQuotas(batchSetDto: TenantResourceQuotaBatchSetDto): Promise<TenantResourceQuotaBatchResultDto> {
    return http.post<TenantResourceQuotaBatchResultDto>('/api/tenant/quota/batch-set', batchSetDto)
}



