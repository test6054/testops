import type { Key } from 'ant-design-vue/es/_util/type'

/**
 * 类描述：UI组件共享类型定义
 * Badge徽标和WarningList预警列表的公共类型
 *
 * @author : 庆之
 * @version : 1.0
 */

/** Badge徽标色调 */
export type BadgeTone = 'gray' | 'blue' | 'orange' | 'green' | 'yellow' | 'red' | 'purple' | 'ink'
/** 提示条色调 */
export type UiAlertStripTone = 'info' | 'success' | 'warning' | 'error'

/** 状态块状态 */
export type UiStateBlockState = 'empty' | 'loading' | 'success' | 'warning' | 'error' | 'info'

/** 通用尺寸：产品 densify 用 sm/md/lg；兼容 ant SizeType 别名 */
export type UiComponentSize = 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large'

/** 通用字段状态 */
export type UiFieldStatus = 'default' | 'error' | 'warning' | 'success'

/** 按钮变体 */
export type UiButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive' | 'soft' | 'secondary'

/** 按钮状态 */
export type UiButtonStatus = 'normal' | 'danger' | 'success' | 'warning'

/** 表单字段名 */
export type UiFormName = string | number | (string | number)[]

/** 统一选项值 */
export type UiOptionValue = string | number

/** 统一选项结构 */
export interface UiSelectOption {
  label: string
  value: UiOptionValue
  disabled?: boolean
}

export interface UiTreeNode {
  key: string | number
  title?: string
  children?: UiTreeNode[]
}

/** 筛选器选项 */
export interface FilterOption {
  label: string
  value: string | number | boolean | null
  disabled?: boolean
}

/** 筛选器字段配置 */
export interface FilterField {
  key: string
  label?: string
  type?: 'input' | 'select' | 'date' | 'year' | 'custom'
  placeholder?: string
  options?: FilterOption[]
  allowClear?: boolean
  allowSearch?: boolean
  /** 多选模式，选择框为多选框 */
  mode?: 'multiple'
  defaultValue?: string | number | boolean | null | (string | number)[]
  width?: string | number
  flex?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  inputPrefixIcon?: 'search'
  /** 快捷键聚焦锚点：渲染到字段容器 data-shortcut-target */
  shortcutTarget?: string
  disabled?: boolean
  size?: UiComponentSize
  status?: UiFieldStatus
  triggerSearchOnChange?: boolean
  showTime?: boolean
  format?: string
  valueFormat?: string
}

/** 筛选胶囊项 */
export interface FilterPillOption {
  label: string
  value: string | number | null
  count?: number
  disabled?: boolean
}

/** UiFilterPills v-model 值：单选为 string | number | null，多选为 string | number 数组 */
export type FilterPillModelValue = string | number | null | Array<string | number>

/** 下拉操作项 */
export interface UiDropdownActionItem {
  key: string
  label?: string
  disabled?: boolean
  danger?: boolean
  type?: 'item' | 'divider'
}

/** 表格行内操作项：默认展示 maxVisible 条，超出项收入「更多」下拉 */
export interface UiTableRowActionItem {
  key: string
  label: string
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  hidden?: boolean
}

/** 通知列表动作项 */
export interface UiNoticeAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
}

/** 通知 / 消息列表项 */
export interface UiNoticeItem {
  id: string
  title: string
  excerpt?: string
  sender?: string
  time?: string
  helper?: string
  unread?: boolean
  typeLabel?: string
  typeTone?: BadgeTone
  priorityLabel?: string
  priorityTone?: BadgeTone
  actions?: UiNoticeAction[]
}

/** 活动流分组 */
export interface UiActivityFeedGroup {
  key: string
  label?: string
  countText?: string
  items: UiActivityFeedItem[]
}

/** 活动流单项 */
export interface UiActivityFeedItem {
  id: string
  title: string
  description?: string
  actor?: string
  time?: string
  meta?: string
  badgeLabel?: string
  badgeTone?: BadgeTone
  avatarText?: string
  tone?: BadgeTone
  actions?: UiNoticeAction[]
}

/** 日志记录项 */
export interface UiLogRecordItem {
  id: string
  title: string
  content?: string
  actor?: string
  time?: string
  helper?: string
  typeLabel?: string
  typeTone?: BadgeTone
  statusLabel?: string
  statusTone?: BadgeTone
  actions?: UiNoticeAction[]
}

/** 图表卡统计项 */
export interface UiStatisticChartMetric {
  key?: string
  label: string
  value?: string | number
  valueText?: string
  unit?: string
  helper?: string
  tone?: BadgeTone
}

/** 环图分片项 */
export interface UiChartSliceItem {
  key?: string
  label: string
  value: number
  helper?: string
  tone?: BadgeTone
  color?: string
}

/** 柱状图数据项 */
export interface UiBarChartItem {
  key?: string
  label: string
  value: number
  helper?: string
  tone?: BadgeTone
  color?: string
}

/** 散点图单个点位：x/y 为业务坐标，weight 用于气泡半径 */
export interface UiScatterPoint {
  key: string
  x: number
  y: number
  weight?: number
  label: string
  helper?: string
  color?: string
}

/** 散点图序列：按质量区段或业务分组着色 */
export interface UiScatterSeries {
  key: string
  name: string
  color: string
  points: UiScatterPoint[]
}

/** 趋势图点位 */
export interface UiTrendPoint {
  key?: string
  label: string
  value: number
}

/** Hero 顶部统计项 */
export interface UiHeroStatItem {
  key?: string
  label: string
  value: string | number
  helper?: string
  tone?: BadgeTone
}

/** Agent 卡指标 */
export interface UiAgentMetricItem {
  key?: string
  label: string
  value: string | number
  helper?: string
}

/** 进度步骤项 */
export interface UiProgressStepItem {
  key?: string
  title: string
  description?: string
  helper?: string
  meta?: string
  percent?: number
  status?: 'pending' | 'active' | 'completed' | 'warning' | 'error'
  statusLabel?: string
}

/** 横向里程碑进度项 */
export interface UiMilestoneItem {
  key: string
  label: string
  description?: string
  helper?: string
  meta?: string
  percent?: number
  status?: 'pending' | 'active' | 'completed' | 'warning' | 'error'
  statusLabel?: string
}

/** 进度监控指标 */
export interface UiProgressMonitorMetric {
  key?: string
  label: string
  value: string | number
  unit?: string
}

/** 模式切换项 */
export interface UiModeSwitchOption {
  key: string
  label: string
  description?: string
  disabled?: boolean
  badgeLabel?: string
  badgeTone?: BadgeTone
}

/** 选择器说明项 */
export interface UiSelectorExtraItem {
  key?: string
  label: string
  value?: string
  helper?: string
}

/** 意图卡字段 */
export interface UiIntentField {
  key?: string
  label: string
  value: string
  helper?: string
}

/** 工作流步骤项 */
export interface UiWorkflowStepItem {
  key: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

/** 会话列表项 */
export interface UiSessionListItem {
  id: string | number
  title: string
  helper?: string
  unread?: boolean
  statusLabel?: string
  statusTone?: BadgeTone
}

/** 详情描述项 */
export interface UiDescriptionItem {
  key?: string
  label: string
  value?: string | number
  helper?: string
  span?: number
  direction?: 'row' | 'column'
  badgeLabel?: string
  badgeTone?: BadgeTone
  valueTone?: BadgeTone
  emptyText?: string
}

/** 面包屑项 */
export interface UiBreadcrumbItem {
  key?: string | number
  label: string
  path?: string
  href?: string
  disabled?: boolean
}

/** 轻量统计项 */
export interface UiStatisticSummaryItem {
  key?: string | number
  label: string
  value: string | number
  unit?: string
  helper?: string
  trend?: string
  tone?: BadgeTone
}

/** 手风琴项 */
export interface UiAccordionItem {
  key: string | number
  label: string
  description?: string
  helper?: string
  content?: string
  badgeLabel?: string
  badgeTone?: BadgeTone
  disabled?: boolean
}

/** 通用简单列表项 */
export interface UiSimpleListItem {
  id: string | number
  title: string
  description?: string
  helper?: string
  meta?: string
  valueText?: string
  badgeLabel?: string
  badgeTone?: BadgeTone
  statusLabel?: string
  statusTone?: BadgeTone
  actions?: UiNoticeAction[]
}

/** 列设置选项 */
export interface UiColumnSettingItem {
  key: string
  title: string
  fixed?: boolean
}

/** 洞察问题项 */
export interface UiInsightItem {
  key?: string
  title: string
  description?: string
  tag?: string
  tone?: BadgeTone
}

/** 洞察指标项 */
export interface UiInsightMetric {
  key?: string
  label: string
  value: string | number
  helper?: string
  tone?: BadgeTone
  trend?: 'up' | 'down' | 'flat'
}

/** 配额项 */
export interface UiQuotaItem {
  key?: string
  label: string
  valueText: string
  percent: number
  helper?: string
  tone?: BadgeTone
  statusLabel?: string
  statusTone?: BadgeTone
}

/** 排行榜项 */
export interface UiRankListItem {
  id?: string | number
  name: string
  subInfo?: string
  helper?: string
  value?: string | number
  valueText?: string
  unit?: string
  avatarText?: string
  tone?: BadgeTone
  trend?: number
  statusLabel?: string
  statusTone?: BadgeTone
}

/** 日志查看器色调 */
export type UiLogViewerTone = 'default' | 'danger' | 'success'

/** 消息附件 */
export interface UiMessageAttachment {
  id: string
  name: string
  size?: string
  tag?: string
  deleted?: boolean
}

/** 消息线程单项 */
export interface UiThreadMessage {
  id: string
  role: 'mine' | 'other' | 'system'
  sender?: string
  time?: string
  text?: string
  helper?: string
  statusLabel?: string
  statusTone?: BadgeTone
  attachments?: UiMessageAttachment[]
}

/** Tabs 选项 */
export interface UiTabItem {
  key: Key
  label: string
  disabled?: boolean
}

/** 分区 Tabs 项 */
export interface UiSectionTabItem {
  key: Key
  label: string
  count?: string | number
  disabled?: boolean
  helper?: string
  badgeTone?: BadgeTone
}

/** 预警列表项 */
export interface WarningListItem {
  id: string
  user: string
  desc: string
  time: string
  severity?: 'high' | 'medium' | 'low'
}

/** 箭头趋势图阶段状态 */
export type UiArrowTimelineStatus = 'pending' | 'running' | 'active' | 'completed' | 'done' | 'warning' | 'error'

/** 箭头趋势图指标项 */
export interface UiArrowTimelineMetric {
  label: string
  value: string | number
}

/** 箭头趋势图阶段 */
export interface UiArrowTimelineStage {
  key?: string
  title: string
  dateRange?: string
  status?: UiArrowTimelineStatus
  statusText?: string
  progress?: number
  metrics?: UiArrowTimelineMetric[]
}

/** 步骤条状态 */
export type UiStepStatus = 'pending' | 'running' | 'completed' | 'error'

/** 步骤条项 */
export interface UiStepItem {
  key?: string
  title: string
  description?: string
  status?: UiStepStatus
}

/** 分布条分段（UiDistributionBar） */
export interface UiDistributionSegment {
  key?: string | number
  label: string
  value: number
  tone?: BadgeTone
}

/** 统计面板项（UiStatPanel） */
export interface UiStatPanelItem {
  key?: string | number
  label: string
  value: string | number
  unit?: string
  helper?: string
  subText?: string
  trend?: string
  trendTone?: 'default' | 'success' | 'warning' | 'danger'
  tone?: BadgeTone
  icon?: import('vue').Component
  clickable?: boolean
  compact?: boolean
  onClick?: () => void
}
