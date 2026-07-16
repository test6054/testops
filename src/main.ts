import Antd from 'ant-design-vue'
import { createApp } from 'vue'
import VueKonva from 'vue-konva'
// 错误处理
import { DEV_ERROR_CONFIG, initGlobalErrorHandler, PROD_ERROR_CONFIG } from '@/config/error-config'
import { installVueECharts } from '@/plugins/vue-echarts'
// 状态管理
import pinia, { useAuthStore } from '@/stores'
import { hasPersistedSessionHint } from '@/utils/auth'

import { configureAppFeedback, message } from '@/utils/feedback'
import App from './App.vue'
import router from './router'

import '@/styles/cascade-layers.css'
import '@/styles/ant-base.css'
import '@/styles/index.scss'
import '@/styles/tailwind.css'

// Polyfill: Array.prototype.at (ES2022) — 解决旧版浏览器兼容性问题
/* eslint-disable no-extend-native */
if (!Array.prototype.at) {
  Array.prototype.at = function (index: number) {
    const len = this.length
    const relativeIndex = index >= 0 ? index : len + index
    if (relativeIndex < 0 || relativeIndex >= len) return undefined
    return this[relativeIndex]
  }
}
/* eslint-enable no-extend-native */

// 延迟加载非关键 CSS，避免阻塞首屏渲染
const loadNonCriticalCSS = () => {
  // 动画库
  import('animate.css/animate.min.css')
  // 自定义过渡动画
  import('@/styles/css/transition.css')
}

// 在应用挂载后加载非关键CSS
setTimeout(loadNonCriticalCSS, 0)

if (typeof window !== 'undefined') {
  // 覆盖原生addEventListener方法，为touch事件自动添加passive选项
  const originalAddEventListener = EventTarget.prototype.addEventListener

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    // 为触摸事件自动添加passive选项，提升滚动性能
    if (['touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(type)) {
      if (typeof options === 'boolean') {
        options = { capture: options, passive: true }
      } else if (typeof options === 'object' && options.passive === undefined) {
        options.passive = true
      } else if (!options) {
        options = { passive: true }
      }
    }
    return originalAddEventListener.call(this, type, listener, options)
  }
}

// 初始化全局错误处理
const isDevelopment = import.meta.env.DEV
initGlobalErrorHandler(isDevelopment ? DEV_ERROR_CONFIG : PROD_ERROR_CONFIG)

// 全局反馈：统一右上角（message + notification）
configureAppFeedback()

const app = createApp(App)

installVueECharts(app)
app.use(VueKonva)

app.use(pinia)

// 在路由初始化之前注册 pinia；认证恢复不阻塞首屏挂载，由路由守卫与后台 initializeAuth 承接
const authStore = useAuthStore()

app.use(Antd)
app.use(router)
app.mount('#app')

if (hasPersistedSessionHint()) {
  authStore.initializeAuth().catch(() => {})
}

// 全局错误处理：生产环境只展示通用文案；开发环境保留控制台堆栈便于定位渲染异常
app.config.errorHandler = (err, _instance, info) => {
  if (import.meta.env.DEV) {
    console.error('[Vue errorHandler]', err, info)
  }
  message.error('页面暂时无法完成操作，请刷新当前页面后重试')
}
