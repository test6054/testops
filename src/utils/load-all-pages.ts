import type { PageResult } from '@/types'

/**
 * 顺序拉取分页接口的全部数据，适用于仅用于下拉选择的任务/工作组列表，避免只显示第一页。
 */
export async function loadAllPages<T>(
  loader: (params: { pageNum: number, pageSize: number }) => Promise<PageResult<T>>,
  pageSize: number,
): Promise<T[]> {
  const rows: T[] = []
  let pageNum = 1
  let total = 0

  do {
    const page = await loader({ pageNum, pageSize })
    const list = page.list ?? []
    rows.push(...list)
    total = page.total ?? rows.length
    if (list.length === 0) {
      break
    }
    pageNum += 1
  } while (rows.length < total)

  return rows
}
