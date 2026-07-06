import type { PageResult } from '@/types'

export function readPageList<T>(result: PageResult<T>, _userFallback: string): T[] {
  return result.list
}

export function readArrayResponse<T>(result: T[], _userFallback: string): T[] {
  return result
}

export function readPageTotal(
  result: PageResult<unknown>,
  _userFallback = '分页数据加载失败，请刷新后重试',
): number {
  return Number(result.total)
}

export async function readAllPages<T>(
  loadPage: (pageNum: number) => Promise<PageResult<T>>,
  _userFallback: string,
): Promise<T[]> {
  const items: T[] = []
  let pageNum = 1
  while (true) {
    const page = await loadPage(pageNum)
    items.push(...page.list)
    const totalPages = Number(page.pages)
    if (pageNum >= totalPages || totalPages === 0) {
      return items
    }
    pageNum += 1
  }
}
