<template>
  <div ref="tableRoot" class="ui-table-form">
    <UiCard class="ui-table-form__card" bordered :hoverable="false">
      <div v-if="hasTopBar" class="ui-table-form__top">
        <div class="ui-table-form__meta">
          <div v-if="props.title" class="ui-table-form__title">{{ props.title }}</div>
          <div v-if="props.description" class="ui-table-form__description">
            {{ props.description }}
          </div>
        </div>
        <div v-if="$slots['toolbar-right']" class="ui-table-form__toolbar-right">
          <slot name="toolbar-right" />
        </div>
      </div>

      <div class="ui-table-form__table-wrap">
        <a-table
          class="ui-table-form__table"
          :columns="tableColumns"
          :data-source="props.dataSource"
          :loading="props.loading"
          :row-key="props.rowKey"
          :pagination="false"
          size="middle"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="isSelectColumn(column)">
              <a-select
                :value="getSelectValue(record, column)"
                class="ui-table-form__select"
                :options="getColumnOptions(column)"
                :placeholder="getColumnPlaceholder(column)"
                :allow-clear="props.allowClear"
                :get-popup-container="getPopupContainer"
                popup-class-name="ui-select-dropdown"
                @change="handleSelectChange(record, column, index)"
              />
            </template>
            <template v-else>
              <slot :name="getBodySlotName(column)" :record="record" :index="index">
                {{ getCellValue(record, column) }}
              </slot>
            </template>
          </template>
        </a-table>
      </div>
    </UiCard>
  </div>
</template>

<script lang="ts" setup>
import type { LabeledValue, SelectValue } from 'ant-design-vue/es/select'
import type { UiSelectOption } from './types'
import { computed, ref, useSlots } from 'vue'
import UiCard from './Card.vue'

export interface TableFormColumn {
  key: string
  title: string
  dataIndex: string
  width?: number | string
  type?: 'select' | 'text'
  options?: UiSelectOption[]
  placeholder?: string
}

interface TableFormRow {
  id?: string
  [key: string]: unknown
}

interface TableFormCellColumn {
  key?: string | number
  dataIndex?: string | number | readonly (string | number)[]
  tableFormColumn?: TableFormColumn
}

defineOptions({
  name: 'UiTableForm',
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    columns: TableFormColumn[]
    dataSource: TableFormRow[]
    loading?: boolean
    rowKey?: string
    allowClear?: boolean
  }>(),
  {
    title: '',
    description: '',
    loading: false,
    rowKey: 'id',
    allowClear: true,
  },
)

const emit = defineEmits<{
  (
    e: 'change',
    changeEvent: { record: TableFormRow, field: string, value: unknown, index: number },
  ): void
}>()

const slots = useSlots()
const tableRoot = ref<HTMLElement>()

const hasTopBar = computed(() => {
  return !!props.title || !!props.description || !!slots['toolbar-right']
})

const tableColumns = computed(() => {
  return props.columns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex,
    width: col.width,
    tableFormColumn: col,
  }))
})

const normalizeKey = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  return ''
}

const normalizeDataIndex = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  if (Array.isArray(value) && value.length === 1) {
    const [firstKey] = value
    if (typeof firstKey === 'string' || typeof firstKey === 'number') return String(firstKey)
  }

  return ''
}

const resolveColumn = (column: TableFormCellColumn): TableFormColumn | undefined => {
  if (column.tableFormColumn) return column.tableFormColumn

  const columnKey = normalizeKey(column.key)
  if (!columnKey) return undefined

  return props.columns.find((item) => item.key === columnKey)
}

const resolveField = (column: TableFormCellColumn): string => {
  const dataIndex = normalizeDataIndex(column.dataIndex)
  if (dataIndex) return dataIndex

  return resolveColumn(column)?.dataIndex ?? ''
}

const isSelectColumn = (column: TableFormCellColumn): boolean => {
  return resolveColumn(column)?.type === 'select'
}

const getCellValue = (record: TableFormRow, column: TableFormCellColumn): unknown => {
  const field = resolveField(column)
  return field ? record[field] : undefined
}

const isSelectPrimitive = (value: unknown): value is string | number => {
  return typeof value === 'string' || typeof value === 'number'
}

const isLabeledSelectValue = (value: unknown): value is LabeledValue => {
  if (!value || typeof value !== 'object' || !('value' in value)) return false

  return isSelectPrimitive(value.value)
}

const isLabeledSelectValueList = (value: unknown): value is LabeledValue[] => {
  return Array.isArray(value) && value.every(isLabeledSelectValue)
}

const getSelectValue = (record: TableFormRow, column: TableFormCellColumn): SelectValue => {
  const value = getCellValue(record, column)
  if (value === undefined) return undefined

  if (isSelectPrimitive(value)) return value

  if (Array.isArray(value) && value.every(isSelectPrimitive)) return value

  if (isLabeledSelectValue(value)) return value

  if (isLabeledSelectValueList(value)) return value

  return undefined
}

const getColumnOptions = (column: TableFormCellColumn): UiSelectOption[] => {
  return resolveColumn(column)?.options ?? []
}

const getColumnPlaceholder = (column: TableFormCellColumn): string => {
  return resolveColumn(column)?.placeholder ?? '请选择'
}

const getBodySlotName = (column: TableFormCellColumn): string => {
  const columnKey = resolveColumn(column)?.key
  return columnKey ? `body-${columnKey}` : ''
}

const getPopupContainer = () => {
  return tableRoot.value ?? document.body
}

const handleCellChange = (
  record: TableFormRow,
  column: TableFormCellColumn,
  value: unknown,
  index: number,
): void => {
  const field = resolveField(column)
  if (!field) return

  emit('change', { record, field, value, index })
}

const handleSelectChange
  = (record: TableFormRow, column: TableFormCellColumn, index: number) =>
  (value: SelectValue): void => {
    handleCellChange(record, column, value, index)
  }
</script>

<style scoped>
.ui-table-form {
  position: relative;
}

.ui-table-form__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.ui-table-form__meta {
  min-width: 0;
  flex: 1;
}

.ui-table-form__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.ui-table-form__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted);
}

.ui-table-form__toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.ui-table-form__table-wrap {
  overflow: hidden;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
}

.ui-table-form__table :deep(.ant-table) {
  background: transparent;
}

.ui-table-form__table :deep(.ant-table-thead > tr > th) {
  padding: 12px 14px !important;
  background: var(--dp-table-header-bg);
  color: var(--dp-text-secondary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  border-bottom: 1px solid var(--dp-border);
}

.ui-table-form__table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 14px !important;
  color: var(--dp-text-primary);
  font-size: 15px;
  line-height: 1.35;
  vertical-align: middle;
  border-bottom: 1px solid var(--dp-border);
}

.ui-table-form__table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(239, 246, 255, 0.68) !important;
}

.ui-table-form__select {
  width: 100%;
  min-width: 120px;
}

.ui-table-form__select :deep(.ant-select-selector) {
  border-radius: var(--dp-radius-control) !important;
  border: 1px solid var(--dp-border) !important;
  background-color: var(--dp-gray-100) !important;
  box-shadow: none !important;
  min-height: 36px !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease !important;
}

.ui-table-form__select:hover :deep(.ant-select-selector) {
  border-color: var(--dp-blue-600) !important;
}

.ui-table-form__select :deep(.ant-select-focused .ant-select-selector),
.ui-table-form__select :deep(.ant-select-open .ant-select-selector) {
  border-color: var(--dp-blue-600) !important;
  box-shadow: 0 0 0 3px var(--dp-focus-ring) !important;
}

.ui-table-form__select :deep(.ant-select-selection-placeholder) {
  color: var(--dp-text-muted) !important;
}

.ui-table-form__select :deep(.ant-select-selection-item) {
  color: var(--dp-text-primary) !important;
}

.ui-table-form__select :deep(.ant-select-arrow),
.ui-table-form__select :deep(.ant-select-clear) {
  color: var(--dp-text-secondary) !important;
}
</style>
