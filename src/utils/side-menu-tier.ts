import type { RouteRecordRaw } from 'vue-router'

/** 侧栏主路径分层：未声明 menuTier 视为 primary。导航层已全量展示，不再依赖折叠「更多」。 */
export function isPrimarySideMenuRoute(route: RouteRecordRaw): boolean {
  return route.meta?.menuTier !== 'secondary'
}

export function primarySideMenuRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.filter((route) => isPrimarySideMenuRoute(route))
}

export function secondarySideMenuRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.filter((route) => !isPrimarySideMenuRoute(route))
}

/** 当前激活的 secondary 也提升到主列表，避免选中不可见 */
export function visiblePrimarySideMenuRoutes(
  routes: RouteRecordRaw[],
  activePath: string,
): RouteRecordRaw[] {
  const primary = primarySideMenuRoutes(routes)
  const activeSecondary = secondarySideMenuRoutes(routes).filter((route) => {
    if (!route.path) {
      return false
    }
    return activePath === route.path || activePath.startsWith(`${route.path}/`)
  })
  if (activeSecondary.length === 0) {
    return primary
  }
  const seen = new Set(primary.map((route) => route.path))
  const merged = [...primary]
  for (const route of activeSecondary) {
    if (!seen.has(route.path)) {
      merged.push(route)
      seen.add(route.path)
    }
  }
  return merged
}

export function visibleSecondarySideMenuRoutes(
  routes: RouteRecordRaw[],
  activePath: string,
): RouteRecordRaw[] {
  return secondarySideMenuRoutes(routes).filter((route) => {
    if (!route.path) {
      return true
    }
    return activePath !== route.path && !activePath.startsWith(`${route.path}/`)
  })
}
