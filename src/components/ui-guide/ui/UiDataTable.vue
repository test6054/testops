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
        ref="tableWrapEl"
        class="ui-data-table__table-wrap"
        :class="{ 'ui-data-table__table-wrap--pinned': hasPinnedColumns }"
        :style="fillWrapStyle"
      >
        <UiSkeletonState
          v-if="showTableSkeleton"
          class="ui-data-table__skeleton"
          variant="table"
          :columns="skeletonColumnCount"
          :rows="skeletonRowCount"
          compact
        />
        <a-table
          v-else
          class="ui-data-table__table"
          :columns="resolvedColumns"
          :data-source="resolvedDataSource"
          :loading="showInlineLoading"
          :row-key="props.rowKey"
          :pagination="false"
          :size="tableSize"
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
import { useBreakpoints } from '@vueuse/core'
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, useAttrs, useSlots, watch } from 'vue'
import UiCard from './Card.vue'
import {
  filterResponsiveDataTableColumns,
  normalizeDataTableColumns,
  resolveDataTableScrollX,
  sliceDataTablePage,
  UI_DATA_TABLE_EMPTY_PRESETS,
  UI_DATA_TABLE_VIEWPORT,
} from './data-table'
import UiEmpty from './Empty.vue'
import UiSkeletonState from './UiSkeletonState.vue'
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
    size?: 'small' | 'middle' | 'large' | 'sm' | 'md' | 'lg'
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
    /** 列表加载失败：展示「加载失败」，禁止伪装成暂无数据 */
    loadError?: boolean
    /** 粘性表头：CSS sticky；默认配合 fillRemaining 撑满视口剩余高度 */
    stickyHeader?: boolean
    /** 表格纵向滚动高度；显式传入时优先生效并关闭视口填满 */
    scrollY?: number | string
    /**
     * 表体撑满剩余视口（去掉历史 70vh/640 天花板）。
     * 默认：flat + stickyHeader 且未传 scrollY 时启用；弹层/嵌套短表显式 false。
     */
    fillRemaining?: boolean
    /** 斑马纹行，适合高密度明细表 */
    zebra?: boolean
    /** 行级可点击指针（配合 customRow 整行跳转） */
    rowClickable?: boolean
    /** 窄视口自动隐藏低优先级列并在操作列启用触控友好布局 */
    responsiveColumns?: boolean
    /** 透传 a-table customRow，用于行级拖拽等交互 */
    customRow?: TableProps['customRow']
    /** 透传 a-table rowClassName */
    rowClassName?: TableProps['rowClassName']
    /** 首屏/空表加载时展示表格骨架，而非空白 spinner */
    skeletonOnEmptyLoading?: boolean
    /** 骨架行数，默认跟随 pageSize 上限 8 */
    skeletonRows?: number
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
    loadError: false,
    stickyHeader: true,
    scrollY: undefined,
    fillRemaining: undefined,
    zebra: true,
    rowClickable: false,
    responsiveColumns: true,
    skeletonOnEmptyLoading: true,
    skeletonRows: undefined,
  },
)

const emit = defineEmits<{
  (e: 'change', changeEvent: UiDataTableChangeEvent): void
  (e: 'page-change', pageEvent: { current: number, pageSize: number }): void
  (e: 'selection-change', rowKeys: Key[]): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const tableRoot = ref<HTMLElement>()
const tableWrapEl = ref<HTMLElement | null>(null)
const fillBodyHeightPx = ref<number | undefined>(undefined)
const instance = getCurrentInstance()
let missingPageChangeWarned = false
let fillMeasureRaf = 0
let fillResizeObserver: ResizeObserver | null = null

const breakpoints = useBreakpoints({
  md: UI_DATA_TABLE_VIEWPORT.md,
  lg: UI_DATA_TABLE_VIEWPORT.lg,
})
const isMdViewport = breakpoints.greaterOrEqual('md')
const isLgViewport = breakpoints.greaterOrEqual('lg')
const isCompactViewport = computed(() => props.responsiveColumns && !isMdViewport.value)

const rootClass = computed(() => attrs.class)

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
  if (props.loadError) {
    return '加载失败'
  }
  if (props.emptyTitle) {
    return props.emptyTitle
  }
  return emptyPreset.value.title
})

const resolvedEmptyDescription = computed(() => {
  // 失败态与默认预设均不展示说明；仅页面显式传入非空 emptyDescription 时展示
  if (props.loadError) {
    return ''
  }
  if (props.emptyDescription) {
    return props.emptyDescription
  }
  return emptyPreset.value.description
})

const emptySize = computed(() => {
  if (props.flat && (props.size === 'small' || props.size === 'sm')) {
    return 'sm'
  }
  return 'md'
})

const tableSize = computed<'small' | 'middle' | 'large'>(() => {
  if (props.size === 'sm' || props.size === 'small') return 'small'
  if (props.size === 'lg' || props.size === 'large') return 'large'
  return 'middle'
})

const shouldFillRemaining = computed(() => {
  if (props.scrollY != null) {
    return false
  }
  if (props.fillRemaining === false) {
    return false
  }
  if (props.fillRemaining === true) {
    return true
  }
  /* 默认：工作台扁平列表（flat + sticky）自动撑满；嵌套卡片表 / 弹层请显式 false */
  return props.stickyHeader && props.flat
})

const fillWrapStyle = computed(() => {
  if (!shouldFillRemaining.value || fillBodyHeightPx.value == null) {
    return undefined
  }
  return {
    height: `${fillBodyHeightPx.value}px`,
    maxHeight: `${fillBodyHeightPx.value}px`,
  }
})

/** 测量表体区域：贴齐最近可滚动父级（或视口）底边，扣除分页条 */
function measureFillBodyHeight(): void {
  if (!shouldFillRemaining.value) {
    fillBodyHeightPx.value = undefined
    return
  }
  const root = tableRoot.value
  const wrap = tableWrapEl.value
  if (!root || !wrap) {
    return
  }
  const pagination = root.querySelector<HTMLElement>('.ui-data-table__pagination')
  const paginationH = pagination?.getBoundingClientRect().height ?? 0
  const wrapTop = wrap.getBoundingClientRect().top
  let bottomBound = window.innerHeight
  let parent: HTMLElement | null = wrap.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    const overflowY = style.overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
      if (parent.clientHeight > 0) {
        bottomBound = parent.getBoundingClientRect().bottom
        break
      }
    }
    parent = parent.parentElement
  }
  const bottomGap = 12
  const next = Math.floor(bottomBound - wrapTop - paginationH - bottomGap)
  const clamped = Math.max(240, next)
  if (fillBodyHeightPx.value !== clamped) {
    fillBodyHeightPx.value = clamped
  }
}

function scheduleFillMeasure(): void {
  if (!shouldFillRemaining.value) {
    fillBodyHeightPx.value = undefined
    return
  }
  if (fillMeasureRaf) {
    cancelAnimationFrame(fillMeasureRaf)
  }
  fillMeasureRaf = requestAnimationFrame(() => {
    fillMeasureRaf = 0
    measureFillBodyHeight()
  })
}

const resolvedScroll = computed<TableProps['scroll']>(() => {
  const attrScroll = attrs.scroll as TableProps['scroll'] | undefined
  const merged: NonNullable<TableProps['scroll']> = attrScroll ? { ...attrScroll } : {}
  if (props.scrollY != null) {
    merged.y = props.scrollY
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

const hasScrollY = computed(() => resolvedScroll.value?.y != null)

const rootClasses = computed(() => {
  return [
    rootClass.value,
    { 'ui-data-table--flat': props.flat },
    { 'ui-data-table--zebra': props.zebra },
    { 'ui-data-table--row-clickable': props.rowClickable || !!props.customRow },
    { 'ui-data-table--sticky-header': props.stickyHeader },
    { 'ui-data-table--fill-remaining': shouldFillRemaining.value },
    { 'ui-data-table--compact-viewport': isCompactViewport.value },
    { 'ui-data-table--pinned-columns': hasPinnedColumns.value },
    { 'ui-data-table--has-scroll-y': hasScrollY.value },
  ]
})

const effectiveShowPagination = computed(() => {
  if (!props.showPagination || props.paginationMode === 'none') {
    return false
  }
  if (
    props.paginationMode === 'server'
    && effectiveTotal.value > pageSize.value
    && !hasPageChangeListener.value
  ) {
    return false
  }
  return props.showPagination
})

const showTableSkeleton = computed(() => {
  if (!props.skeletonOnEmptyLoading || !props.loading || props.loadError) {
    return false
  }
  return resolvedDataSource.value.length === 0
})

/** 有数据时的二次加载保留表格 + 行内 loading，避免闪回骨架 */
const showInlineLoading = computed(() => props.loading && resolvedDataSource.value.length > 0)

const skeletonColumnCount = computed(() => {
  const count = resolvedColumns.value.length
  if (count <= 0) return 4
  return Math.min(count, 8)
})

const skeletonRowCount = computed(() => {
  if (typeof props.skeletonRows === 'number' && props.skeletonRows > 0) {
    return Math.min(props.skeletonRows, 12)
  }
  return Math.min(Math.max(pageSize.value, 4), 8)
})

const hasTopBar = computed(() => {
  return (
    !!props.title
    || !!props.description
    || !!props.sortedInfo
    || !!slots['toolbar-left']
    || !!slots['toolbar-right']
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
      '[UiDataTable] paginationMode="server" 且 total 大于 pageSize，但未监听 @page-change；分页栏已自动隐藏。'
      + '请绑定 @page-change 走服务端分页，或改用 paginationMode="client" / "none"。',
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

watch(
  () => [
    shouldFillRemaining.value,
    effectiveShowPagination.value,
    props.loading,
    showTableSkeleton.value,
    resolvedDataSource.value.length,
    hasTopBar.value,
  ],
  () => {
    void nextTick(() => scheduleFillMeasure())
  },
)

onMounted(() => {
  scheduleFillMeasure()
  fillResizeObserver = new ResizeObserver(() => scheduleFillMeasure())
  if (tableRoot.value) {
    fillResizeObserver.observe(tableRoot.value)
  }
  const surfaceParent = tableRoot.value?.parentElement
  if (surfaceParent) {
    fillResizeObserver.observe(surfaceParent)
  }
  window.addEventListener('resize', scheduleFillMeasure)
})

onUnmounted(() => {
  if (fillMeasureRaf) {
    cancelAnimationFrame(fillMeasureRaf)
    fillMeasureRaf = 0
  }
  fillResizeObserver?.disconnect()
  fillResizeObserver = null
  window.removeEventListener('resize', scheduleFillMeasure)
})
</script>

<style scoped>
.ui-data-table {
  position: relative;
}

.ui-data-table--fill-remaining {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.ui-data-table--fill-remaining :deep(.ui-data-table__card),
.ui-data-table--fill-remaining .ui-data-table__flat-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.ui-data-table__skeleton {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: var(--dp-space-component) 0;
}

.ui-data-table--flat .ui-data-table__skeleton {
  padding: var(--dp-space-component-tight) 0;
}

.ui-data-table__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}

.ui-data-table__meta {
  min-width: 0;
  flex: 1;
}

.ui-data-table__title {
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
  color: var(--dp-text-primary);
}

.ui-data-table__description {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-muted);
}

.ui-data-table__sorted-info {
  margin-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.ui-data-table__toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
}

.ui-data-table__toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  flex-shrink: 0;
}

.ui-data-table__table-wrap {
  min-width: 0;
  width: 100%;
  border: 1px solid var(--dp-table-border);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-xs);
  background: var(--dp-surface);
}

.ui-data-table__table-wrap--pinned {
  min-width: 0;
}

.ui-data-table--flat .ui-data-table__table-wrap {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.ui-data-table--flat .ui-data-table__table-wrap:not(.ui-data-table__table-wrap--pinned) {
  overflow-x: auto;
}

/* 有 fixed 列时横向滚动交给 Ant Table 内部 .ant-table-content，外层不得再设 overflow */
.ui-data-table--pinned-columns .ui-data-table__table-wrap {
  overflow: visible;
}

.ui-data-table--sticky-header:not(.ui-data-table--pinned-columns) .ui-data-table__table-wrap {
  overflow: auto;
}

.ui-data-table--fill-remaining .ui-data-table__table-wrap {
  flex: 1 1 auto;
  min-height: 240px;
  overflow: auto;
}

.ui-data-table--sticky-header:not(.ui-data-table--pinned-columns)
  .ui-data-table__table
  :deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 4;
}

.ui-data-table--sticky-header:not(.ui-data-table--pinned-columns)
  .ui-data-table__table
  :deep(.ant-table-thead > tr > th.ant-table-cell-fix-left),
.ui-data-table--sticky-header:not(.ui-data-table--pinned-columns)
  .ui-data-table__table
  :deep(.ant-table-thead > tr > th.ant-table-cell-fix-right) {
  z-index: 5;
}

.ui-data-table--flat .ui-data-table__flat-wrap {
  background: transparent;
}

.ui-data-table--flat .ui-data-table__table-wrap :deep(.ant-table-placeholder .ui-empty--sm) {
  padding-top: var(--dp-space-component);
  padding-bottom: var(--dp-space-component);
}

.ui-data-table--has-scroll-y .ui-data-table__table :deep(.ant-table-body) {
  overflow: auto !important;
}

.ui-data-table--flat .ui-data-table__top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component) 0;
  justify-content: space-between;
  margin-bottom: 0;
}

.ui-data-table--flat .ui-data-table__meta {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.ui-data-table--flat .ui-data-table__toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  margin-top: 0;
  gap: var(--dp-space-component-tight);
}

.ui-data-table--flat .ui-data-table__toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  flex-shrink: 0;
}

.ui-data-table__table :deep(.ant-table) {
  background: transparent;
}

.ui-data-table__table :deep(.ant-table-thead > tr > th) {
  background: var(--dp-table-header-bg) !important;
  border-bottom: 1px solid var(--dp-table-border);
  font-weight: 600;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm, 13px);
  letter-spacing: 0.01em;
}

.ui-data-table__table
  :deep(.ant-table-thead > tr > th.ui-data-table__col--numeric .ant-table-column-sorters) {
  justify-content: flex-end;
}

.ui-data-table__table :deep(.ant-table-column-sorter) {
  color: var(--dp-text-muted);
}

.ui-data-table__table :deep(.ant-table-column-sorter-up.active),
.ui-data-table__table :deep(.ant-table-column-sorter-down.active) {
  color: var(--dp-color-primary);
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
  border-color: var(--dp-table-border) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--dp-table-border);
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td .ui-table-actions) {
  max-width: 100%;
}

.ui-data-table__table :deep(.ant-table-tbody > tr > td.ui-data-table__col--numeric) {
  font-variant-numeric: tabular-nums;
}

.ui-data-table__table :deep(.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-cell-fix-right) {
  z-index: 2;
  background: var(--dp-surface);
}

.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-thead > tr > th.ant-table-cell-fix-right) {
  z-index: 3;
  background: var(--dp-table-header-bg) !important;
}

.ui-data-table__table :deep(.ant-table-cell-fix-left-last::after),
.ui-data-table__table :deep(.ant-table-cell-fix-right-first::after) {
  position: absolute;
  top: 0;
  bottom: -1px;
  width: 12px;
  pointer-events: none;
  content: '';
  transition: box-shadow var(--dp-duration-normal) var(--dp-ease-default);
}

.ui-data-table__table :deep(.ant-table-cell-fix-left-last::after) {
  right: 0;
  transform: translateX(100%);
  box-shadow: inset 10px 0 8px -8px color-mix(in srgb, var(--dp-text-primary) 8%, transparent);
}

.ui-data-table__table :deep(.ant-table-cell-fix-right-first::after) {
  left: 0;
  transform: translateX(-100%);
  box-shadow: inset -10px 0 8px -8px color-mix(in srgb, var(--dp-text-primary) 8%, transparent);
}

.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-left),
.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-right) {
  background: var(--dp-table-row-hover-bg) !important;
}

.ui-data-table__table
  :deep(.ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-fix-left),
.ui-data-table__table
  :deep(.ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell-fix-right) {
  background: var(--dp-gray-50) !important;
}

.ui-data-table--zebra
  .ui-data-table__table
  :deep(.ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder) > td) {
  background: var(--dp-gray-50);
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

.ui-data-table--zebra
  .ui-data-table__table
  :deep(
    .ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder) > td.ant-table-cell-fix-left
  ),
.ui-data-table--zebra
  .ui-data-table__table
  :deep(
    .ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder) > td.ant-table-cell-fix-right
  ) {
  background: var(--dp-gray-50);
}

.ui-data-table__table :deep(.ant-table-tbody > tr:hover > td) {
  background: var(--dp-table-row-hover-bg) !important;
  transition: background var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-data-table--zebra
  .ui-data-table__table
  :deep(.ant-table-tbody > tr:nth-child(even):not(.ant-table-placeholder):hover > td) {
  background: var(--dp-table-row-hover-bg) !important;
}

.ui-data-table--zebra
  .ui-data-table__table
  :deep(
    .ant-table-tbody
      > tr:nth-child(even):not(.ant-table-placeholder):hover
      > td.ant-table-cell-fix-left
  ),
.ui-data-table--zebra
  .ui-data-table__table
  :deep(
    .ant-table-tbody
      > tr:nth-child(even):not(.ant-table-placeholder):hover
      > td.ant-table-cell-fix-right
  ) {
  background: var(--dp-gray-100) !important;
}

.ui-data-table--row-clickable
  .ui-data-table__table
  :deep(.ant-table-tbody > tr:not(.ant-table-placeholder):not(.ant-table-measure-row)) {
  cursor: pointer;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-row-selected > td) {
  background: var(--dp-gray-50) !important;
}

.ui-data-table__table :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td) {
  background: var(--dp-gray-100) !important;
}

.ui-data-table__table :deep(.ant-table-placeholder:hover > td) {
  background: var(--dp-surface) !important;
}

.ui-data-table__pagination {
  margin-top: var(--dp-space-component);
}
</style>
