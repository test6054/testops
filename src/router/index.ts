import {createRouter, createWebHistory} from 'vue-router'
import {setupRouterGuard} from '@/router/guard'
import {allRoutes} from '@/router/routes'
import {setupRoutePreload} from './preload-strategy'

function shouldHandleRouteLoadError(message: string) {
  const chunkLoadPatterns = [
    /Loading chunk [\w-]+ failed/i,
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
  ]

  return chunkLoadPatterns.some(pattern => pattern.test(message))
}

/**
 * 创建路由实例
 * 使用静态路由配置，不依赖动态路由生成
 */
const router = createRouter({
  history: createWebHistory('/'),
  routes: allRoutes,
  scrollBehavior: () => ({left: 0, top: 0}),
})

// 处理路由加载异常（版本更新导致 chunk 丢失）
router.onError((error) => {
  const message = error instanceof Error ? error.message : String(error)

  if (!shouldHandleRouteLoadError(message)) {
    return
  }

  console.error('路由资源加载失败，已禁止自动刷新。', error)
})

// 设置路由守卫
setupRouterGuard(router)

// 🚀 设置路由预加载策略
setupRoutePreload(router)

/**
 * 重置路由（简化版本，因为使用静态路由）
 */
export function resetRouter() {
  // 静态路由不需要重置，只需要清除用户状态
  // 实际的路由重置在用户登出时由 store 处理
}

export default router
