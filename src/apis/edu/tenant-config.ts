/**
 * 租户配置管理API
 * 对接后端 /api/tenant/config 接口
 */

import http from '@/config/axios'


/** 租户配置DTO - 与后端TenantConfigDto保持一致 */
export interface TenantConfigDto {
  /** 主键ID */
  id?: string
  /** 租户ID */
  tenantId: string
  /** 租户名称（与学校名称保持一致） */
  tenantName?: string
  /** 租户编码，全局唯一 */
  tenantCode?: string
  /** Logo URL */
  logoUrl?: string
  /** Logo文件ID */
  logoFileId?: string
  /** 描述 */
  description?: string
  /** 联系人 */
  contactPerson?: string
  /** 联系电话 */
  contactPhone?: string
  /** 联系邮箱 */
  contactEmail?: string
  /** SMTP主机 */
  smtpHost?: string
  /** SMTP端口 */
  smtpPort?: number
  /** SMTP用户名 */
  smtpUsername?: string
  /** SMTP密码 */
  smtpPassword?: string
  /** 是否启用邮件 */
  emailEnabled?: boolean
  /** 关联学校ID（学校类型租户） */
  schoolId?: string
  /** 学校名称 */
  schoolName?: string
}

/** 租户邮件配置（前端表单模型，所有字段均有初始值） */
export interface TenantEmailConfig {
  /** 是否启用邮件 */
  enabled: boolean
  /** SMTP主机 */
  smtpHost: string
  /** SMTP端口 */
  smtpPort: number
  /** SMTP用户名 */
  smtpUsername: string
  /** SMTP密码 */
  smtpPassword: string
}

/** 租户配置获取请求 */
export interface TenantConfigGetRequest {
  /** 租户ID */
  tenantId: string
}

/** 租户配置更新请求 - 与后端TenantConfigDto保持一致 */
export interface TenantConfigUpdateRequest {
  /** 租户ID */
  tenantId: string
  /** 租户名称 */
  tenantName?: string
  /** 租户编码，全局唯一 */
  tenantCode?: string
  /** Logo URL */
  logoUrl?: string
  /** Logo文件ID */
  logoFileId?: string
  /** 描述 */
  description?: string
  /** 联系人 */
  contactPerson?: string
  /** 联系电话 */
  contactPhone?: string
  /** 联系邮箱 */
  contactEmail?: string
  /** 关联学校ID（学校类型租户） */
  schoolId?: string
  /** 学校名称 */
  schoolName?: string
  /** SMTP主机 */
  smtpHost?: string
  /** SMTP端口 */
  smtpPort?: number
  /** SMTP用户名 */
  smtpUsername?: string
  /** SMTP密码 */
  smtpPassword?: string
  /** 是否启用邮件 */
  emailEnabled?: boolean
}


/**
 * 获取租户配置 - 对应后端 POST /api/tenant/config/get
 * 修复：统一使用POST接口，参数必传，避免URL参数序列化问题
 */
export function getTenantConfig(tenantId: string): Promise<TenantConfigDto> {
  const request: TenantConfigGetRequest = { tenantId }
  return http.post<TenantConfigDto>(`/api/tenant/config/get`, request)
}

/**
 * 更新租户配置 - 对应后端 POST /api/tenant/config/update
 */
export function updateTenantConfig(data: TenantConfigUpdateRequest): Promise<void> {
  return http.post<void>(`/api/tenant/config/update`, data)
}

/**
 * 测试指定租户的邮件配置 - 对应后端 POST /api/tenant/config/email/test/{tenantId}
 * @param tenantId 租户ID
 * @returns 测试是否成功
 */
export function testTenantEmailConfiguration(tenantId: string): Promise<boolean> {
  return http.post<boolean>(`/api/tenant/config/email/test/${tenantId}`)
}
