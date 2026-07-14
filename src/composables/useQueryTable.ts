import type { Ref } from 'vue'
import type { PageResult, QueryDto } from '@/types'
import { ref } from 'vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
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
  onLoaded?: (rows: T[], params: QueryDto & F) => void | Promise<void>
}

/**
 * 标准后端分页列表：QueryDto + PageResult + UiDataTable server 模式。
 * 内建 loadError，失败时勿把空列表伪装成「暂无数据」。
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
  const requestToken = ref(0)
  const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()

  async function loadPage(): Promise<void> {
    const currentToken = ++requestToken.value
    const requestParams = {
      ...filters.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    } as QueryDto & F
    loading.value = true
    beginLoad()
    try {
      const page = await loadFn(requestParams)
      if (currentToken !== requestToken.value) {
        return
      }
      rows.value = page.list
      pageTotal.value = page.total
      if (page.pageNum != null) {
        pageNum.value = page.pageNum
      }
      if (page.pageSize != null) {
        pageSize.value = page.pageSize
      }
      okLoad()
      await options?.onLoaded?.(rows.value, requestParams)
    } catch (error) {
      if (currentToken !== requestToken.value) {
        return
      }
      rows.value = []
      pageTotal.value = 0
      failLoad()
      showUserError(error, options?.errorMessage ?? '加载失败')
    } finally {
      if (currentToken === requestToken.value) {
        loading.value = false
      }
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
    loadError,
    loadPage,
    reload: loadPage,
    search,
    handlePageChange,
    resetFilters,
  }
}
