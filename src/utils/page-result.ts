import type { PageResult } from '@/types'

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
