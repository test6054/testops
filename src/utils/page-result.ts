import type { PageResult } from '@/types'
import { toUserError } from '@/utils/error-handler'

/**
 * 读取分页响应 list；结构不符合时使用用户可见 fallback，不暴露 list 等协议字段名。
 */
export function readPageList<T>(result: PageResult<T> | null | undefined, userFallback: string): T[] {
  if (result == null || !Array.isArray(result.list)) {
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
export function readPageTotal(
  result: PageResult<unknown> | null | undefined,
  userFallback = '分页数据异常，请刷新后重试',
): number {
  if (result == null) {
    throw toUserError(null, userFallback)
  }
  const total = Number(result.total)
  if (!Number.isFinite(total) || total < 0) {
    throw toUserError(null, userFallback)
  }
  return total
}

/**
 * 按后端 PageResult 协议读取完整业务集合；分页元数据异常或中间页为空时显式失败。
 */
export async function readAllPages<T>(
  loadPage: (pageNum: number) => Promise<PageResult<T>>,
  userFallback: string,
): Promise<T[]> {
  const items: T[] = []
  let pageNum = 1
  while (true) {
    const page = await loadPage(pageNum)
    const pageItems = readPageList(page, userFallback)
    const totalPages = Number(page.pages)
    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw toUserError(null, userFallback)
    }
    if (pageItems.length === 0 && pageNum < totalPages) {
      throw toUserError(null, userFallback)
    }
    items.push(...pageItems)
    if (pageNum >= totalPages || totalPages === 0) {
      return items
    }
    pageNum += 1
  }
}
