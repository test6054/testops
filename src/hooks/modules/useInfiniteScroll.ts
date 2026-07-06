import type { Ref } from 'vue'
import type { PageResult, QueryDto } from '@/types'
import { computed, ref } from 'vue'
import { showUserError } from '@/utils/error-handler'

interface InfiniteScrollOptions<T, U> {
  formatResult?: (data: T[]) => U[]
  onSuccess?: () => void
  immediate?: boolean
  pageSize?: number
  threshold?: number // 距离底部多少像素时触发加载
}

interface InfiniteScrollParams extends QueryDto {
  pageNum: number
  pageSize: number
}

type Api<T> = (params: InfiniteScrollParams) => Promise<PageResult<T>> | Promise<T[]>

export function useInfiniteScroll<T extends U, U = T>(
  api: Api<T>,
  options?: InfiniteScrollOptions<T, U>,
) {
  const { formatResult, onSuccess, immediate = true, pageSize = 10 } = options || {}

  const loading = ref(false)
  const loadingMore = ref(false)
  const dataList: Ref<U[]> = ref([])
  const hasMore = ref(true)
  const currentPage = ref(1)
  const total = ref(0)
  const error = ref<Error | null>(null)

  // 加载数据
  async function loadData(isLoadMore = false) {
    if (loading.value || (isLoadMore && loadingMore.value) || (isLoadMore && !hasMore.value)) {
      return
    }

    try {
      if (isLoadMore) {
        loadingMore.value = true
      } else {
        loading.value = true
        currentPage.value = 1
        dataList.value = []
      }

      error.value = null

      const params: InfiniteScrollParams = {
        pageNum: currentPage.value,
        pageSize,
      }

      const res = await api(params)

      let newData: T[]
      let totalCount: number

      // 处理响应数据
      if (Array.isArray(res)) {
        newData = res
        totalCount = res.length
        hasMore.value = res.length === pageSize
      } else {
        newData = res.list
        totalCount = Number(res.total)

        // 计算是否还有更多数据
        const currentTotal = isLoadMore ? dataList.value.length + newData.length : newData.length
        hasMore.value = currentTotal < totalCount
      }

      // 格式化数据
      const formattedData = formatResult ? formatResult(newData) : newData

      if (isLoadMore) {
        // 加载更多时追加数据
        dataList.value = [...dataList.value, ...formattedData]
        currentPage.value++
      } else {
        // 首次加载或刷新时替换数据
        dataList.value = formattedData
        currentPage.value = 2 // 下次加载更多时从第2页开始
      }

      total.value = totalCount
      onSuccess?.()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      showUserError(err, '数据加载失败，请稍后重试')
      if (!isLoadMore) {
        dataList.value = []
        hasMore.value = false
      }
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 刷新数据（重新从第一页开始）
  const refresh = () => {
    hasMore.value = true
    return loadData(false)
  }

  // 加载更多数据
  const loadMore = () => {
    if (hasMore.value && !loading.value && !loadingMore.value) {
      return loadData(true)
    }
  }

  // 搜索（重置到第一页）
  const search = () => {
    hasMore.value = true
    return loadData(false)
  }

  // 状态计算
  const isEmpty = computed(() => !loading.value && dataList.value.length === 0)

  // 初始加载
  if (immediate) {
    void loadData(false)
  }

  return {
    /** 列表数据 */
    dataList,
    /** 首次加载中 */
    loading,
    /** 加载更多中 */
    loadingMore,
    /** 是否还有更多数据 */
    hasMore,
    /** 当前页码 */
    currentPage,
    /** 总数 */
    total,
    /** 错误信息 */
    error,
    /** 是否为空 */
    isEmpty,
    /** 刷新（重置） */
    refresh,
    /** 加载更多 */
    loadMore,
    /** 搜索（重置） */
    search,
  }
}
