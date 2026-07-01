import { reactive, toRefs, watch } from 'vue'
import { useBreakpoint } from '@/hooks'

type Callback = () => void

export interface Options {
  defaultPageSize: number
  defaultSizeOptions: string[]
}

export function usePagination(
  callback: Callback,
  options: Options = {
    defaultPageSize: 10,
    defaultSizeOptions: ['10', '20', '30', '40', '50'],
  },
) {
  const { breakpoint } = useBreakpoint()

  const pagination = reactive({
    showSizeChanger: true,
    showTotal: ((total: number) => `共 ${total} 条`) as ((total: number) => string) | undefined,
    current: 1,
    pageSize: options.defaultPageSize,
    pageSizeOptions: options.defaultSizeOptions,
    total: 0,
    simple: false,
    onChange: (page: number) => {
      pagination.current = page
      callback && callback()
    },
    onShowSizeChange: (_current: number, size: number) => {
      pagination.current = 1
      pagination.pageSize = size
      callback && callback()
    },
  })

  watch(
    () => breakpoint.value,
    () => {
      pagination.simple = ['xs'].includes(breakpoint.value)
      pagination.showTotal = ['xs'].includes(breakpoint.value)
        ? undefined
        : (total: number) => `共 ${total} 条`
    },
    { immediate: true },
  )

  const changeCurrent = pagination.onChange
  const changePageSize = pagination.onShowSizeChange

  function setTotal(value: number) {
    pagination.total = value
  }

  const { current, pageSize, total } = toRefs(pagination)

  return {
    current,
    pageSize,
    total,
    pagination,
    changeCurrent,
    changePageSize,
    setTotal,
  }
}
