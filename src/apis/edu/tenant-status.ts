/**
 * 租户状态管理API
 * 对接后端 TenantStatusController 接口
 */

import type { IdRequest } from '@/types'
import http from '@/config/axios'


/** 开始试用请求 - 对应后端StartTrialPeriodRequest */
export interface StartTrialPeriodRequest {
  /** 租户ID */
  tenantId: string
  /** 试用天数，默认30天 */
  trialDays?: number
}

/** 延长试用请求 - 对应后端ExtendTrialPeriodRequest */
export interface ExtendTrialPeriodRequest {
  /** 租户ID */
  tenantId: string
  /** 延长天数 */
  extensionDays: number
  /** 延长原因 */
  reason?: string
}

/** 租户状态更新请求 - 对应后端TenantStatusUpdateRequest */
export interface TenantStatusUpdateRequest {
  /** 租户ID */
  tenantId: string
  /** 新状态 */
  newStatus: string
  /** 变更原因 */
  reason?: string
}



/**
 * 检查租户状态 - 对应后端 POST /api/tenant/status/validate
 * 请求体契约：IdRequest（字段名 id）
 */
export function checkTenantStatus(data: IdRequest): Promise<boolean> {
  return http.post<boolean>('/api/tenant/status/validate', data)
}


/**
 * 开启租户试用期 - 对应后端 POST /api/tenant/status/start-trial
 */
export function startTrialPeriod(data: StartTrialPeriodRequest): Promise<void> {
  return http.post<void>('/api/tenant/status/start-trial', data)
}

/**
 * 延长租户试用期 - 对应后端 POST /api/tenant/status/extend-trial
 */
export function extendTrialPeriod(data: ExtendTrialPeriodRequest): Promise<void> {
  return http.post<void>('/api/tenant/status/extend-trial', data)
}



