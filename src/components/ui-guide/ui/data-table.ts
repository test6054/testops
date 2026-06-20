/**
 * UiDataTable 列与分页契约工具。
 *
 * ## paginationMode
 * - `server`（默认）：`total` 由后端返回，必须监听 `@page-change` 拉取对应页；`dataSource` 仅为当前页。
 * - `client`：传入全量 `dataSource`，组件按 `v-model:current` / `v-model:page-size` 内部切片；`total` 忽略。
 * - `none`：不展示分页栏。
 *
 * 误用：`server` + `total > pageSize` 且未绑 `@page-change` 时，dev 环境 `console.warn`，分页栏自动隐藏。
 *
 * ## emptyKind
 * - `default`：通用「暂无数据」
 * - `first-run`：首次无记录，可配 `#empty-action`
 * - `no-result`：筛选无结果
 * 也可传 `emptyTitle` / `emptyDescription` 或完全自定义 `#empty` slot。
 *
 * ## 数值列
 * 使用 `buildNumericColumn()` 或列 `align: 'right'`，经 `normalizeDataTableColumns` 统一表头/单元格右对齐。
 */
import type { ColumnType, ColumnsType } from 'ant-design-vue/es/table'
import type { TableProps } from 'ant-design-vue/es/table'

/** 分页模式：server 走后端分页；client 组件内切片；none 不展示分页栏 */
export type UiDataTablePaginationMode = 'server' | 'client' | 'none'

/** 空态语义：default 通用；first-run 首次无数据；no-result 筛选无结果 */
export type UiDataTableEmptyKind = 'default' | 'first-run' | 'no-result'

export interface UiDataTableColumnMeta {
  /** 数值列，自动右对齐 */
  numeric?: boolean
}

export type UiDataTableOnChange<RecordType = Record<string, unknown>> = NonNullable<
  TableProps<RecordType>['onChange']
>

export interface UiDataTableChangeEvent<RecordType = Record<string, unknown>> {
  pagination: Parameters<UiDataTableOnChange<RecordType>>[0]
  filters: Parameters<UiDataTableOnChange<RecordType>>[1]
  sorter: Parameters<UiDataTableOnChange<RecordType>>[2]
  extra: Parameters<UiDataTableOnChange<RecordType>>[3]
}

export interface UiDataTableEmptyPreset {
  title: string
  description: string
}

/** UiDataTable 内置空态文案预设 */
export const UI_DATA_TABLE_EMPTY_PRESETS: Record<UiDataTableEmptyKind, UiDataTableEmptyPreset> = {
  default: {
    title: '',
    description: '暂无数据',
  },
  'first-run': {
    title: '暂无记录',
    description: '当前还没有可展示的数据，请先完成创建或生成。',
  },
  'no-result': {
    title: '无匹配结果',
    description: '请调整筛选条件后重试。',
  },
}

type ColumnWithMeta<RecordType> = ColumnType<RecordType> & {
  meta?: UiDataTableColumnMeta
}

/**
 * 构造数值列：右对齐并标记 meta.numeric，便于批量 normalize。
 */
export function buildNumericColumn<RecordType = Record<string, unknown>>(
  column: ColumnType<RecordType>,
): ColumnType<RecordType> {
  const withMeta = column as ColumnWithMeta<RecordType>
  const enriched: ColumnWithMeta<RecordType> = {
    ...column,
    align: column.align ?? 'right',
    meta: {
      ...withMeta.meta,
      numeric: true,
    },
  }
  return normalizeDataTableColumn(enriched)
}

/**
 * 归一单列定义：meta.numeric 或 align=right 时统一 className 与表头对齐。
 */
export function normalizeDataTableColumn<RecordType = Record<string, unknown>>(
  column: ColumnType<RecordType> | ColumnWithMeta<RecordType>,
): ColumnType<RecordType> {
  const withMeta = column as ColumnWithMeta<RecordType>
  const alignRight = withMeta.meta?.numeric || column.align === 'right'
  if (!alignRight) {
    return column
  }
  const classNames = [
    typeof column.className === 'string' ? column.className : '',
    'ui-data-table__col--numeric',
  ].filter(Boolean)
  return {
    ...column,
    align: 'right',
    className: classNames.join(' ') || undefined,
  }
}

/**
 * 批量归一表格列，供 UiDataTable 与页面列定义复用。
 */
export function normalizeDataTableColumns<RecordType = Record<string, unknown>>(
  columns: ColumnsType<RecordType>,
): ColumnsType<RecordType> {
  return columns.map((column) => normalizeDataTableColumn(column))
}

/**
 * 当存在 fixed 列且列宽可求和时，计算横向滚动宽度，避免固定列与操作按钮错位溢出。
 */
export function resolveDataTableScrollX(columns: ColumnsType): number | undefined {
  let totalWidth = 0
  let hasNumericWidth = false
  let hasFixed = false

  for (const column of columns) {
    if ('children' in column && column.children?.length) {
      continue
    }
    const col = column as ColumnType
    if (col.fixed === 'left' || col.fixed === 'right' || col.fixed === true) {
      hasFixed = true
    }
    if (typeof col.width === 'number') {
      totalWidth += col.width
      hasNumericWidth = true
      continue
    }
    if (typeof col.width === 'string') {
      const parsed = Number.parseInt(col.width, 10)
      if (!Number.isNaN(parsed)) {
        totalWidth += parsed
        hasNumericWidth = true
      }
    }
  }

  if (hasFixed && hasNumericWidth && totalWidth > 0) {
    return totalWidth
  }
  return undefined
}

/**
 * client 分页模式下按 current/pageSize 切片数据源。
 */
export function sliceDataTablePage<T>(
  dataSource: T[],
  current: number,
  pageSize: number,
): T[] {
  if (current < 1 || pageSize < 1) {
    return []
  }
  const start = (current - 1) * pageSize
  return dataSource.slice(start, start + pageSize)
}
