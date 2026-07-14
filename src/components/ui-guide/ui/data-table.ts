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
 * - `default`：通用「暂无数据」（仅标题）
 * - `first-run`：首次无记录「暂无记录」，可配 `#empty-action`
 * - `no-result`：筛选无结果「无匹配结果」
 * - 请求失败请传 `loadError`，勿与空数据混淆
 * 也可传 `emptyTitle` / `emptyDescription`（默认 description 为空）或完全自定义 `#empty` slot。
 *
 * ## 列固定
 * - 操作列（key=actions）默认 fixed:right
 * - 宽表自动首列 fixed:left；页面不得声明多个左固定列
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
  /** 教师向空态默认无说明；空字符串表示不渲染 description */
  description: string
}

/** UiDataTable 内置空态文案预设：仅短标题，无 description */
export const UI_DATA_TABLE_EMPTY_PRESETS: Record<UiDataTableEmptyKind, UiDataTableEmptyPreset> = {
  'default': {
    title: '暂无数据',
    description: '',
  },
  'first-run': {
    title: '暂无记录',
    description: '',
  },
  'no-result': {
    title: '无匹配结果',
    description: '',
  },
}

export interface ResolveUiDataTableEmptyKindInput {
  /** 请求失败（优先于空数据语义） */
  hasError?: boolean
  /** 当前是否有筛选条件 */
  hasActiveFilters?: boolean
  /** 首次进入、尚未产生业务数据 */
  isFirstRun?: boolean
}

/**
 * 解析列表空态 kind。
 * 失败态由 UiDataTable.loadError 单独覆盖；此处只映射空数据语义。
 */
export function resolveUiDataTableEmptyKind(
  input: ResolveUiDataTableEmptyKindInput = {},
): UiDataTableEmptyKind {
  if (input.hasActiveFilters) {
    return 'no-result'
  }
  if (input.isFirstRun) {
    return 'first-run'
  }
  return 'default'
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
  'questionType',
  'questionStem',
  'fullScore',
  'questionFullScore',
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

function resolveMinWidthCss(minWidth: ColumnType['minWidth']): string | undefined {
  if (minWidth == null) {
    return undefined
  }
  if (typeof minWidth === 'number') {
    return `${minWidth}px`
  }
  const textMinWidth = String(minWidth)
  if (textMinWidth.trim()) {
    return textMinWidth
  }
  return undefined
}

/** 将 minWidth 注入 Ant Table 单元格 style，保证弹性列在 scroll.x 布局下不被压扁 */
function injectColumnMinWidth<RecordType>(
  column: ColumnType<RecordType>,
): ColumnType<RecordType> {
  const minWidthCss = resolveMinWidthCss(column.minWidth)
  if (!minWidthCss) {
    return column
  }
  const prevCustomCell = column.customCell
  const prevCustomHeaderCell = column.customHeaderCell
  return {
    ...column,
    customCell: (record, rowIndex, col) => {
      const base = prevCustomCell?.(record, rowIndex, col) ?? {}
      const baseStyle = (base.style ?? {}) as Record<string, string>
      return {
        ...base,
        style: { ...baseStyle, minWidth: minWidthCss },
      }
    },
    customHeaderCell: (col) => {
      const base = prevCustomHeaderCell?.(col) ?? {}
      const baseStyle = (base.style ?? {}) as Record<string, string>
      return {
        ...base,
        style: { ...baseStyle, minWidth: minWidthCss },
      }
    },
  }
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
 * 归一单列定义：操作列居中、数值列右对齐、minWidth 注入单元格 style。
 */
export function normalizeDataTableColumn<RecordType = Record<string, unknown>>(
  column: ColumnType<RecordType> | ColumnWithMetaLegacy<RecordType>,
): ColumnType<RecordType> {
  const columnKey = resolveColumnKey(column)
  const withMinWidth = injectColumnMinWidth(column)
  const withMeta = withMinWidth as ColumnWithMetaLegacy<RecordType>
  const alignRight = withMeta.meta?.numeric || withMinWidth.align === 'right'
  if (columnKey === 'actions') {
    return {
      ...withMinWidth,
      align: withMinWidth.align ?? 'center',
      fixed: withMinWidth.fixed ?? 'right',
    }
  }
  if (!alignRight) {
    return withMinWidth
  }
  const classNames = [
    typeof withMinWidth.className === 'string' ? withMinWidth.className : '',
    'ui-data-table__col--numeric',
  ].filter(Boolean)
  return {
    ...withMinWidth,
    align: 'right',
    className: classNames.join(' ') || undefined,
  }
}

/**
 * 批量归一表格列，供 UiDataTable 与页面列定义复用。
 * - 宽表自动首列左钉、操作列右钉
 * - 左固定列仅保留首列，其余 fixed:left 会被剥离
 */
export function normalizeDataTableColumns<RecordType = Record<string, unknown>>(
  columns: ColumnsType<RecordType>,
): ColumnsType<RecordType> {
  const leftFixedState = { assigned: false }
  let withSingleLeftFixed = stripExtraLeftFixedColumns(columns, leftFixedState)
  if (tableNeedsHorizontalPinning(withSingleLeftFixed) && !leftFixedState.assigned) {
    withSingleLeftFixed = ensurePrimaryColumnPinned(withSingleLeftFixed)
  }
  return withSingleLeftFixed.map((column) => normalizeDataTableColumn(column))
}

function collectLeafColumns<RecordType>(columns: ColumnsType<RecordType>): ColumnType<RecordType>[] {
  const leaves: ColumnType<RecordType>[] = []
  for (const column of columns) {
    if ('children' in column && column.children?.length) {
      leaves.push(...collectLeafColumns(column.children))
      continue
    }
    leaves.push(column as ColumnType<RecordType>)
  }
  return leaves
}

/** 存在右钉或列宽合计需横向滚动时，启用首列左钉策略。 */
function tableNeedsHorizontalPinning<RecordType>(columns: ColumnsType<RecordType>): boolean {
  const leaves = collectLeafColumns(columns)
  const hasRightPin = leaves.some(
    (column) => column.fixed === 'right' || resolveColumnKey(column) === 'actions',
  )
  if (hasRightPin) {
    return true
  }
  return resolveDataTableScrollX(columns) != null
}

/** 宽表无左钉时，自动将第一个非操作列设为 fixed:left。 */
function ensurePrimaryColumnPinned<RecordType>(
  columns: ColumnsType<RecordType>,
): ColumnsType<RecordType> {
  const state = { assigned: false }
  return columns.map((column) => pinPrimaryColumnNode(column, state))
}

function pinPrimaryColumnNode<RecordType>(
  column: ColumnsType<RecordType>[number],
  state: { assigned: boolean },
): ColumnsType<RecordType>[number] {
  if ('children' in column && column.children?.length) {
    return {
      ...column,
      children: column.children.map((child) => pinPrimaryColumnNode(child, state)),
    }
  }
  const leaf = column as ColumnType<RecordType>
  if (state.assigned || resolveColumnKey(leaf) === 'actions') {
    return leaf
  }
  state.assigned = true
  return {
    ...leaf,
    fixed: 'left',
  }
}

function isLeftFixedColumn(column: ColumnType): boolean {
  return column.fixed === 'left' || column.fixed === true
}

/** 仅允许第一个左固定列保留 fixed，后续左固定声明一律移除。 */
function stripExtraLeftFixedColumns<RecordType>(
  columns: ColumnsType<RecordType>,
  state: { assigned: boolean },
): ColumnsType<RecordType> {
  return columns.map((column) => {
    if ('children' in column && column.children?.length) {
      return {
        ...column,
        children: stripExtraLeftFixedColumns(column.children, state),
      }
    }
    const leaf = column as ColumnType<RecordType>
    if (!isLeftFixedColumn(leaf)) {
      return leaf
    }
    if (!state.assigned) {
      state.assigned = true
      return leaf
    }
    const { fixed: _fixed, ...rest } = leaf
    return rest as ColumnType<RecordType>
  })
}

function isLeafTableColumn(column: ColumnsType[number]): column is ColumnType {
  return !('children' in column && column.children?.length)
}

/** 无显式 width 的 flex 列在 scroll.x 计算时的保底宽度 */
export const UI_DATA_TABLE_FLEX_COLUMN_MIN_WIDTH = 240

function resolveLeafColumnWidth(column: ColumnType): number | undefined {
  if (typeof column.width === 'number') {
    return column.width
  }
  if (typeof column.minWidth === 'number') {
    return column.minWidth
  }
  if (typeof column.width === 'string') {
    const parsed = Number.parseInt(column.width, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  if (typeof column.minWidth === 'string') {
    const parsed = Number.parseInt(column.minWidth, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return undefined
}

/**
 * 当存在 fixed 列或列宽可求和超过视口基准时，计算横向滚动宽度。
 * 无 width 的 flex 列按 {@link UI_DATA_TABLE_FLEX_COLUMN_MIN_WIDTH} 计入。
 */
export function resolveDataTableScrollX(columns: ColumnsType): number | undefined {
  let totalWidth = 0
  let hasFixed = false
  let flexColumnCount = 0

  for (const column of columns) {
    if (!isLeafTableColumn(column)) {
      continue
    }
    if (column.fixed === 'left' || column.fixed === 'right' || column.fixed === true) {
      hasFixed = true
    }
    const resolvedWidth = resolveLeafColumnWidth(column)
    if (resolvedWidth != null) {
      totalWidth += resolvedWidth
      continue
    }
    flexColumnCount += 1
  }

  totalWidth += flexColumnCount * UI_DATA_TABLE_FLEX_COLUMN_MIN_WIDTH

  if (hasFixed) {
    return totalWidth > 0 ? totalWidth : undefined
  }

  if (totalWidth >= UI_DATA_TABLE_MIN_SCROLL_X) {
    return totalWidth
  }

  return undefined
}

/** 无 fixed 列时，列宽合计超过该阈值才启用 scroll.x */
export const UI_DATA_TABLE_MIN_SCROLL_X = 960

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

/** 从 UiDataTable change 事件读取分页参数 */
export function readUiDataTablePagination(
  changeEvent: UiDataTableChangeEvent,
  defaultPageSize: number,
): { pageNum: number, pageSize: number } {
  return {
    pageNum: changeEvent.pagination?.current ?? 1,
    pageSize: changeEvent.pagination?.pageSize ?? defaultPageSize,
  }
}
