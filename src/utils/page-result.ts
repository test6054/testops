import type { PageResult } from '@/types'
import { toUserError } from '@/utils/error-handler'

/**
 * 读取分页响应 list；结构不符合时使用用户可见 fallback，不暴露 list 等协议字段名。
 */
export function readPageList<T>(result: PageResult<T>, userFallback: string): T[] {
  if (!Array.isArray(result.list)) {
    throw toUserError(null, userFallback)
  }
  return result.list
}

/**
 * 读取非分页列表响应；结构不符合时使用用户可见 fallback。
 */
export function readArrayResponse<T>(result: unknown, userFallback: string): T[] {
  if (!Array.isArray(result)) {
    throw toUserError(null, userFallback)
  }
  return result
}

/**
 * 读取分页 total，非法数值显式失败。
 */
export function readPageTotal(result: PageResult<unknown>, userFallback = '分页数据异常，请刷新后重试'): number {
  const total = Number(result.total)
  if (!Number.isFinite(total) || total < 0) {
    throw toUserError(null, userFallback)
  }
  return total
}
