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
 *
 * ## 窄视口列（768 / 992）
 * - 列 `meta.hideBelow: 'md' | 'lg'`。
 * - `UiDataTable` 默认 `responsiveColumns` 开启，对未标注列按 key/title 推断低优先级列并在 <768px 隐藏。
 * - 操作列在 compact 视口下改为纵向堆叠，触控目标 ≥44px。
 */
import type { ColumnsType, ColumnType, TableProps } from 'ant-design-vue/es/table'
import { UI_DATA_TABLE_VIEWPORT } from '@/constants/breakpoints'

export { UI_DATA_TABLE_VIEWPORT }

/** 分页模式：server 走后端分页；client 组件内切片；none 不展示分页栏 */
export type UiDataTablePaginationMode = 'server' | 'client' | 'none'

/** 空态语义：default 通用；first-run 首次无数据；no-result 筛选无结果 */
export type UiDataTableEmptyKind = 'default' | 'first-run' | 'no-result'

/** 列在窄视口下隐藏的断点：md=768px、lg=992px */
export type UiDataTableHideBelow = 'md' | 'lg'

export interface UiDataTableColumnMeta {
  /** 数值列，自动右对齐 */
  numeric?: boolean
  /** 视口低于 md(768) 或 lg(992) 时隐藏该列；未设置时可由 infer 推断 */
  hideBelow?: UiDataTableHideBelow
}

export interface UiDataTableViewportFlags {
  md: boolean
  lg: boolean
}

export interface UiDataTableResponsiveOptions {
  /** 对未显式标注 hideBelow 的列按 key/title 推断 */
  infer?: boolean
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
  'default': {
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

/** 推断时始终保留的主列 key */
const RESPONSIVE_ALWAYS_VISIBLE_KEYS = new Set([
  'actions',
  'status',
  'taskStatus',
  'paperDisplay',
  'paper',
  'question',
  'questionNo',
  'student',
  'batchNo',
  'archiveNo',
  'archiveStatus',
  'finalScoreStatus',
  'spotCheckStatus',
  'aiScore',
  'teacherReviewScore',
  'finalScore',
  'originalScore',
  'score',
  'attentionType',
  'deviceName',
  'device',
  'gradeResultId',
  'examId',
])

/** 推断为 md 以下隐藏的低优先级列 key */
const RESPONSIVE_HIDE_BELOW_MD_KEYS = new Set([
  'createTime',
  'updateTime',
  'confirmedTime',
  'allocatedTime',
  'submittedTime',
  'createUser',
  'updateUser',
  'operator',
  'operatorName',
  'diagnostic',
  'scannerStationId',
  'scannerIp',
  'scannerDeviceId',
  'pendingUpload',
  'scanWindow',
  'scanTime',
  'time',
  'eventCount',
  'fileCount',
  'sourceFileCount',
  'attentionCount',
  'pageProgress',
  'pageCount',
  'gradeSource',
  'anonymityMode',
  'groupName',
  'session',
  'reviewerName',
  'reviewerUserId',
  'assignedTeacherUserId',
  'className',
  'studentClassName',
  'retention',
  'fileSize',
  'itemCount',
  'fullScore',
  'bias',
  'dailyScore',
  'sourceInfo',
  'scanBatch',
  'exam',
  'examName',
])

type ColumnWithMeta<RecordType> = ColumnType<RecordType> & {
  meta?: UiDataTableColumnMeta
}

function resolveColumnKey<RecordType>(column: ColumnType<RecordType>): string {
  const key = column.key ?? column.dataIndex
  return key != null ? String(key) : ''
}

/**
 * 按列 key / title 推断窄视口隐藏策略；显式 meta.hideBelow 优先。
 */
export function inferDataTableColumnHideBelow<RecordType>(
  column: ColumnType<RecordType>,
): UiDataTableHideBelow | undefined {
  const key = resolveColumnKey(column)
  if (!key || RESPONSIVE_ALWAYS_VISIBLE_KEYS.has(key)) {
    return undefined
  }
  if (RESPONSIVE_HIDE_BELOW_MD_KEYS.has(key)) {
    return 'md'
  }
  if (key.endsWith('Time') || key.endsWith('At')) {
    return 'md'
  }
  const title = typeof column.title === 'string' ? column.title : ''
  if (/时间|操作人|诊断|工位|保管|创建|更新|指派|轮次|会话|班级|来源|批次|文件数|事件数/.test(title)) {
    return 'md'
  }
  return undefined
}

function shouldHideResponsiveColumn<RecordType>(
  column: ColumnType<RecordType>,
  viewport: UiDataTableViewportFlags,
  options?: UiDataTableResponsiveOptions,
): boolean {
  const withMeta = column as ColumnWithMeta<RecordType>
  const hideBelow = withMeta.meta?.hideBelow
    ?? (options?.infer === false ? undefined : inferDataTableColumnHideBelow(column))
  if (!hideBelow) {
    return false
  }
  if (hideBelow === 'md') {
    return !viewport.md
  }
  return !viewport.lg
}

/**
 * 按视口过滤表格列；actions 等主列保留，低优先级列在窄屏隐藏。
 */
export function filterResponsiveDataTableColumns<RecordType>(
  columns: ColumnsType<RecordType>,
  viewport: UiDataTableViewportFlags,
  options?: UiDataTableResponsiveOptions,
): ColumnsType<RecordType> {
  return columns.filter((column) => !shouldHideResponsiveColumn(column, viewport, options))
}

type ColumnWithMetaLegacy<RecordType> = ColumnType<RecordType> & {
  meta?: UiDataTableColumnMeta
}

/**
 * 构造数值列：右对齐并标记 meta.numeric，便于批量 normalize。
 */
export function buildNumericColumn<RecordType = Record<string, unknown>>(
  column: ColumnType<RecordType>,
): ColumnType<RecordType> {
  const withMeta = column as ColumnWithMetaLegacy<RecordType>
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
  column: ColumnType<RecordType> | ColumnWithMetaLegacy<RecordType>,
): ColumnType<RecordType> {
  const withMeta = column as ColumnWithMetaLegacy<RecordType>
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

function isLeafTableColumn(column: ColumnsType[number]): column is ColumnType {
  return !('children' in column && column.children?.length)
}

/**
 * 当存在 fixed 列且列宽可求和时，计算横向滚动宽度，避免固定列与操作按钮错位溢出。
 */
export function resolveDataTableScrollX(columns: ColumnsType): number | undefined {
  let totalWidth = 0
  let hasNumericWidth = false
  let hasFixed = false

  for (const column of columns) {
    if (!isLeafTableColumn(column)) {
      continue
    }
    if (column.fixed === 'left' || column.fixed === 'right' || column.fixed === true) {
      hasFixed = true
    }
    if (typeof column.width === 'number') {
      totalWidth += column.width
      hasNumericWidth = true
      continue
    }
    if (typeof column.width === 'string') {
      const parsed = Number.parseInt(column.width, 10)
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
