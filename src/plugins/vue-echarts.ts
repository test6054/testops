/**
 * mark-vue vue-echarts 懒加载入口：仅在首个图表挂载时注册 ECharts 模块与主题。
 * 禁止在 main 入口同步 import 本模块，避免图表依赖进入首屏关键路径。
 */

let readyPromise: Promise<void> | null = null

/** 懒加载并注册 mark-vue 所需 ECharts 模块与主题；重复调用共享同一 Promise。 */
export function ensureVueECharts(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const [{ setupECharts }, { registerMarkEChartsTheme }] = await Promise.all([
        import('@/config/echarts'),
        import('@/config/mark-echarts-theme'),
      ])
      setupECharts()
      registerMarkEChartsTheme()
    })()
  }
  return readyPromise
}