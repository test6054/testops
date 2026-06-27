/**
 * 全局带输入框的确认对话框（替代 Modal.confirm + Textarea）。
 */
import type { VNode } from 'vue'
import { reactive } from 'vue'

export type PromptInputDialogType = 'warning' | 'info' | 'success' | 'error'

export interface PromptInputAsyncOptions {
  title: string
  placeholder?: string
  required?: boolean
  okText?: string
  cancelText?: string
  okType?: 'primary' | 'danger'
  rows?: number
  emptyErrorMessage?: string
  type?: PromptInputDialogType
  content?: VNode
}

interface InternalState {
  open: boolean
  loading: boolean
  value: string
  error: string
  options: PromptInputAsyncOptions
  resolver: ((value: string | null) => void) | null
}

const state: InternalState = reactive({
  open: false,
  loading: false,
  value: '',
  error: '',
  options: { title: '' },
  resolver: null,
})

export function promptInputAsync(options: PromptInputAsyncOptions): Promise<string | null> {
  return new Promise((resolve) => {
    state.options = options
    state.value = ''
    state.error = ''
    state.loading = false
    state.resolver = resolve
    state.open = true
  })
}

export function usePromptInputDialogState(): { state: InternalState } {
  return { state }
}

export function handlePromptInputCancel(): void {
  const { resolver } = state
  state.open = false
  state.loading = false
  state.error = ''
  if (resolver) {
    resolver(null)
    state.resolver = null
  }
}

export async function handlePromptInputOk(): Promise<void> {
  const { resolver, options } = state
  if (!resolver)
    return

  const trimmed = state.value.trim()
  if (options.required && !trimmed) {
    state.error = options.emptyErrorMessage || '内容不能为空'
    return
  }

  state.open = false
  state.error = ''
  state.loading = false
  resolver(trimmed || null)
  state.resolver = null
}
