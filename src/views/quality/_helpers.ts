/**
 * 教学质量评价页面共享辅助函数
 *
 * 为避免在 `<script setup lang="ts">` 中直接使用 JSX（Vite 不会编译 .vue 内部的 JSX 表达式），
 * 用 vue h() 构造 Modal.confirm 的 content VNode。
 */
import type { VNode } from 'vue'
import { h, ref } from 'vue'
import { message, Modal, Textarea } from 'ant-design-vue'

export interface PromptModalOptions {
  title: string
  placeholder?: string
  required?: boolean
  okText?: string
  okType?: 'primary' | 'danger'
  rows?: number
  emptyErrorMessage?: string
  content?: VNode
}

/**
 * 弹出一个带文本输入框的确认对话框。
 * 用户点 OK 时 resolve 输入值（已去首尾空格）；点取消 resolve null。
 * 若 required=true 且输入为空，对 promise 保持 pending 并弹出错误提示。
 */
export function promptModal(options: PromptModalOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const value = ref('')
    Modal.confirm({
      title: options.title,
      okText: options.okText,
      okType: options.okType,
      content: () =>
        h('div', {}, [
          options.content,
          h(Textarea, {
            'value': value.value,
            'onUpdate:value': (val: string) => { value.value = val },
            'placeholder': options.placeholder || '',
            'autoSize': { minRows: options.rows ?? 3, maxRows: (options.rows ?? 3) + 2 },
          }),
        ]),
      onOk: () => {
        const trimmed = value.value.trim()
        if (options.required && !trimmed) {
          message.error(options.emptyErrorMessage || '内容不能为空')
          return Promise.reject(new Error('empty input'))
        }
        resolve(trimmed || null)
      },
      onCancel: () => resolve(null),
    })
  })
}

/**
 * 校验后端必填数值契约并格式化展示。
 */
export function formatRequiredNumber(value: unknown, fieldName: string, digits = 3): string {
  const numericValue = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(numericValue)) {
    throw new Error(`${fieldName}不符合前后端数值契约`)
  }
  return numericValue.toFixed(digits)
}

/**
 * 允许真实空业务值展示为空态，非空时必须是有效数值。
 */
export function formatOptionalNumber(value: unknown, fieldName: string, digits = 3): string {
  if (value === null || value === undefined || value === '') return '-'
  return formatRequiredNumber(value, fieldName, digits)
}
