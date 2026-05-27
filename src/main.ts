import Antd from 'ant-design-vue'
import {createApp} from 'vue'
// ECharts全局配置
import {setupECharts} from '@/config/echarts'
// 错误处理
import {DEV_ERROR_CONFIG, initGlobalErrorHandler, PROD_ERROR_CONFIG} from '@/config/error-config'
// 状态管理
import pinia, {useAuthStore} from '@/stores'
import {getToken} from '@/utils/auth'

// 版本信息
import {printVersionInfo} from '@/utils/version'


import App from './App.vue'
import router from './router'

import 'ant-design-vue/dist/reset.css'

// 关键 CSS 优先加载，提升 LCP 性能
import '@/styles/index.scss'

// Polyfill: Array.prototype.at (ES2022) — 解决 Monaco Editor 兼容性问题
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

// 打印版本信息到控制台
printVersionInfo()

// 初始化ECharts（必须在创建Vue应用之前）
setupECharts()

const app = createApp(App)

app.use(pinia)

// 在路由初始化之前，先初始化用户状态
const authStore = useAuthStore()
const token = getToken()

// 异步初始化用户认证状态
const initializeApp = async () => {
  if (token) {
    try {
      await authStore.initializeAuth()
    } catch {
      // 认证初始化失败，继续启动应用
    }
  }
  app.use(Antd)
  app.use(router)


  app.mount('#app')
}

// 启动应用
initializeApp().catch(err => {
  console.error('Failed to initialize app:', err)
})

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue全局错误:', err, info)
}

// 配置Vue警告过滤器，过滤Suspense实验性警告
app.config.warnHandler = (msg, instance, trace) => {
  // 过滤掉Suspense实验性功能警告
  if (msg.includes('Suspense is an experimental feature')) {
    return
  }
  console.warn(msg, trace)
}
