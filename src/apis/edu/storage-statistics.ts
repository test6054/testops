/**
 * 存储统计API（简化版）
 * 对接后端 StorageStatisticsController (/api/storage/statistics)
 *
 * 重要：后端只实现了基础的存储使用量查询功能
 * 前端复杂的统计功能属于过度设计，已删除
 */

import http from '@/config/axios'

/**
 * 获取租户存储使用量 - 对应后端 POST /api/storage/statistics/tenant-usage
 * 注意：后端只返回字节数（Long类型），前端接收为number类型
 */
export function getTenantStorageUsage(): Promise<number> {
  return http.post<number>('/api/storage/statistics/tenant-usage')
}
