import type { PageResult } from '@/types'

export function requirePageList<T>(res: PageResult<T>, _moduleName: string): T[] {
  return res.list
}

export function requireAllPages<T>(
  loadPage: (pageNum: number) => Promise<PageResult<T>>,
  _moduleName: string,
): Promise<T[]> {
  async function load(): Promise<T[]> {
    const items: T[] = []
    let pageNum = 1
    while (true) {
      const page = await loadPage(pageNum)
      items.push(...page.list)
      if (pageNum >= page.pages || page.pages === 0) {
        return items
      }
      pageNum += 1
    }
  }
  return load()
}

export function requireArrayResult<T>(res: T[], _moduleName: string): T[] {
  return res
}
