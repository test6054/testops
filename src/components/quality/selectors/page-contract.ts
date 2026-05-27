import type { PageResult } from '@/types'

/**
 * 校验后端分页响应必须包含 list 数组。
 * 缺少 list 代表前后端分页契约断裂，不能在选择器中兜底成空列表。
 */
export function requirePageList<T>(res: PageResult<T>, moduleName: string): T[] {
  if (!Array.isArray(res.list)) {
    throw new TypeError(`${moduleName}分页响应缺少 list 数组`)
  }
  return res.list
}

/**
 * 校验后端非分页列表响应必须是数组。
 * 响应结构错误代表前后端列表契约断裂，不能在选择器中兜底成空列表。
 */
export function requireArrayResult<T>(res: T[], moduleName: string): T[] {
  if (!Array.isArray(res)) {
    throw new TypeError(`${moduleName}列表响应不是数组`)
  }
  return res
}
