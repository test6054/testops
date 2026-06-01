/**
 * 租户状态枚举（简化版） - 与后端 TenantStatusEnum 完全对应
 * - TRIAL: 试用期
 * - ACTIVE: 正式使用（活跃）
 * - SUSPENDED: 已暂停（统一表示不可用，包括手动暂停、禁用、过期等情况）
 */
export enum TenantStatusEnum {
  /** 试用 - 租户处于试用期 */
  TRIAL = 'TRIAL',
  /** 活跃 - 租户正式使用中 */
  ACTIVE = 'ACTIVE',
  /** 已暂停 - 租户不可用（包括手动暂停、禁用、过期等所有不可用情况） */
  SUSPENDED = 'SUSPENDED'
}

/** 租户状态配置 - 用于前端UI展示 */
export const TENANT_STATUS_CONFIG: Record<TenantStatusEnum, { label: string, color: string }> = {
  [TenantStatusEnum.TRIAL]: { label: '试用', color: 'var(--ant-color-primary)' },
  [TenantStatusEnum.ACTIVE]: { label: '活跃', color: 'var(--ant-color-success)' },
  [TenantStatusEnum.SUSPENDED]: { label: '已暂停', color: 'var(--ant-color-error)' },
}

/** 获取租户状态标签 */
export function getTenantStatusLabel(status: TenantStatusEnum): string {
  return strictEnumValue(TENANT_STATUS_CONFIG, status, '租户状态').label
}

/** 获取租户状态颜色 */
export function getTenantStatusColor(status: TenantStatusEnum): string {
  return strictEnumValue(TENANT_STATUS_CONFIG, status, '租户状态').color
}

import { strictEnumValue } from '@/utils/strict-enum'
