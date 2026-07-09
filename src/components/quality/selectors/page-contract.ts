import type { PageResult } from '@/types'

/** 质量域下拉首屏条数；禁止 readAllPages 全量翻页 */
export const QUALITY_SELECTOR_PAGE_SIZE = 50

/** 质量域下拉 remote 搜索防抖间隔（毫秒） */
export const QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS = 300

/** 工作台方案级权重聚合有界上限；超出须收窄或补独立统计 API */
export const QUALITY_WORKBENCH_AGG_BOUND = 500

/**
 * 质量域下拉首屏分页：只读第 1 页，超出须 keyword remote 搜索或收窄筛选。
 */
export async function loadSelectorFirstPage<T>(
  loadPage: (pageNum: number, pageSize: number) => Promise<PageResult<T>>,
  pageSize = QUALITY_SELECTOR_PAGE_SIZE,
): Promise<T[]> {
  const page = await loadPage(1, pageSize)
  return page.list
}

/**
 * 工作台方案级聚合：单页有界读取，超出 bound 时抛错。
 */
export async function loadBoundedPlanAggregate<T>(
  loadPage: (pageNum: number, pageSize: number) => Promise<PageResult<T>>,
  moduleName: string,
  bound = QUALITY_WORKBENCH_AGG_BOUND,
): Promise<T[]> {
  const page = await loadPage(1, bound)
  if (page.total > bound) {
    throw new Error(`${moduleName} 共 ${page.total} 条，超出工作台聚合上限 ${bound}，请收窄培养方案或联系管理员`)
  }
  return page.list
}
