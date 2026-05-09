/**
 * 用户管理 API - 阅卷端精简版
 *
 * 阅卷端自身不提供用户新增、学生导入、班级学生查询等功能，这些由 edu-user 后台或课程实训端承担。
 * 本文件只保留「密码修改历史」这一阅卷端 change-password 页需要的最小集合。
 */
import http from '@/config/axios'

/** 密码修改历史记录 DTO - 与后端 PasswordHistoryDto 保持一致 */
export interface PasswordHistoryDto {
  /** 记录 ID */
  id: string
  /** 密码修改时间 */
  changeTime: string
  /** 修改操作者 ID（如果是管理员代为修改） */
  changedByUserId?: string
  /** 修改操作者名称 */
  changedByUserName?: string
  /** 修改类型（自己修改/管理员重置） */
  changeType: string
  /** IP 地址（如果有记录） */
  ipAddress?: string
  /** 设备信息（如果有记录） */
  deviceInfo?: string
  /** 操作状态（成功/失败） */
  success: boolean
  /** 下次提醒时间 */
  nextReminderTime?: string
  /** 策略禁用时间 */
  policyDisableTime?: string
}

/**
 * 获取密码修改历史记录 - 对应后端 POST /api/user/management/password-history
 */
export function getPasswordHistory(): Promise<PasswordHistoryDto[]> {
  return http.post<PasswordHistoryDto[]>('/api/user/management/password-history')
}
