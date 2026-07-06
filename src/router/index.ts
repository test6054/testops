import type { RouteRecordRaw } from 'vue-router'
import Modal from 'ant-design-vue/es/modal'
import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuard } from '@/router/guard'
import { archiveVolumeWorkspaceRoutes } from '@/router/routes/archive-volume-workspace'
import { commonRoutes, errorRoutes } from '@/router/routes/common'
import { constantRoutes } from '@/router/routes/constant'
import { examWorkspaceRoutes } from '@/router/routes/exam-workspace'
import { portfolioRoutes } from '@/router/routes/portfolio'
import { qualityRoutes } from '@/router/routes/quality'
import { studentRoutes } from '@/router/routes/student'
import { teacherRoutes } from '@/router/routes/teacher'
import { setupRoutePreload } from './preload-strategy'

const allRoutes: RouteRecordRaw[] = [
  ...constantRoutes,
  ...teacherRoutes,
  examWorkspaceRoutes,
  archiveVolumeWorkspaceRoutes,
  ...qualityRoutes,
  ...portfolioRoutes,
  ...studentRoutes,
  ...commonRoutes,
  ...errorRoutes,
]

function isChunkLoadError(message: string) {
  const chunkLoadPatterns = [
    /Loading chunk [\w-]+ failed/i,
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
  ]

  return chunkLoadPatterns.some((pattern) => pattern.test(message))
}

/** 防止重复弹窗：发版升级期间多个动态 import 都会失败，但只能引导用户刷一次 */
let chunkReloadPrompted = false

/**
 * 创建路由实例
 * 使用静态路由配置，不依赖动态路由生成
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: allRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

/**
 * 处理路由加载异常（版本更新导致 chunk 丢失）
 *
 * 触发场景：后端发版后，浏览器仍持有旧 index.html 引用，但旧 chunk 已被覆盖。
 * 此时任何懒加载路由 import 都会失败，页面会僵在 NProgress 状态，用户感知不到。
 *
 * 处理策略：弹一次 confirm 引导用户刷新；用户拒绝时仅记录日志，不再强制。
 */
router.onError((error) => {
  const message = error instanceof Error ? error.message : String(error)

  if (!isChunkLoadError(message)) {
    return
  }

  if (chunkReloadPrompted) {
    return
  }
  chunkReloadPrompted = true

  Modal.confirm({
    title: '系统已更新',
    content: '检测到本地缓存的应用资源已过期。请刷新页面以加载最新版本，避免功能异常。',
    okText: '立即刷新',
    cancelText: '稍后再说',
    centered: true,
    onOk() {
      window.location.reload()
    },
    onCancel() {
      // 不强制刷新；下次再次触发 chunk 失败时会重新弹出
      chunkReloadPrompted = false
    },
  })
})

// 设置路由守卫
setupRouterGuard(router)

// 设置路由预加载策略
setupRoutePreload(router)

/**
 * 重置路由（简化版本，因为使用静态路由）
 */
export function resetRouter() {
  // 静态路由不需要重置，只需要清除用户状态
  // 实际的路由重置在用户登出时由 store 处理
}

export default router
