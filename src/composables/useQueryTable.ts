import type { Ref } from 'vue'
import type { PageResult, QueryDto } from '@/types'
import { ref } from 'vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'

export interface QueryTablePageChangeEvent {
  current: number
  pageSize: number
}

type QueryTableLoader<T, F extends Record<string, unknown>> = (
  params: QueryDto & F,
) => Promise<PageResult<T>>

export interface UseQueryTableOptions<T, F extends Record<string, unknown>> {
  defaultFilters?: () => F
  immediate?: boolean
  errorMessage?: string
  onLoaded?: (rows: T[]) => void
}

/**
 * 标准后端分页列表：QueryDto + PageResult + UiDataTable server 模式。
 * 筛选变更调用 search() 重置到第 1 页；翻页调用 handlePageChange。
 */
export function useQueryTable<T, F extends Record<string, unknown> = Record<string, never>>(
  loadFn: QueryTableLoader<T, F>,
  options?: UseQueryTableOptions<T, F>,
) {
  const loading = ref(false)
  const rows = ref([]) as Ref<T[]>
  const pageNum = ref(1)
  const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
  const pageTotal = ref(0)
  const filters = ref((options?.defaultFilters?.() ?? {}) as F) as Ref<F>

  async function loadPage(): Promise<void> {
    loading.value = true
    try {
      const page = await loadFn({
        ...filters.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value,
      } as QueryDto & F)
      rows.value = page.list
      pageTotal.value = page.total
      if (page.pageNum != null) {
        pageNum.value = page.pageNum
      }
      if (page.pageSize != null) {
        pageSize.value = page.pageSize
      }
      options?.onLoaded?.(rows.value)
    } catch (error) {
      rows.value = []
      pageTotal.value = 0
      showUserError(error, options?.errorMessage ?? '数据加载失败')
    } finally {
      loading.value = false
    }
  }

  function search(): void {
    pageNum.value = 1
    void loadPage()
  }

  function handlePageChange(event: QueryTablePageChangeEvent): void {
    pageNum.value = event.current
    pageSize.value = event.pageSize
    void loadPage()
  }

  function resetFilters(): void {
    filters.value = (options?.defaultFilters?.() ?? {}) as F
    search()
  }

  if (options?.immediate !== false) {
    void loadPage()
  }

  return {
    loading,
    rows,
    pageNum,
    pageSize,
    pageTotal,
    filters,
    loadPage,
    reload: loadPage,
    search,
    handlePageChange,
    resetFilters,
  }
}
