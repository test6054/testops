/** 画像模板布局组件类型 */
export enum PortraitWidgetTypeCode {
  RADAR = 'radar',
  TIMELINE = 'timeline',
  BAR = 'bar',
  SCORE_CARD = 'score_card',
}

export const ALL_PORTRAIT_WIDGET_TYPE_CODES: readonly PortraitWidgetTypeCode[] = [
  PortraitWidgetTypeCode.RADAR,
  PortraitWidgetTypeCode.TIMELINE,
  PortraitWidgetTypeCode.BAR,
  PortraitWidgetTypeCode.SCORE_CARD,
]

export const PortraitWidgetTypeDescription: Record<PortraitWidgetTypeCode, string> = {
  [PortraitWidgetTypeCode.RADAR]: '雷达图',
  [PortraitWidgetTypeCode.TIMELINE]: '成长时间轴',
  [PortraitWidgetTypeCode.BAR]: '柱状图',
  [PortraitWidgetTypeCode.SCORE_CARD]: '得分卡片',
}
