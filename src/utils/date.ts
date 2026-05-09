/**
 * 日期时间工具函数
 *
 * @author 庆之 - 首席全栈架构师 & 教育科技产品专家
 */

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('zh-cn')

/**
 * 格式化日期时间
 * @param dateTime 日期时间字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (
  dateTime: string | Date | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!dateTime) return '-'
  return dayjs(dateTime).format(format)
}

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD'
 * @returns 格式化后的日期字符串
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format = 'YYYY-MM-DD'
): string => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

/**
 * 格式化时间
 * @param time 时间字符串或Date对象
 * @param format 格式化模板，默认为 'HH:mm:ss'
 * @returns 格式化后的时间字符串
 */
export const formatTime = (
  time: string | Date | null | undefined,
  format = 'HH:mm:ss'
): string => {
  if (!time) return '-'
  return dayjs(time).format(format)
}

/**
 * 获取相对时间描述
 * @param dateTime 日期时间字符串、Date对象或时间戳（number）
 * @returns 相对时间描述，如 '2小时前'、'3天前'
 */
export const getRelativeTime = (dateTime: string | Date | number | null | undefined): string => {
  if (!dateTime) return '-'
  return dayjs(dateTime).fromNow()
}

/**
 * 格式化截止时间
 * 将 00:00:00 的时间转换为当天 23:59:59 显示，符合教学场景的截止时间语义
 * 例如：2025-10-31 00:00:00 -> 2025-10-31 23:59:59
 * @param dateTime 日期时间字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的截止时间字符串
 */
export const formatDeadline = (
  dateTime: string | Date | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!dateTime) return '-'

  const date = dayjs(dateTime)

  // 如果时间是 00:00:00，转换为当天的 23:59:59
  if (date.hour() === 0 && date.minute() === 0 && date.second() === 0) {
    return date.hour(23).minute(59).second(59).format(format)
  }

  return date.format(format)
}


/**
 * 计算距离截止时间的毫秒差
 * 截止时间统一为截止日期当天的 23:59:59
 * @param endDate 截止日期字符串
 * @returns 毫秒差，null表示无效
 */
export const getTimeLeftMs = (endDate: string | Date | null | undefined): number | null => {
  if (!endDate) return null
  const deadline = dayjs(endDate).endOf('day')
  return deadline.diff(dayjs())
}

/**
 * 计算剩余时间的文本描述
 * @param endDate 截止日期字符串
 * @returns 剩余时间文本，格式：{天}天{小时}小时
 */
export const getTimeLeftText = (endDate: string | Date | null | undefined): string => {
  const diffMs = getTimeLeftMs(endDate)
  if (diffMs === null) return ''
  if (diffMs < 0) return '已截止'

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days === 0 && hours === 0) {
    return '即将截止'
  }

  if (days === 0) {
    return `${hours}小时`
  }

  return `${days}天${hours}小时`
}

/**
 * 获取剩余时间的样式等级
 * @param endDate 截止日期字符串
 * @returns 样式等级: 'red' | 'orange' | 'blue' | 'gray'
 */
export const getTimeLeftTone = (endDate: string | Date | null | undefined): 'red' | 'orange' | 'blue' | 'gray' => {
  const diffMs = getTimeLeftMs(endDate)
  if (diffMs === null) return 'gray'
  if (diffMs < 0) return 'red'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays <= 3) return 'orange'
  return 'blue'
}

/**
 * 计算剩余时间（用于统计卡片显示）
 * 截止时间为截止日期当天的 23:59:59
 * @param endDate 截止日期
 * @returns 剩余时间信息（days/hours/isOverdue）
 */
export const getRemainingDays = (endDate: string | Date | null | undefined): {
  days: number
  hours: number
  isOverdue: boolean
} => {
  const diffMs = getTimeLeftMs(endDate)
  if (diffMs === null) return {days: 0, hours: 0, isOverdue: false}

  if (diffMs < 0) {
    // 已逾期
    const absDiffMs = Math.abs(diffMs)
    const totalHours = Math.floor(absDiffMs / (1000 * 60 * 60))
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    return {days, hours, isOverdue: true}
  }

  // 未逾期
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return {days, hours, isOverdue: false}
}

/**
 * 计算两个日期之间的天数（包含首尾）
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 天数
 */
export const getDaysBetween = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number => {
  if (!startDate || !endDate) return 0
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).endOf('day')
  return Math.max(0, end.diff(start, 'day') + 1)
}

/**
 * 格式化距离当前时间的描述（getRelativeTime 的别名）
 * 例如：'2小时前'、'3天前'、'刚刚'
 *
 * @param dateTime 日期时间字符串、Date对象或时间戳
 * @returns 相对时间描述
 */
export const formatDistanceToNow = getRelativeTime
