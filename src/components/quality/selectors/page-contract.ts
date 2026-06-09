import type { PageResult } from '@/types'
import { readAllPages, readArrayResponse, readPageList } from '@/utils/page-result'

function listLoadFallback(moduleName: string): string {
  return `${moduleName}加载失败，请稍后重试`
}

/**
 * 校验后端分页响应必须包含 list 数组。
 * 缺少 list 代表前后端分页契约断裂，不能在选择器中兜底成空列表。
 */
export function requirePageList<T>(res: PageResult<T>, moduleName: string): T[] {
  return readPageList(res, listLoadFallback(moduleName))
}

/**
 * 按分页协议读取选择器完整候选集。
 * 中间页缺失或分页元数据异常代表候选源不完整，必须显式失败。
 */
export function requireAllPages<T>(
  loadPage: (pageNum: number) => Promise<PageResult<T>>,
  moduleName: string,
): Promise<T[]> {
  return readAllPages(loadPage, listLoadFallback(moduleName))
}

/**
 * 校验后端非分页列表响应必须是数组。
 * 响应结构错误代表前后端列表契约断裂，不能在选择器中兜底成空列表。
 */
export function requireArrayResult<T>(res: unknown, moduleName: string): T[] {
  return readArrayResponse<T>(res, listLoadFallback(moduleName))
}
