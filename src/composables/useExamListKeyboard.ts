import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted } from 'vue'

export interface UseExamListKeyboardOptions {
  focusSearch: () => void
  createExam: () => void
  selectAllCurrentPage: () => void
  hasPageRows: Ref<boolean>
}

/**
 * 考试列表高频操作键盘入口；输入控件聚焦时只保留搜索聚焦，不劫持录入行为。
 */
export function useExamListKeyboard(options: UseExamListKeyboardOptions): void {
  function handleKeydown(event: KeyboardEvent): void {
    const target = event.target
    const editing = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || (target instanceof HTMLElement && target.isContentEditable)
    if (editing) return

    if (event.key === '/') {
      event.preventDefault()
      options.focusSearch()
      return
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      options.createExam()
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && options.hasPageRows.value) {
      event.preventDefault()
      options.selectAllCurrentPage()
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
}
