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

/** 画像布局画布列数（与后端 assertLayoutContract 一致）。 */
export const PORTRAIT_LAYOUT_GRID_COLS = 12
/** 画像布局画布行数（与后端 assertLayoutContract 一致）。 */
export const PORTRAIT_LAYOUT_GRID_ROWS = 8

export interface PortfolioPortraitLayoutWidget {
  /** 编辑器稳定键，不进入 API layout 载荷。 */
  editorKey: string
  widget: PortraitWidgetTypeCode
  x: number
  y: number
  w: number
  h: number
  dimensionCode?: PortfolioPortraitDimensionCode
}

/** 布局就绪问题级别：error 阻断保存，warning 仅提示。 */
export type PortraitLayoutIssueLevel = 'error' | 'warning'

export interface PortraitLayoutIssue {
  level: PortraitLayoutIssueLevel
  code:
    | 'OVERLAP'
    | 'OUT_OF_BOUNDS'
    | 'MIN_SIZE'
    | 'DUPLICATE_WIDGET_TYPE'
    | 'MISSING_DIMENSION'
  message: string
  widgetIndexes: number[]
}

let portraitEditorKeySeq = 0

/** 为编辑态组件生成稳定键，避免用数组下标作 Vue key。 */
export function createPortraitEditorKey(): string {
  portraitEditorKeySeq += 1
  return `pw-${Date.now().toString(36)}-${portraitEditorKeySeq}`
}

function rectsOverlap(
  a: Pick<PortfolioPortraitLayoutWidget, 'x' | 'y' | 'w' | 'h'>,
  b: Pick<PortfolioPortraitLayoutWidget, 'x' | 'y' | 'w' | 'h'>,
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function minSizeForWidget(widget: PortraitWidgetTypeCode): { w: number, h: number } {
  if (widget === PortraitWidgetTypeCode.RADAR) {
    return { w: 4, h: 3 }
  }
  if (widget === PortraitWidgetTypeCode.BAR || widget === PortraitWidgetTypeCode.TIMELINE) {
    return { w: 3, h: 2 }
  }
  return { w: 2, h: 1 }
}

/**
 * 评估布局可读性与保存前置条件：重叠、越界、最小尺寸、同类型重复、缺维度。
 */
export function assessPortraitLayout(widgets: PortfolioPortraitLayoutWidget[]): PortraitLayoutIssue[] {
  const issues: PortraitLayoutIssue[] = []
  const typeFirstIndex = new Map<PortraitWidgetTypeCode, number>()
  widgets.forEach((row, index) => {
    const min = minSizeForWidget(row.widget)
    if (row.w < min.w || row.h < min.h) {
      issues.push({
        level: 'error',
        code: 'MIN_SIZE',
        message: `组件「${strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型')}」最小 ${min.w}×${min.h}，当前 ${row.w}×${row.h}`,
        widgetIndexes: [index],
      })
    }
    if (
      row.x < 0
      || row.y < 0
      || row.w < 1
      || row.h < 1
      || row.x + row.w > PORTRAIT_LAYOUT_GRID_COLS
      || row.y + row.h > PORTRAIT_LAYOUT_GRID_ROWS
    ) {
      issues.push({
        level: 'error',
        code: 'OUT_OF_BOUNDS',
        message: `组件 #${index + 1} 超出 ${PORTRAIT_LAYOUT_GRID_COLS}×${PORTRAIT_LAYOUT_GRID_ROWS} 栅格`,
        widgetIndexes: [index],
      })
    }
    if (!row.dimensionCode) {
      issues.push({
        level: 'warning',
        code: 'MISSING_DIMENSION',
        message: `组件 #${index + 1}（${strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型')}）未绑定维度`,
        widgetIndexes: [index],
      })
    }
    const first = typeFirstIndex.get(row.widget)
    if (first == null) {
      typeFirstIndex.set(row.widget, index)
    } else {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_WIDGET_TYPE',
        message: `组件类型「${strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型')}」重复，画像模板每种类型仅允许一个`,
        widgetIndexes: [first, index],
      })
    }
  })
  for (let i = 0; i < widgets.length; i += 1) {
    for (let j = i + 1; j < widgets.length; j += 1) {
      if (rectsOverlap(widgets[i], widgets[j])) {
        issues.push({
          level: 'error',
          code: 'OVERLAP',
          message: `组件 #${i + 1} 与 #${j + 1} 栅格重叠`,
          widgetIndexes: [i, j],
        })
      }
    }
  }
  return issues
}

/** 是否存在阻断保存的布局错误。 */
export function portraitLayoutHasBlockingIssues(widgets: PortfolioPortraitLayoutWidget[]): boolean {
  return assessPortraitLayout(widgets).some((issue) => issue.level === 'error')
}

export interface PortfolioPortraitChartConfigEntry {
  widgetIndex: number
  dimensionCode: PortfolioPortraitDimensionCode
}

const DIMENSION_CODES = new Set<string>(ALL_PORTFOLIO_PORTRAIT_DIMENSION_CODES)

function requirePortraitWidget(value: string, index: number): PortraitWidgetTypeCode {
  if (
    value === PortraitWidgetTypeCode.RADAR
    || value === PortraitWidgetTypeCode.TIMELINE
    || value === PortraitWidgetTypeCode.BAR
    || value === PortraitWidgetTypeCode.SCORE_CARD
  ) {
    return value
  }
  throw new Error(`画像模板布局含非法组件类型 index=${index} widget=${value}`)
}

function requirePortraitDimension(value: string, widgetIndex: number): PortfolioPortraitDimensionCode {
  if (DIMENSION_CODES.has(value)) {
    return value as PortfolioPortraitDimensionCode
  }
  throw new Error(`画像模板图表配置含非法维度编码 widgetIndex=${widgetIndex} dimensionCode=${value}`)
}

/** 将 API layout + chartConfig 合并为可视化编辑模型 */
export function mergeLayoutWithChartConfig(
  layout: Array<{ widget: PortraitWidgetTypeCode, x: number, y: number, w: number, h: number }>,
  chartConfig?: Array<{ widgetIndex: number, dimensionCode: PortfolioPortraitDimensionCode }>,
): PortfolioPortraitLayoutWidget[] {
  const widgets: PortfolioPortraitLayoutWidget[] = layout.map((item, index) => ({
    editorKey: createPortraitEditorKey(),
    widget: requirePortraitWidget(item.widget, index),
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }))
  if (!chartConfig?.length) {
    return widgets
  }
  return widgets.map((row, index) => {
    const entry = chartConfig.find((item) => item.widgetIndex === index)
    if (!entry) {
      return row
    }
    return {
      ...row,
      dimensionCode: requirePortraitDimension(entry.dimensionCode, index),
    }
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
      editorKey: createPortraitEditorKey(),
      widget: PortraitWidgetTypeCode.RADAR,
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      dimensionCode: PortfolioPortraitDimensionCode.TEACHING,
    },
    {
      editorKey: createPortraitEditorKey(),
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
