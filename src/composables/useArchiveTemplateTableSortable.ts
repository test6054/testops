import type {Ref} from 'vue';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useDraggable } from 'vue-draggable-plus'

export const ARCHIVE_TEMPLATE_DRAG_HANDLE = '.archive-template-editor__drag-handle'

/**
 * 将 SortableJS 绑定到 Ant Design Vue 表格 tbody，实现行拖拽排序。
 */
export function useArchiveTemplateTableSortable<T>(
  tableRootRef: Ref<HTMLElement | null | undefined>,
  listRef: Ref<T[]>,
  options?: {
    onSorted?: () => void
  },
) {
  const sortableTargetRef = ref<HTMLElement | null>(null)
  const { start, pause } = useDraggable(sortableTargetRef, listRef, {
    handle: ARCHIVE_TEMPLATE_DRAG_HANDLE,
    animation: 150,
    draggable: '.ant-table-row',
    ghostClass: 'archive-template-sortable__ghost',
    immediate: false,
    onUpdate: () => {
      options?.onSorted?.()
    },
  })

  async function refreshSortable() {
    pause()
    await nextTick()
    sortableTargetRef.value = tableRootRef.value?.querySelector<HTMLElement>('.ant-table-tbody') ?? null
    if (sortableTargetRef.value && listRef.value.length > 0) {
      start()
    }
  }

  watch(
    () => [tableRootRef.value, listRef.value.length] as const,
    () => {
      void refreshSortable()
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    pause()
  })

  return { refreshSortable }
}
