<template>
  <UiDialog
    :open="props.open"
    :title="props.title"
    :width="props.width"
    :confirm-loading="props.confirmLoading"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    @update:open="handleOpenChange"
    @cancel="emit('cancel')"
  >
    <div class="ui-selection-modal">
      <UiSearchForm
        v-if="props.fields.length"
        v-model="filters"
        class="ui-selection-modal__search"
        :fields="props.fields"
        :search-text="props.searchText"
        :reset-text="props.resetText"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template v-for="name in forwardedFieldSlots" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </UiSearchForm>

      <UiDataTable
        v-model:current="current"
        v-model:page-size="pageSize"
        :columns="props.columns"
        :data-source="props.dataSource"
        :loading="props.loading"
        :row-key="props.rowKey"
        :total="props.total"
        :enable-selection="true"
        :selection-type="props.selectionType"
        :selected-row-keys="props.selectedRowKeys"
        :empty-title="props.emptyTitle"
        :empty-description="props.emptyDescription"
        @page-change="handlePageChange"
        @selection-change="handleSelectionChange"
        :sticky-header="false"
      >
        <template v-for="name in forwardedTableSlots" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </UiDataTable>
    </div>

    <template #footer>
      <UiButton variant="outline" @click="emit('cancel')">
        {{ props.cancelText }}
      </UiButton>
      <UiButton
        :loading="props.confirmLoading"
        :disabled="props.confirmDisabled"
        @click="emit('confirm')"
      >
        {{ props.okText }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'
import type { FilterField } from './types'
import { computed, useSlots } from 'vue'
import UiButton from './Button.vue'
import UiDataTable from './UiDataTable.vue'
import UiDialog from './UiDialog.vue'
import UiSearchForm from './UiSearchForm.vue'

defineOptions({
  name: 'UiSelectionModal',
})

const filters = defineModel<Record<string, unknown>>('filters', { default: () => ({}) })
const current = defineModel<number>('current', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: number
    fields?: FilterField[]
    columns: ColumnsType
    dataSource: unknown[]
    loading?: boolean
    rowKey?: string | ((record: unknown) => string | number)
    total?: number
    selectedRowKeys?: Key[]
    selectionType?: 'checkbox' | 'radio'
    confirmLoading?: boolean
    confirmDisabled?: boolean
    okText?: string
    cancelText?: string
    searchText?: string
    resetText?: string
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    width: 960,
    fields: () => [],
    loading: false,
    rowKey: 'id',
    total: 0,
    selectedRowKeys: () => [],
    selectionType: 'radio',
    confirmLoading: false,
    confirmDisabled: false,
    okText: '确认选择',
    cancelText: '取消',
    searchText: '搜索',
    resetText: '重置',
    emptyTitle: '',
    emptyDescription: '当前没有可展示的内容',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'search', value: Record<string, unknown>): void
  (e: 'reset', value: Record<string, unknown>): void
  (e: 'page-change', pageEvent: { current: number; pageSize: number }): void
  (e: 'selection-change', rowKeys: Key[]): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const slots = useSlots()

const forwardedFieldSlots = computed(() => {
  return Object.keys(slots).filter((name) => name.startsWith('field-'))
})

const forwardedTableSlots = computed(() => {
  const reserved = forwardedFieldSlots.value
  return Object.keys(slots).filter((name) => !reserved.includes(name))
})

const handlePageChange = (pageEvent: { current: number; pageSize: number }) => {
  emit('page-change', pageEvent)
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value)
}

function handleSearch(value: Record<string, unknown>): void {
  emit('search', value)
}

function handleReset(value: Record<string, unknown>): void {
  emit('reset', value)
}

function handleSelectionChange(rowKeys: Key[]): void {
  emit('selection-change', rowKeys)
}
</script>

<style scoped>
.ui-selection-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-selection-modal__search {
  margin-bottom: 4px;
}
</style>
