import { registerTheme } from 'echarts/core'
import { MARK_ECHARTS_PALETTE, resolveThemeColor } from '@/utils/mark-echarts-options'

/** mark-vue 唯一 ECharts 主题名，与 vue-echarts theme 属性对齐 */
export const MARK_ECHARTS_THEME = 'mark'

let registered = false

/**
 * 注册 mark 主题：从 --dp-* / --ant-* 读取色值，供全站 vue-echarts 统一渲染。
 * 应用启动时调用一次，重复调用安全。
 */
export function registerMarkEChartsTheme(): void {
  if (registered) {
    return
  }
  registered = true

  const primary = resolveThemeColor('--ant-color-primary', MARK_ECHARTS_PALETTE.primary)
  const text = resolveThemeColor('--dp-text-primary', MARK_ECHARTS_PALETTE.text)
  const textSecondary = resolveThemeColor('--dp-text-secondary', MARK_ECHARTS_PALETTE.axisLabel)
  const border = resolveThemeColor('--dp-border', MARK_ECHARTS_PALETTE.axisLine)
  const split = resolveThemeColor('--dp-border', MARK_ECHARTS_PALETTE.splitLine)
  const surface = resolveThemeColor('--dp-surface', '#ffffff')

  registerTheme(MARK_ECHARTS_THEME, {
    color: [
      primary,
      MARK_ECHARTS_PALETTE.success,
      MARK_ECHARTS_PALETTE.warning,
      MARK_ECHARTS_PALETTE.danger,
      MARK_ECHARTS_PALETTE.purple,
      MARK_ECHARTS_PALETTE.muted,
    ],
    backgroundColor: surface,
    textStyle: {
      fontFamily: resolveThemeColor('--dp-font-family', 'inherit') || 'inherit',
      color: textSecondary,
      fontSize: 12,
    },
    title: {
      textStyle: {
        color: text,
        fontSize: 14,
        fontWeight: 600,
      },
      subtextStyle: {
        color: textSecondary,
        fontSize: 12,
      },
    },
    legend: {
      textStyle: {
        color: textSecondary,
        fontSize: 12,
      },
    },
    tooltip: {
      backgroundColor: resolveThemeColor('--ant-color-bg-elevated', surface),
      borderColor: border,
      textStyle: {
        color: text,
        fontSize: 12,
      },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: split } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: split, type: 'dashed' } },
    },
    line: {
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 2 },
    },
    bar: {
      barMaxWidth: 48,
    },
    gauge: {
      axisLine: {
        lineStyle: {
          color: [[1, split]],
        },
      },
    },
  })
}
