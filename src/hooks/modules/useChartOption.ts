import type {EChartsCoreOption} from 'echarts/core'
import {computed} from 'vue'

/**
 * useChartOption Hook
 *
 * 图表配置 Hook
 * 固定使用浅色主题（教育系统不支持主题切换）
 *
 * @example
 * const { chartOption } = useChartOption(() => ({
 *   series: [{ type: 'line', data: [1, 2, 3] }]
 * }))
 */

interface OptionsFunction {
  (isDark: boolean): EChartsCoreOption
}

export function useChartOption(sourceOption: OptionsFunction) {
  const chartOption = computed<EChartsCoreOption>(() => {
    return sourceOption(false)
  })

  return {
    chartOption,
  }
}
