<template>
  <div ref="tableRoot" class="ui-data-table" :class="rootClasses">
    <component
      :is="props.flat ? 'div' : UiCard"
      :class="props.flat ? 'ui-data-table__flat-wrap' : 'ui-data-table__card'"
      :bordered="props.flat ? undefined : true"
      :hoverable="props.flat ? undefined : false"
    >
      <div v-if="hasTopBar" class="ui-data-table__top">
        <div class="ui-data-table__meta">
          <div v-if="props.title" class="ui-data-table__title">{{ props.title }}</div>
          <div v-if="props.description" class="ui-data-table__description">
            {{ props.description }}
          </div>
          <div v-if="props.sortedInfo" class="ui-data-table__sorted-info">
            {{ props.sortedInfo }}
          </div>
          <div v-if="$slots['toolbar-left']" class="ui-data-table__toolbar-left">
            <slot name="toolbar-left" />
          </div>
        </div>

        <div v-if="$slots['toolbar-right']" class="ui-data-table__toolbar-right">
          <slot name="toolbar-right" />
        </div>
      </div>

      <div
        class="ui-data-table__table-wrap"
        :class="{ 'ui-data-table__table-wrap--pinned': hasPinnedColumns }"
      >
        <a-table
          class="ui-data-table__table"
          :columns="resolvedColumns"
          :data-source="resolvedDataSource"
          :loading="props.loading"
          :row-key="props.rowKey"
          :pagination="false"
          :size="props.size"
          :row-selection="rowSelection"
          :scroll="resolvedScroll"
          :table-layout="tableLayout"
          :get-popup-container="getPopupContainer"
          :custom-row="props.customRow"
          :row-class-name="props.rowClassName"
          v-bind="passthroughTableAttrs"
          @change="handleTableChange"
        >
          <template #emptyText>
            <slot name="empty">
              <UiEmpty
                :size="emptySize"
                :title="resolvedEmptyTitle"
                :description="resolvedEmptyDescription"
              >
                <template v-if="$slots['empty-action']" #action>
                  <slot name="empty-action" />
                </template>
              </UiEmpty>
            </slot>
          </template>

          <template v-for="name in forwardedSlots" :key="name" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps" />
          </template>
        </a-table>
      </div>

      <div v-if="effectiveShowPagination" class="ui-data-table__pagination">
        <UiPagination
          v-model:current="current"
          v-model:page-size="pageSize"
          :total="effectiveTotal"
          :show-size-changer="props.showSizeChanger"
          :show-quick-jumper="props.showQuickJumper"
          :page-size-options="props.pageSizeOptions"
          @change="handlePageChange"
        />
      </div>
    </component>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnsType, TableProps } from 'ant-design-vue/es/table'
import type { Key, TableRowSelection } from 'ant-design-vue/es/table/interface'
import type {
  UiDataTableChangeEvent,
  UiDataTableEmptyKind,
  UiDataTablePaginationMode,
} from './data-table'
import {
  filterResponsiveDataTableColumns,
  normalizeDataTableColumns,
  resolveDataTableScrollX,
  sliceDataTablePage,
  UI_DATA_TABLE_EMPTY_PRESETS,
  UI_DATA_TABLE_VIEWPORT,
} from './data-table'
import { useBreakpoints } from '@vueuse/core'
import { computed, getCurrentInstance, ref, useAttrs, useSlots, watch } from 'vue'
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
    /** 当前排序说明，展示在表格上方，如「按正确率降序」 */
    sortedInfo?: string
    size?: 'small' | 'middle' | 'large'
    total?: number
    showPagination?: boolean
    /** server：后端分页，需监听 @page-change；client：组件内切片；none：无分页栏 */
    paginationMode?: UiDataTablePaginationMode
    showSizeChanger?: boolean
    showQuickJumper?: boolean
    pageSizeOptions?: string[]
    enableSelection?: boolean
    selectionType?: 'checkbox' | 'radio'
    selectedRowKeys?: Key[]
    flat?: boolean
    emptyKind?: UiDataTableEmptyKind
    emptyTitle?: string
    emptyDescription?: string
    /** 启用粘性表头，需配合 scrollY */
    stickyHeader?: boolean
    /** 表格纵向滚动高度，stickyHeader 默认 480 */
    scrollY?: number | string
    /** 斑马纹行，适合高密度明细表 */
    zebra?: boolean
    /** 窄视口自动隐藏低优先级列并在操作列启用触控友好布局 */
    responsiveColumns?: boolean
    /** 透传 a-table customRow，用于行级拖拽等交互 */
    customRow?: TableProps['customRow']
    /** 透传 a-table rowClassName */
    rowClassName?: TableProps['rowClassName']
  }>(),
  {
    loading: false,
    rowKey: 'id',
    title: '',
    description: '',
    sortedInfo: '',
    size: 'middle',
    total: 0,
    showPagination: true,
    paginationMode: 'server',
    showSizeChanger: true,
    showQuickJumper: false,
    pageSizeOptions: () => ['10', '20', '50', '100'],
    enableSelection: false,
    selectionType: 'checkbox',
    selectedRowKeys: () => [],
    flat: false,
    emptyKind: 'default',
    emptyTitle: '',
    emptyDescription: '',
    stickyHeader: false,
    scrollY: undefined,
    zebra: false,
    responsiveColumns: true,
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
const instance = getCurrentInstance()
let missingPageChangeWarned = false

const breakpoints = useBreakpoints({
  md: UI_DATA_TABLE_VIEWPORT.md,
  lg: UI_DATA_TABLE_VIEWPORT.lg,
})
const isMdViewport = breakpoints.greaterOrEqual('md')
const isLgViewport = breakpoints.greaterOrEqual('lg')
const isCompactViewport = computed(() => props.responsiveColumns && !isMdViewport.value)

const rootClass = computed(() => attrs.class)

const rootClasses = computed(() => {
  return [
    rootClass.value,
    { 'ui-data-table--flat': props.flat },
    { 'ui-data-table--zebra': props.zebra },
    { 'ui-data-table--compact-viewport': isCompactViewport.value },
    { 'ui-data-table--pinned-columns': hasPinnedColumns.value },
  ]
})

const passthroughTableAttrs = computed(() => {
  const {
    class: _class,
    style: _style,
    scroll: _scroll,
    customRow: _customRow,
    rowClassName: _rowClassName,
    'custom-row': _customRowKebab,
    'row-class-name': _rowClassNameKebab,
    ...rest
  } = attrs
  return rest
})

const hasPageChangeListener = computed(() => {
  const vnodeProps = instance?.vnode.props
  if (!vnodeProps) {
    return false
  }
  return 'onPageChange' in vnodeProps || 'onPage-change' in vnodeProps
})

const effectiveTotal = computed(() => {
  if (props.paginationMode === 'client') {
    return props.dataSource.length
  }
  return props.total ?? 0
})

const resolvedDataSource = computed(() => {
  if (props.paginationMode !== 'client') {
    return props.dataSource
  }
  return sliceDataTablePage(props.dataSource, current.value, pageSize.value)
})

const resolvedColumns = computed(() => {
  const viewportColumns = props.responsiveColumns
    ? filterResponsiveDataTableColumns(props.columns, {
        md: isMdViewport.value,
        lg: isLgViewport.value,
      })
    : props.columns
  return normalizeDataTableColumns(viewportColumns)
})

const emptyPreset = computed(() => UI_DATA_TABLE_EMPTY_PRESETS[props.emptyKind])

const resolvedEmptyTitle = computed(() => {
  if (props.emptyTitle) {
    return props.emptyTitle
  }
  return emptyPreset.value.title
})

const resolvedEmptyDescription = computed(() => {
  if (props.emptyDescription) {
    return props.emptyDescription
  }
  return emptyPreset.value.description
})

const emptySize = computed(() => {
  if (props.flat && props.size === 'small') {
    return 'sm'
  }
  return 'md'
})

const resolvedScroll = computed<TableProps['scroll']>(() => {
  const attrScroll = attrs.scroll as TableProps['scroll'] | undefined
  const merged: NonNullable<TableProps['scroll']> = attrScroll ? { ...attrScroll } : {}
  if (props.scrollY != null) {
    merged.y = props.scrollY
  }
  if (props.stickyHeader && merged.y == null) {
    merged.y = 480
  }
  const autoScrollX = resolveDataTableScrollX(resolvedColumns.value)
  if (merged.x == null && autoScrollX != null) {
    merged.x = autoScrollX
  }
  return Object.keys(merged).length > 0 ? merged : undefined
})

const tableLayout = computed<TableProps['tableLayout']>(() => {
  return resolvedScroll.value?.x != null ? 'fixed' : undefined
})

const hasPinnedColumns = computed(() => resolvedScroll.value?.x != null)

const effectiveShowPagination = computed(() => {
  if (!props.showPagination || props.paginationMode === 'none') {
    return false
  }
  if (
    props.paginationMode === 'server' &&
    effectiveTotal.value > pageSize.value &&
    !hasPageChangeListener.value
  ) {
    return false
  }
  return props.showPagination
})

const hasTopBar = computed(() => {
  return (
    !!props.title ||
    !!props.description ||
    !!props.sortedInfo ||
    !!slots['toolbar-left'] ||
    !!slots['toolbar-right']
  )
})

const forwardedSlots = computed(() => {
  const reserved = ['toolbar-left', 'toolbar-right', 'empty', 'empty-action']
  return Object.keys(slots).filter((name) => !reserved.includes(name))
})

const rowSelection = computed<TableRowSelection | undefined>(() => {
  if (!props.enableSelection) {
    return undefined
  }

  return {
    type: props.selectionType,
    selectedRowKeys: props.selectedRowKeys,
    onChange: (selectedRowKeys: Key[]) => {
      emit('selection-change', selectedRowKeys)
    },
  }
})

watch(
  () => [
    props.paginationMode,
    props.showPagination,
    effectiveTotal.value,
    pageSize.value,
    hasPageChangeListener.value,
  ],
  () => {
    if (!import.meta.env.DEV) {
      return
    }
    if (missingPageChangeWarned) {
      return
    }
    if (props.paginationMode !== 'server' || !props.showPagination) {
      return
    }
    if (effectiveTotal.value <= pageSize.value) {
      return
    }
    if (hasPageChangeListener.value) {
      return
    }
    missingPageChangeWarned = true
    console.warn(
      '[UiDataTable] paginationMode="server" 且 total 大于 pageSize，但未监听 @page-change；分页栏已自动隐藏。' +
        '请绑定 @page-change 走服务端分页，或改用 paginationMode="client" / "none"。',
    )
  },
  { immediate: true },
)

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
  font-size: var(--dp-font-size-lg, 16px);
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-primary, #0f172a);
}

.ui-data-table__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted, #6b7280);
}

.ui-data-table__sorted-info {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #475569);
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

.ui-data-table__table-wrap--pinned {
  overflow: hidden;
}

.ui-data-table--pinned-columns .ui-data-table__table :deep(.ant-table-content) {
  overflow: auto hidden;
}

.ui-data-table--flat .ui-data-table__table-wrap :deep(.ant-table-placeholder .ui-empty--sm) {
  padding-top: 20px;
  padding-bottom: 20px;
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
  background: var(--dp-table-header-bg, #f8fafc) !important;
  color: var(--dp-text-secondary, #475569);
  font-size: var(--dp-type-table-head-size, 14px);
  font-weight: var(--dp-type-table-head-weight, 600);
  line-height: var(--dp-type-table-head-line-height, 20px);
  vertical-align: middle;
  border-bottom: 1px solid var(--dp-border-strong, #e2e8f0);
  white-space: nowrap;
}

.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-column-sort) {
  background: var(--dp-blue-50, #eff6ff) !important;
}

.ui-data-table__table :deep(.ant-table-column-sorters) {
  justify-content: flex-start;
  gap: 4px;
}

.ui-data-table__table :deep(.ant-table-column-sorter) {
  color: var(--dp-text-muted, #94a3b8);
}

.ui-data-table__table :deep(.ant-table-column-sorter-up.active),
.ui-data-table__table :deep(.ant-table-column-sorter-down.active) {
  color: var(--ant-color-primary, #1677ff);
}

.ui-data-table__table
  :deep(.ant-table-thead > tr > th.ui-data-table__col--numeric .ant-table-column-sorters) {
  justify-content: flex-end;
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
  font-size: var(--dp-type-table-body-size, 14px);
  line-height: var(--dp-type-table-body-line-height, 20px);
  font-weight: var(--dp-type-table-body-weight, 400);
  vertical-align: middle;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
  overflow-wrap: anywhere;
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td .ui-table-actions) {
  max-width: 100%;
}

.ui-data-table__table :deep(.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-cell-fix-right) {
  z-index: 2;
  background: var(--dp-surface, #fff);
}

.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-cell-fix-right) {
  z-index: 3;
  background: var(--dp-table-header-bg, #f8fafc) !important;
}

.ui-data-table__table :deep(.ant-table-cell-fix-left-last::after),
.ui-data-table__table :deep(.ant-table-cell-fix-right-first::after) {
  position: absolute;
  top: 0;
  bottom: -1px;
  width: 12px;
  pointer-events: none;
  content: '';
  transition: box-shadow 0.2s ease;
}

.ui-data-table__table :deep(.ant-table-cell-fix-left-last::after) {
  right: 0;
  transform: translateX(100%);
  box-shadow: inset 10px 0 8px -8px rgb(15 23 42 / 8%);
}

.ui-data-table__table :deep(.ant-table-cell-fix-right-first::after) {
  left: 0;
  transform: translateX(-100%);
  box-shadow: inset -10px 0 8px -8px rgb(15 23 42 / 8%);
}

.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-right) {
  background: var(--dp-gray-50, #f8fafc) !important;
}

.ui-data-table__table
  :deep(.ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-fix-left),
.ui-data-table__table
  :deep(.ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-fix-right) {
  background: var(--dp-blue-50, #eff6ff) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td.ui-data-table__col--numeric) {
  font-variant-numeric: tabular-nums;
}

.ui-data-table--zebra
  .ui-data-table__table
  :deep(.ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder) > td) {
  background: var(--dp-gray-50, #f8fafc);
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

.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td) {
  background: var(--dp-gray-50, #f8fafc) !important;
}

.ui-data-table--zebra
  .ui-data-table__table
  :deep(.ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder):hover > td) {
  background: var(--dp-blue-50, #eff6ff) !important;
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
