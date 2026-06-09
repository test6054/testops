<template>
  <div
    ref="tableRoot"
    class="ui-data-table"
    :class="[rootClass, { 'ui-data-table--flat': props.flat }]"
  >
    <UiCard v-if="!props.flat" class="ui-data-table__card" bordered :hoverable="false">
      <div v-if="hasTopBar" class="ui-data-table__top">
        <div class="ui-data-table__meta">
          <div v-if="props.title" class="ui-data-table__title">{{ props.title }}</div>
          <div v-if="props.description" class="ui-data-table__description">
            {{ props.description }}
          </div>
          <div v-if="$slots['toolbar-left']" class="ui-data-table__toolbar-left">
            <slot name="toolbar-left" />
          </div>
        </div>

        <div v-if="$slots['toolbar-right']" class="ui-data-table__toolbar-right">
          <slot name="toolbar-right" />
        </div>
      </div>

      <div class="ui-data-table__table-wrap">
        <a-table
          class="ui-data-table__table"
          :columns="props.columns"
          :data-source="props.dataSource"
          :loading="props.loading"
          :row-key="props.rowKey"
          :pagination="false"
          :size="props.size"
          :row-selection="rowSelection"
          :get-popup-container="getPopupContainer"
          v-bind="tableAttrs"
          @change="handleTableChange"
        >
          <template #emptyText>
            <slot name="empty">
              <UiEmpty :title="props.emptyTitle" :description="props.emptyDescription" />
            </slot>
          </template>

          <template v-for="name in forwardedSlots" :key="name" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps" />
          </template>
        </a-table>
      </div>

      <div v-if="props.showPagination" class="ui-data-table__pagination">
        <UiPagination
          v-model:current="current"
          v-model:page-size="pageSize"
          :total="props.total"
          :show-size-changer="props.showSizeChanger"
          :show-quick-jumper="props.showQuickJumper"
          :page-size-options="props.pageSizeOptions"
          @change="handlePageChange"
        />
      </div>
    </UiCard>

    <div v-else class="ui-data-table__flat-wrap">
      <div v-if="hasTopBar" class="ui-data-table__top">
        <div class="ui-data-table__meta">
          <div v-if="props.title" class="ui-data-table__title">{{ props.title }}</div>
          <div v-if="props.description" class="ui-data-table__description">
            {{ props.description }}
          </div>
          <div v-if="$slots['toolbar-left']" class="ui-data-table__toolbar-left">
            <slot name="toolbar-left" />
          </div>
        </div>

        <div v-if="$slots['toolbar-right']" class="ui-data-table__toolbar-right">
          <slot name="toolbar-right" />
        </div>
      </div>

      <div class="ui-data-table__table-wrap">
        <a-table
          class="ui-data-table__table"
          :columns="props.columns"
          :data-source="props.dataSource"
          :loading="props.loading"
          :row-key="props.rowKey"
          :pagination="false"
          :size="props.size"
          :row-selection="rowSelection"
          :get-popup-container="getPopupContainer"
          v-bind="tableAttrs"
          @change="handleTableChange"
        >
          <template #emptyText>
            <slot name="empty">
              <UiEmpty :title="props.emptyTitle" :description="props.emptyDescription" />
            </slot>
          </template>

          <template v-for="name in forwardedSlots" :key="name" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps" />
          </template>
        </a-table>
      </div>

      <div v-if="props.showPagination" class="ui-data-table__pagination">
        <UiPagination
          v-model:current="current"
          v-model:page-size="pageSize"
          :total="props.total"
          :show-size-changer="props.showSizeChanger"
          :show-quick-jumper="props.showQuickJumper"
          :page-size-options="props.pageSizeOptions"
          @change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnsType, TableProps } from 'ant-design-vue/es/table'
import type { Key, TableRowSelection } from 'ant-design-vue/es/table/interface'
import type { UiDataTableChangeEvent } from './data-table'
import { computed, ref, useAttrs, useSlots } from 'vue'
import UiCard from './Card.vue'
import UiEmpty from './Empty.vue'
import UiPagination from './Pagination.vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiDataTable',
  inheritAttrs: false,
})

const current = defineModel<number>('current', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const props = withDefaults(
  defineProps<{
    columns: ColumnsType
    dataSource: unknown[]
    loading?: boolean
    rowKey?: string | ((record: unknown) => string | number)
    title?: string
    description?: string
    size?: 'small' | 'middle' | 'large'
    total?: number
    showPagination?: boolean
    showSizeChanger?: boolean
    showQuickJumper?: boolean
    pageSizeOptions?: string[]
    enableSelection?: boolean
    selectionType?: 'checkbox' | 'radio'
    selectedRowKeys?: Key[]
    flat?: boolean
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    loading: false,
    rowKey: 'id',
    title: '',
    description: '',
    size: 'middle',
    total: 0,
    showPagination: true,
    showSizeChanger: true,
    showQuickJumper: false,
    pageSizeOptions: () => ['10', '20', '50', '100'],
    enableSelection: false,
    selectionType: 'checkbox',
    selectedRowKeys: () => [],
    flat: false,
    emptyTitle: '暂无数据',
    emptyDescription: '当前条件下没有可展示内容。',
  },
)

const emit = defineEmits<{
  (e: 'change', changeEvent: UiDataTableChangeEvent): void
  (e: 'page-change', pageEvent: { current: number; pageSize: number }): void
  (e: 'selection-change', rowKeys: Key[]): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const tableRoot = ref<HTMLElement>()

const rootClass = computed(() => attrs.class)

const tableAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const hasTopBar = computed(() => {
  return !!props.title || !!props.description || !!slots['toolbar-left'] || !!slots['toolbar-right']
})

const forwardedSlots = computed(() => {
  const reserved = ['toolbar-left', 'toolbar-right', 'empty']
  return Object.keys(slots).filter((name) => !reserved.includes(name))
})

const rowSelection = computed<TableRowSelection | undefined>(() => {
  if (!props.enableSelection) return undefined

  return {
    type: props.selectionType,
    selectedRowKeys: props.selectedRowKeys,
    onChange: (selectedRowKeys: Key[]) => {
      emit('selection-change', selectedRowKeys)
    },
  }
})

const handleTableChange: NonNullable<TableProps['onChange']> = (
  pagination,
  filters,
  sorter,
  extra,
) => {
  emit('change', { pagination, filters, sorter, extra })
}

const getPopupContainer = (triggerNode?: HTMLElement) => {
  return tableRoot.value ?? resolvePopupContainer(triggerNode)
}

const handlePageChange = (page: number, size: number) => {
  emit('page-change', { current: page, pageSize: size })
}
</script>

<style scoped>
.ui-data-table {
  position: relative;
}

.ui-data-table__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.ui-data-table__meta {
  min-width: 0;
  flex: 1;
}

.ui-data-table__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-data-table__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted, #6b7280);
}

.ui-data-table__toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.ui-data-table__toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.ui-data-table__table-wrap {
  overflow: auto;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
}

.ui-data-table__table :deep(.ant-table-body) {
  overflow: auto !important;
}

.ui-data-table__table :deep(.ant-table) {
  background: transparent;
}

.ui-data-table__table :deep(.ant-table-thead > tr > th) {
  height: 44px !important;
  padding: 0 12px !important;
  background: var(--dp-table-header-bg, #f8fafc);
  color: var(--dp-text-secondary, #475569);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  vertical-align: middle;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
  white-space: nowrap;
}

.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-selection-column) {
  padding-inline: 8px !important;
}

.ui-data-table__table
  :deep(.ant-table-thead > tr > th.ant-table-selection-column .ant-table-selection),
.ui-data-table__table
  :deep(.ant-table-thead > tr > th.ant-table-selection-column .ant-checkbox-wrapper),
.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-selection-column .ant-checkbox) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0 !important;
}

.ui-data-table__table
  :deep(.ant-table-thead > tr > th.ant-table-selection-column .ant-checkbox::after) {
  display: none !important;
  animation: none !important;
}

.ui-data-table__table
  :deep(
    .ant-table-thead
      > tr
      > th.ant-table-selection-column
      .ant-checkbox-input:focus-visible
      + .ant-checkbox-inner
  ) {
  box-shadow: none !important;
}

.ui-data-table__table
  :deep(
    .ant-table-thead > tr > th.ant-table-selection-column .ant-checkbox:hover .ant-checkbox-inner
  ),
.ui-data-table__table
  :deep(
    .ant-table-thead
      > tr
      > th.ant-table-selection-column
      .ant-checkbox-wrapper:hover
      .ant-checkbox-inner
  ) {
  border-color: var(--dp-border, #e5e7eb) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 14px !important;
  color: var(--dp-text-primary, #0f172a);
  font-size: 15px;
  line-height: 1.35;
  vertical-align: middle;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-measure-row) {
  height: 0 !important;
  font-size: 0 !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-measure-row > td) {
  padding: 0 !important;
  height: 0 !important;
  border: 0 !important;
  background: transparent !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-measure-row > td > div) {
  height: 0 !important;
  overflow: hidden !important;
}

.ui-data-table__table :deep(.ant-table-thead > tr > th) {
  background: var(--dp-table-header-bg, #f8fafc) !important;
  color: var(--dp-text-secondary, #475569);
  font-weight: 600;
  border-bottom: 1px solid var(--dp-border-strong, #e2e8f0);
}

.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td) {
  background: var(--dp-gray-50, #f8fafc) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-row-selected > td) {
  background: var(--dp-blue-50, #eff6ff) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td) {
  background: var(--dp-blue-100, #dbeafe) !important;
}

.ui-data-table__table :deep(.ant-table-placeholder:hover > td) {
  background: var(--dp-surface, #fff) !important;
}

.ui-data-table__pagination {
  margin-top: 16px;
}
</style>
