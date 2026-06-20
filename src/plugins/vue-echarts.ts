import type { App } from 'vue'
import { UPDATE_OPTIONS_KEY } from 'vue-echarts'
import { setupECharts } from '@/config/echarts'
import { registerMarkEChartsTheme } from '@/config/mark-echarts-theme'

/** mark-vue vue-echarts 应用级安装：模块注册、主题注册、全局 update 策略。 */
export function installVueECharts(app: App): void {
  setupECharts()
  registerMarkEChartsTheme()
  app.provide(UPDATE_OPTIONS_KEY, { notMerge: true })
}
