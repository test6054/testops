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

/** 将 API layout + chartConfig 合并为可视化编辑模型 */
export function mergeLayoutWithChartConfig(
  layout: Array<{ widget: string, x: number, y: number, w: number, h: number }>,
  chartConfig?: Array<{ widgetIndex: number, dimensionCode: string }>,
): PortfolioPortraitLayoutWidget[] {
  const widgets: PortfolioPortraitLayoutWidget[] = []
  for (const item of layout) {
    if (!isPortraitWidget(item.widget)) {
      continue
    }
    widgets.push({
      widget: item.widget,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    })
  }
  if (!chartConfig?.length) {
    return widgets
  }
  return widgets.map((row, index) => {
    const entry = chartConfig.find((item) => item.widgetIndex === index)
    if (!entry || !isPortraitDimension(entry.dimensionCode)) {
      return row
    }
    return { ...row, dimensionCode: entry.dimensionCode }
  })
}

/** 从编辑模型拆出 API layout（不含维度） */
export function toPortraitLayoutPayload(
  widgets: PortfolioPortraitLayoutWidget[],
): Array<{ widget: PortraitWidgetTypeCode, x: number, y: number, w: number, h: number }> {
  return widgets.map(({ widget, x, y, w, h }) => ({ widget, x, y, w, h }))
}

/** 从编辑模型拆出 API chartConfig */
export function toPortraitChartConfigPayload(
  widgets: PortfolioPortraitLayoutWidget[],
): PortfolioPortraitChartConfigEntry[] {
  const entries: PortfolioPortraitChartConfigEntry[] = []
  widgets.forEach((row, index) => {
    if (row.dimensionCode) {
      entries.push({ widgetIndex: index, dimensionCode: row.dimensionCode })
    }
  })
  return entries
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
