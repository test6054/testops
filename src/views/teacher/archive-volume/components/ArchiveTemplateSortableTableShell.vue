<script setup lang="ts" generic="T extends object">
import type { ColumnsType } from 'ant-design-vue/es/table'
import { ref, watch } from 'vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { useArchiveTemplateTableSortable } from '@/composables/useArchiveTemplateTableSortable'

defineOptions({ name: 'ArchiveTemplateSortableTableShell' })

const items = defineModel<T[]>({ required: true })

const props = withDefaults(
  defineProps<{
    columns: ColumnsType
    rowKey?: string
    emptyDescription?: string
    /** 当前 Tab 是否激活，切换后重新挂载 Sortable */
    active?: boolean
  }>(),
  {
    rowKey: 'rowKey',
    emptyDescription: '',
    active: true,
  },
)

const emit = defineEmits<{
  sorted: []
}>()

const tableRootRef = ref<HTMLElement | null>(null)

const { refreshSortable } = useArchiveTemplateTableSortable(tableRootRef, items, {
  onSorted: () => emit('sorted'),
})

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      void refreshSortable()
    }
  },
)
</script>

<template>
  <div ref="tableRootRef" class="archive-template-sortable-table">
    <UiDataTable
      pagination-mode="none"
      :columns="columns"
      :data-source="items"
      :show-pagination="false"
      flat
      :row-key="rowKey"
      size="small"
      :empty-description="emptyDescription || undefined"
    >
      <template #bodyCell="slotProps">
        <slot name="bodyCell" v-bind="slotProps" />
      </template>
    </UiDataTable>
  </div>
</template>

<style scoped>
.archive-template-sortable-table :deep(.archive-template-sortable__ghost) {
  opacity: 0.55;
  background: var(--dp-blue-50) !important;
}

.archive-template-sortable-table :deep(.ant-table-row) {
  transition: background-color 0.15s ease;
}
</style>
