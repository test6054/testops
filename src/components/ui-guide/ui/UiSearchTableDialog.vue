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
    <div class="ui-search-table-dialog">
      <UiSearchForm
        v-if="props.fields.length"
        v-model="filters"
        :fields="props.fields"
        :search-text="props.searchText"
        :reset-text="props.resetText"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template v-for="name in forwardedFieldSlots" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>

        <slot name="search-extra" />
      </UiSearchForm>

      <div v-if="$slots['content-top']" class="ui-search-table-dialog__content-top">
        <slot name="content-top" />
      </div>

      <UiDataTable
        v-model:current="current"
        v-model:page-size="pageSize"
        :columns="props.columns"
        :data-source="props.dataSource"
        :loading="props.loading"
        :row-key="props.rowKey"
        :total="props.total"
        :enable-selection="props.enableSelection"
        :selection-type="props.selectionType"
        :selected-row-keys="props.selectedRowKeys"
        :show-pagination="props.showPagination"
        :empty-title="props.emptyTitle"
        :empty-description="props.emptyDescription"
        @page-change="handlePageChange"
        @selection-change="handleSelectionChange"
        @change="handleTableChange"
      >
        <template v-for="name in forwardedTableSlots" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </UiDataTable>
    </div>

    <template #footer>
      <div class="ui-search-table-dialog__footer">
        <div class="ui-search-table-dialog__footer-left">
          <slot name="footer-left">
            <span v-if="props.enableSelection" class="ui-search-table-dialog__selected">
              已选 {{ selectedCount }} 项
            </span>
          </slot>
        </div>

        <div class="ui-search-table-dialog__footer-right">
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
        </div>
      </div>
    </template>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { Key } from 'ant-design-vue/es/table/interface'
import type { UiDataTableChangeEvent } from './data-table'
import type { FilterField } from './types'
import { computed, useSlots } from 'vue'
import UiButton from './Button.vue'
import UiDataTable from './UiDataTable.vue'
import UiDialog from './UiDialog.vue'
import UiSearchForm from './UiSearchForm.vue'

defineOptions({
  name: 'UiSearchTableDialog',
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
    enableSelection?: boolean
    selectionType?: 'checkbox' | 'radio'
    confirmLoading?: boolean
    confirmDisabled?: boolean
    okText?: string
    cancelText?: string
    searchText?: string
    resetText?: string
    showPagination?: boolean
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
    enableSelection: true,
    selectionType: 'radio',
    confirmLoading: false,
    confirmDisabled: false,
    okText: '确认选择',
    cancelText: '取消',
    searchText: '搜索',
    resetText: '重置',
    showPagination: true,
    emptyTitle: '暂无可选数据',
    emptyDescription: '当前条件下没有匹配结果。',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'search', value: Record<string, unknown>): void
  (e: 'reset', value: Record<string, unknown>): void
  (e: 'page-change', pageEvent: { current: number, pageSize: number }): void
  (e: 'selection-change', rowKeys: Key[]): void
  (e: 'table-change', changeEvent: UiDataTableChangeEvent): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const slots = useSlots()

const selectedCount = computed(() => props.selectedRowKeys.length)

const forwardedFieldSlots = computed(() =>
  Object.keys(slots).filter((name) => name.startsWith('field-')),
)

const forwardedTableSlots = computed(() => {
  const reserved = [...forwardedFieldSlots.value, 'search-extra', 'content-top', 'footer-left']
  return Object.keys(slots).filter((name) => !reserved.includes(name))
})

const handlePageChange = (pageEvent: { current: number, pageSize: number }) => {
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

function handleTableChange(changeEvent: UiDataTableChangeEvent): void {
  emit('table-change', changeEvent)
}
</script>

<style scoped>
.ui-search-table-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-search-table-dialog__content-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-search-table-dialog__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ui-search-table-dialog__footer-left {
  min-width: 0;
  flex: 1;
}

.ui-search-table-dialog__footer-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.ui-search-table-dialog__selected {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-secondary, #475569);
}
</style>
