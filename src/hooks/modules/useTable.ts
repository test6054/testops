import type { Ref } from 'vue'
import type { Options } from '@/hooks'
import type { PageResult, QueryDto } from '@/types'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useBreakpoint, usePagination } from '@/hooks'
import { showUserError } from '@/utils/error-handler'

interface UseTableOptions<T, U> {
  formatResult?: (data: T[]) => U[]
  onSuccess?: () => void
  immediate?: boolean
  rowKey?: keyof T
  paginationOption?: Options
}

interface PaginationParams extends QueryDto {
  pageNum: number
  pageSize: number
}

type Api<T> = (params: PaginationParams) => Promise<PageResult<T>> | Promise<T[]>

export function useTable<T extends U, U = T>(api: Api<T>, options?: UseTableOptions<T, U>) {
  const { formatResult, onSuccess, immediate, rowKey } = options || {}
  const { pagination, setTotal } = usePagination(() => getTableData(), options?.paginationOption)
  const loading = ref(false)
  const tableData: Ref<U[]> = ref([])
  const tableError = ref<Error | null>(null)
  /** 是否至少成功加载过一次；用于筛选失败时保留旧表数据（乐观更新回滚语义） */
  const hasLoadedOnce = ref(false)
  let requestSeq = 0

  async function getTableData() {
    const seq = ++requestSeq
    loading.value = true
    tableError.value = null
    try {
      const params: PaginationParams = {
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
      }
      // 直接使用响应数据（HTTP客户端已经解包了ResultInfo）
      const actualData = await api(params)
      if (seq !== requestSeq) {
        return
      }

      if (Array.isArray(actualData)) {
        const contractError = new TypeError('列表接口必须返回 PageResult，禁止返回裸数组')
        tableError.value = contractError
        if (!hasLoadedOnce.value) {
          tableData.value = []
          setTotal(0)
        }
        showUserError(contractError, '数据加载失败')
        return
      }
      const data = actualData.list
      tableData.value = formatResult ? formatResult(data) : data
      setTotal(actualData.total)
      hasLoadedOnce.value = true

      onSuccess && onSuccess()
    } catch (err) {
      if (seq !== requestSeq) {
        return
      }
      tableError.value = err instanceof Error ? err : new Error(String(err))
      // 首屏失败清空；筛选/翻页失败保留旧数据，避免「空白闪烁」
      if (!hasLoadedOnce.value) {
        tableData.value = []
        setTotal(0)
      }
      showUserError(err, '数据加载失败')
    } finally {
      if (seq === requestSeq) {
        loading.value = false
      }
    }
  }

  // 是否立即触发
  const isImmediate = immediate ?? true
  if (isImmediate) {
    getTableData().catch(() => {
      // 错误已在getTableData中处理
    })
  }

  // 多选
  const selectedKeys = ref<(string | number)[]>([])
  // 仅使用到的选择事件最小类型定义
  type OnSelect = (rowKeys: (string | number)[]) => void
  type OnSelectAll = (checked: boolean) => void

  const select: OnSelect = (rowKeys: (string | number)[]) => {
    if (Array.isArray(rowKeys)) {
      selectedKeys.value = rowKeys
    }
  }

  // 全选
  const selectAll: OnSelectAll = (checked: boolean) => {
    const key = rowKey ?? 'id'
    const rows = tableData.value.filter((item) => !isDisabledTableRow(item))
    if (!checked) {
      selectedKeys.value = []
      return
    }
    const keys: (string | number)[] = []
    for (const item of rows) {
      const rowKeyValue = resolveSelectedRowKey(item, key)
      if (rowKeyValue != null) {
        keys.push(rowKeyValue)
      }
    }
    selectedKeys.value = keys
  }

  function isDisabledTableRow(item: U): boolean {
    if (typeof item !== 'object' || item === null || !('disabled' in item)) {
      return false
    }
    return item.disabled === true
  }

  function resolveSelectedRowKey(item: U, key: keyof T | 'id'): string | number | null {
    if (typeof item !== 'object' || item === null || !(key in item)) {
      showUserError(null, '表格行缺少选择键，请刷新页面后重试')
      return null
    }
    const value = Object.getOwnPropertyDescriptor(item, key)?.value
    if (typeof value !== 'string' && typeof value !== 'number') {
      showUserError(null, '表格行选择键类型无效，请刷新页面后重试')
      return null
    }
    return value
  }

  // 查询
  const search = () => {
    selectedKeys.value = []
    pagination.onChange(1)
  }

  // 刷新
  const refresh = () => {
    getTableData().catch(() => {
      // 错误已在getTableData中处理
    })
  }

  // 删除
  const handleDelete = async <T>(
    deleteApi: () => Promise<T>,
    options?: {
      title?: string
      content?: string
      successTip?: string
      showModal?: boolean
      multiple?: boolean
    },
  ): Promise<boolean | undefined> => {
    const onDelete = async () => {
      try {
        await deleteApi()
        // 删除成功，执行后续操作
        // 计算新总页数
        const deleteNum = options?.multiple ? selectedKeys.value.length : 1
        const totalPage = Math.ceil((pagination.total - deleteNum) / pagination.pageSize)
        // 修正当前页码
        if (pagination.current > totalPage) {
          pagination.current = totalPage > 0 ? totalPage : 1
        }
        options?.multiple && (selectedKeys.value = [])
        void message.success(options?.successTip || '删除成功')
        await getTableData()
        return true
      } catch {
        return false
      }
    }
    const flag = options?.showModal ?? true // 是否显示对话框
    if (!flag) {
      return onDelete()
    }
    return confirmAsync({
      title: options?.title || '提示',
      content: options?.content || '是否确定删除该条数据？',
      type: 'warning',
      onOk: onDelete,
    })
  }

  const { breakpoint } = useBreakpoint()
  // 表格操作列在小屏下不固定在右侧
  const fixed = computed(() => (!['xs', 'sm'].includes(breakpoint.value) ? 'right' : undefined))

  return {
    /** 表格加载状态 */
    loading,
    /** 表格数据 */
    tableData,
    /** 表格加载错误 */
    tableError,
    /** 是否已成功加载过数据 */
    hasLoadedOnce,
    /** 获取表格数据 */
    getTableData,
    /** 搜索，页码会重置为1 */
    search,
    /** 分页的传参 */
    pagination,
    /** 选择的行keys */
    selectedKeys,
    /** 选择行 */
    select,
    /** 全选行 */
    selectAll,
    /** 处理删除、批量删除 */
    handleDelete,
    /** 刷新表格数据，页码会缓存 */
    refresh,
    /** 操作列在小屏场景下不固定在右侧 */
    fixed,
  }
}
