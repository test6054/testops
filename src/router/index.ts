import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuard } from '@/router/guard'
import { archiveVolumeWorkspaceRoutes } from '@/router/routes/archive-volume-workspace'
import { commonRoutes, errorRoutes } from '@/router/routes/common'
import { constantRoutes } from '@/router/routes/constant'
import { createPageRoutes } from '@/router/routes/create-routes'
import { examWorkspaceRoutes } from '@/router/routes/exam-workspace'
import { portfolioRoutes } from '@/router/routes/portfolio'
import { qualityRoutes } from '@/router/routes/quality'
import { studentRoutes } from '@/router/routes/student'
import { teacherRoutes } from '@/router/routes/teacher'
import { setupRoutePreload } from './preload-strategy'

const allRoutes: RouteRecordRaw[] = [
  ...constantRoutes,
  ...teacherRoutes,
  createPageRoutes,
  examWorkspaceRoutes,
  archiveVolumeWorkspaceRoutes,
  ...qualityRoutes,
  ...portfolioRoutes,
  ...studentRoutes,
  ...commonRoutes,
  ...errorRoutes,
]

/**
 * 创建路由实例
 * 使用静态路由配置，不依赖动态路由生成
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: allRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
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
