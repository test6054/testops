import type { RouteRecordRaw } from 'vue-router'

/**
 * 侧栏可展示路由：排除 hideInMenu 与纯 redirect 占位（无 component 的旧路径别名）。
 */
export function isSidebarMenuRoute(route: RouteRecordRaw): boolean {
  if (route.meta?.hideInMenu) {
    return false
  }
  if (route.redirect && !route.component && !route.components) {
    return false
  }
  return true
}
