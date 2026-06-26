import type { PortfolioPortraitDimension } from '@/apis/portfolio/enums'
import { PORTFOLIO_PORTRAIT_DIMENSION_LABEL } from '@/apis/portfolio/enums'

/** 画像模板布局组件类型 */
export type PortraitWidgetType = 'radar' | 'timeline' | 'bar' | 'score_card'

export const PORTRAIT_WIDGET_TYPE_LABEL: Record<PortraitWidgetType, string> = {
  radar: '雷达图',
  timeline: '成长时间轴',
  bar: '柱状图',
  score_card: '得分卡片',
}

export interface PortfolioPortraitLayoutWidget {
  widget: PortraitWidgetType
  x: number
  y: number
  w: number
  h: number
  dimensionCode?: PortfolioPortraitDimension
}

export interface PortfolioPortraitChartConfigEntry {
  widgetIndex: number
  dimensionCode: PortfolioPortraitDimension
}

const WIDGET_TYPES = new Set<string>(Object.keys(PORTRAIT_WIDGET_TYPE_LABEL))
const DIMENSION_CODES = new Set<string>(Object.keys(PORTFOLIO_PORTRAIT_DIMENSION_LABEL))

function isPortraitDimension(value: string): value is PortfolioPortraitDimension {
  return DIMENSION_CODES.has(value)
}

/** 解析后端 layoutJson 为可视化编辑模型 */
export function parsePortraitLayoutJson(json: string): PortfolioPortraitLayoutWidget[] {
  if (!json.trim()) {
    return []
  }
  const raw = JSON.parse(json) as unknown
  const list = Array.isArray(raw)
    ? raw
    : (raw as { widgets?: unknown[] }).widgets ?? []
  const widgets: PortfolioPortraitLayoutWidget[] = []
  for (const item of list) {
    const row = item as Record<string, unknown>
    const widget = String(row.widget ?? '')
    if (!WIDGET_TYPES.has(widget)) {
      continue
    }
    const dimensionRaw = row.dimensionCode != null ? String(row.dimensionCode) : undefined
    widgets.push({
      widget: widget as PortraitWidgetType,
      x: Number(row.x ?? 0),
      y: Number(row.y ?? 0),
      w: Number(row.w ?? 6),
      h: Number(row.h ?? 4),
      dimensionCode: dimensionRaw && isPortraitDimension(dimensionRaw) ? dimensionRaw : undefined,
    })
  }
  return widgets
}

/** 序列化为后端 layoutJson 契约（不含 chartConfigJson 部分） */
export function serializePortraitLayout(widgets: PortfolioPortraitLayoutWidget[]): string {
  return JSON.stringify(widgets.map(({ widget, x, y, w, h }) => ({ widget, x, y, w, h })))
}

/** 解析 chartConfigJson 并合并到 widgets 的 dimensionCode */
export function mergeChartConfigIntoWidgets(
  widgets: PortfolioPortraitLayoutWidget[],
  chartConfigJson?: string,
): PortfolioPortraitLayoutWidget[] {
  if (!chartConfigJson?.trim()) {
    return widgets.map(row => ({ ...row }))
  }
  const entries = parsePortraitChartConfigJson(chartConfigJson)
  return widgets.map((row, index) => {
    const entry = entries.find(item => item.widgetIndex === index)
    if (!entry) {
      return { ...row }
    }
    return { ...row, dimensionCode: entry.dimensionCode }
  })
}

/** 解析 chartConfigJson */
export function parsePortraitChartConfigJson(json: string): PortfolioPortraitChartConfigEntry[] {
  if (!json.trim()) {
    return []
  }
  const raw = JSON.parse(json) as unknown
  const list = Array.isArray(raw) ? raw : []
  const entries: PortfolioPortraitChartConfigEntry[] = []
  for (const item of list) {
    const row = item as Record<string, unknown>
    const dimensionRaw = String(row.dimensionCode ?? '')
    if (!isPortraitDimension(dimensionRaw)) {
      continue
    }
    entries.push({
      widgetIndex: Number(row.widgetIndex ?? 0),
      dimensionCode: dimensionRaw,
    })
  }
  return entries
}

/** 从 widgets 维度绑定序列化 chartConfigJson */
export function serializePortraitChartConfig(widgets: PortfolioPortraitLayoutWidget[]): string {
  const entries: PortfolioPortraitChartConfigEntry[] = []
  widgets.forEach((row, index) => {
    if (row.dimensionCode) {
      entries.push({ widgetIndex: index, dimensionCode: row.dimensionCode })
    }
  })
  return JSON.stringify(entries)
}

export function defaultPortraitLayout(): PortfolioPortraitLayoutWidget[] {
  return [
    { widget: 'radar', x: 0, y: 0, w: 6, h: 4, dimensionCode: 'TEACHING' },
    { widget: 'timeline', x: 6, y: 0, w: 6, h: 4, dimensionCode: 'DEVELOPMENT_CORE' },
  ]
}

export const PORTRAIT_DIMENSION_OPTIONS = (
  Object.keys(PORTFOLIO_PORTRAIT_DIMENSION_LABEL) as PortfolioPortraitDimension[]
).map(value => ({ value, label: PORTFOLIO_PORTRAIT_DIMENSION_LABEL[value] }))
