import type { EChartsCoreOption } from 'echarts/core'
import { computed } from 'vue'

/**
 * mark-vue 图表 option 计算：页面传入 builder 闭包，返回响应式 option 供 MarkChart / Section 消费。
 * 渲染层统一走 vue-echarts，不在 Hook 内触碰 echarts.init。
 */
export function useChartOption(sourceOption: () => EChartsCoreOption) {
  const chartOption = computed(() => sourceOption())
  return { chartOption }
}
