
/** 教学档案袋前端路由前缀（与质量评价 /quality 平级） */
export const PORTFOLIO_ROUTE_PREFIX = '/portfolio'

/** 旧路径前缀：仅 isPortfolioRoute 判断用，quality 路由树内不再保留 redirect */
export const LEGACY_PORTFOLIO_ROUTE_PREFIX = '/quality/portfolio'

/** 系统管理菜单分组 */
export const QUALITY_ADMIN_MENU_GROUP = 'quality-admin'

export function isPortfolioRoute(path: string): boolean {
  return path === PORTFOLIO_ROUTE_PREFIX
    || path.startsWith(`${PORTFOLIO_ROUTE_PREFIX}/`)
    || path === LEGACY_PORTFOLIO_ROUTE_PREFIX
    || path.startsWith(`${LEGACY_PORTFOLIO_ROUTE_PREFIX}/`)
}

/** 是否处于 /quality 路由树 */
export function isQualityEvaluationRoute(path: string): boolean {
  return path.startsWith('/quality') && !path.startsWith(LEGACY_PORTFOLIO_ROUTE_PREFIX)
}
