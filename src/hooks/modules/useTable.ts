import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import type { Options } from '@/hooks'
import { useBreakpoint, usePagination } from '@/hooks'
import type { PageResult, QueryDto } from '@/types'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
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

  async function getTableData() {
    loading.value = true
    tableError.value = null
    try {
      const params: PaginationParams = {
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
      }
      const res = await api(params)

      // 检查响应数据
      if (!res) {
        tableData.value = []
        setTotal(0)
        return
      }

      // 直接使用响应数据（HTTP客户端已经解包了ResultInfo）
      const actualData = res

      // 处理分页响应数据
      if (Array.isArray(actualData)) {
        // 如果返回的是数组，直接使用
        tableData.value = formatResult ? formatResult(actualData) : actualData
        setTotal(actualData.length)
      } else {
        // 如果返回的是PageResult格式
        const pageResult = actualData as PageResult<T>
        if (!pageResult) {
          tableData.value = []
          setTotal(0)
          return
        }

        // 后端PageResult保证list非null，使用??防御性处理
        const data = pageResult.list ?? []
        tableData.value = formatResult ? formatResult(data) : data
        setTotal(Number(pageResult.total))
      }

      onSuccess && onSuccess()
    } catch (err) {
      tableError.value = err as Error
      tableData.value = []
      setTotal(0)
      showUserError(err, '数据加载失败，请稍后重试')
    } finally {
      loading.value = false
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
    type Row = { disabled?: boolean } & Record<string, string | number>
    const arr = (tableData.value as Row[]).filter((i) => !(i?.disabled ?? false))
    selectedKeys.value = checked ? arr.map((i) => i[key as string]) : []
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
        message.success(options?.successTip || '删除成功')
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
    return new Promise((resolve) => {
      Modal.confirm({
        title: options?.title || '提示',
        content: options?.content || '是否确定删除该条数据？',
        maskClosable: false,
        onOk: async () => {
          const result = await onDelete()
          resolve(result)
        },
        onCancel: () => {
          resolve(false)
        },
      })
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
