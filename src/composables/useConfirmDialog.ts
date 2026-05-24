/**
 * 全局确认对话框 composable
 *
 * 设计目标：统一替换分散的 Modal.confirm 调用，使用项目 UiConfirmDialog 渲染。
 *
 * 使用方式：
 * ```ts
 * import { confirmAsync } from '@/composables/useConfirmDialog'
 *
 * if (await confirmAsync({ title: '删除？', content: '不可恢复', type: 'error' })) {
 *   // 用户确认
 * }
 * ```
 *
 * 实现：单例 reactive state + 全局挂载的 GlobalConfirmDialog 组件读取该 state。
 */
import { reactive } from 'vue'

export type ConfirmDialogType = 'warning' | 'info' | 'success' | 'error'

export interface ConfirmAsyncOptions {
  title?: string
  content?: string
  type?: ConfirmDialogType
  okText?: string
  cancelText?: string
  width?: number
  hideCancel?: boolean
  /**
   * 异步确认回调；返回 false / 抛出错误时不会自动关闭对话框（业务可再次确认）。
   */
  onOk?: () => void | boolean | Promise<void | boolean>
}

interface InternalState {
  open: boolean
  loading: boolean
  options: Required<Omit<ConfirmAsyncOptions, 'onOk'>> & { onOk?: ConfirmAsyncOptions['onOk'] }
  resolver: ((value: boolean) => void) | null
}

const defaultOptions: Required<Omit<ConfirmAsyncOptions, 'onOk'>> = {
  title: '提示',
  content: '',
  type: 'warning',
  okText: '确认',
  cancelText: '取消',
  width: 440,
  hideCancel: false,
}

const state: InternalState = reactive({
  open: false,
  loading: false,
  options: { ...defaultOptions },
  resolver: null,
})

/**
 * 触发确认对话框；返回 Promise<boolean>。
 * - 用户点击确认 → 等待 onOk（如有），onOk 抛错或返回 false → resolve(false)，否则 resolve(true)。
 * - 用户取消 → resolve(false)。
 */
export function confirmAsync(options: ConfirmAsyncOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    state.options = {
      ...defaultOptions,
      ...options,
      onOk: options.onOk,
    }
    state.resolver = resolve
    state.loading = false
    state.open = true
  })
}

/**
 * 内部使用：GlobalConfirmDialog 通过该函数读取 reactive 状态。
 */
export function useConfirmDialogState(): { state: InternalState } {
  return { state }
}

/**
 * 内部使用：GlobalConfirmDialog 在用户点击确认时调用。
 */
export async function handleConfirmOk(): Promise<void> {
  const { resolver, options } = state
  if (!resolver) return

  if (options.onOk) {
    state.loading = true
    try {
      const result = await options.onOk()
      if (result === false) {
        state.loading = false
        return
      }
    }
    catch {
      state.loading = false
      return
    }
    state.loading = false
  }

  state.open = false
  resolver(true)
  state.resolver = null
}

/**
 * 内部使用：GlobalConfirmDialog 在用户取消时调用。
 */
export function handleConfirmCancel(): void {
  const { resolver } = state
  state.open = false
  state.loading = false
  if (resolver) {
    resolver(false)
    state.resolver = null
  }
}
