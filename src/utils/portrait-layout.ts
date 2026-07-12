import {
  ALL_PORTFOLIO_PORTRAIT_DIMENSION_CODES,
  PortfolioPortraitDimensionCode,
  PortfolioPortraitDimensionDescription,
} from '@/apis/portfolio/enums'
import {
  ALL_PORTRAIT_WIDGET_TYPE_CODES,
  PortraitWidgetTypeCode,
  PortraitWidgetTypeDescription,
} from '@/types/enums/portrait-widget-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_PORTRAIT_WIDGET_TYPE_CODES,
  PortraitWidgetTypeCode,
  PortraitWidgetTypeDescription,
} from '@/types/enums/portrait-widget-type-enum'

export const PORTRAIT_WIDGET_TYPE_OPTIONS: Array<{ value: PortraitWidgetTypeCode, label: string }>
  = ALL_PORTRAIT_WIDGET_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortraitWidgetTypeDescription, value, '画像组件类型'),
  }))

export interface PortfolioPortraitLayoutWidget {
  widget: PortraitWidgetTypeCode
  x: number
  y: number
  w: number
  h: number
  dimensionCode?: PortfolioPortraitDimensionCode
}

export interface PortfolioPortraitChartConfigEntry {
  widgetIndex: number
  dimensionCode: PortfolioPortraitDimensionCode
}

const DIMENSION_CODES = new Set<string>(ALL_PORTFOLIO_PORTRAIT_DIMENSION_CODES)

function isPortraitWidget(value: string): value is PortraitWidgetTypeCode {
  return (
    value === PortraitWidgetTypeCode.RADAR
    || value === PortraitWidgetTypeCode.TIMELINE
    || value === PortraitWidgetTypeCode.BAR
    || value === PortraitWidgetTypeCode.SCORE_CARD
  )
}

function isPortraitDimension(value: string): value is PortfolioPortraitDimensionCode {
  return DIMENSION_CODES.has(value)
}

/** 解析后端 layoutJson 为可视化编辑模型 */
export function parsePortraitLayoutJson(json: string): PortfolioPortraitLayoutWidget[] {
  if (!json.trim()) {
    return []
  }
  const raw: unknown = JSON.parse(json)
  const list = Array.isArray(raw) ? raw : readUnknownArrayProperty(raw, 'widgets')
  const widgets: PortfolioPortraitLayoutWidget[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) {
      continue
    }
    const widget = String(Object.getOwnPropertyDescriptor(item, 'widget')?.value ?? '')
    if (!isPortraitWidget(widget)) {
      continue
    }
    const dimensionValue = Object.getOwnPropertyDescriptor(item, 'dimensionCode')?.value
    const dimensionRaw = dimensionValue != null ? String(dimensionValue) : undefined
    widgets.push({
      widget,
      x: Number(Object.getOwnPropertyDescriptor(item, 'x')?.value ?? 0),
      y: Number(Object.getOwnPropertyDescriptor(item, 'y')?.value ?? 0),
      w: Number(Object.getOwnPropertyDescriptor(item, 'w')?.value ?? 6),
      h: Number(Object.getOwnPropertyDescriptor(item, 'h')?.value ?? 4),
      dimensionCode: dimensionRaw && isPortraitDimension(dimensionRaw) ? dimensionRaw : undefined,
    })
  }
  return widgets
}

function readUnknownArrayProperty(source: unknown, key: string): unknown[] {
  if (typeof source !== 'object' || source === null) {
    return []
  }
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  return Array.isArray(value) ? value : []
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
    return widgets.map((row) => ({ ...row }))
  }
  const entries = parsePortraitChartConfigJson(chartConfigJson)
  return widgets.map((row, index) => {
    const entry = entries.find((item) => item.widgetIndex === index)
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
  const raw: unknown = JSON.parse(json)
  const list = Array.isArray(raw) ? raw : []
  const entries: PortfolioPortraitChartConfigEntry[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) {
      continue
    }
    const dimensionRaw = String(Object.getOwnPropertyDescriptor(item, 'dimensionCode')?.value ?? '')
    if (!isPortraitDimension(dimensionRaw)) {
      continue
    }
    entries.push({
      widgetIndex: Number(Object.getOwnPropertyDescriptor(item, 'widgetIndex')?.value ?? 0),
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
    {
      widget: PortraitWidgetTypeCode.RADAR,
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      dimensionCode: PortfolioPortraitDimensionCode.TEACHING,
    },
    {
      widget: PortraitWidgetTypeCode.TIMELINE,
      x: 6,
      y: 0,
      w: 6,
      h: 4,
      dimensionCode: PortfolioPortraitDimensionCode.DEVELOPMENT_CORE,
    },
  ]
}

export const PORTRAIT_DIMENSION_OPTIONS: Array<{
  value: PortfolioPortraitDimensionCode
  label: string
}> = [
  {
    value: PortfolioPortraitDimensionCode.DEVELOPMENT_CORE,
    label: PortfolioPortraitDimensionDescription.DEVELOPMENT_CORE,
  },
  {
    value: PortfolioPortraitDimensionCode.TEACHING,
    label: PortfolioPortraitDimensionDescription.TEACHING,
  },
  {
    value: PortfolioPortraitDimensionCode.RESEARCH,
    label: PortfolioPortraitDimensionDescription.RESEARCH,
  },
  {
    value: PortfolioPortraitDimensionCode.TRAINING,
    label: PortfolioPortraitDimensionDescription.TRAINING,
  },
  {
    value: PortfolioPortraitDimensionCode.PRACTICE,
    label: PortfolioPortraitDimensionDescription.PRACTICE,
  },
]
