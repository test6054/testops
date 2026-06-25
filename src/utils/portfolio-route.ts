/** 教学档案袋前端路由前缀（与质量评价 /quality 平级，对齐产品 §7.27） */
export const PORTFOLIO_ROUTE_PREFIX = '/portfolio'

/** 旧路径前缀：保留用于兼容跳转判断 */
export const LEGACY_PORTFOLIO_ROUTE_PREFIX = '/quality/portfolio'

export function isPortfolioRoute(path: string): boolean {
  return path === PORTFOLIO_ROUTE_PREFIX
    || path.startsWith(`${PORTFOLIO_ROUTE_PREFIX}/`)
    || path === LEGACY_PORTFOLIO_ROUTE_PREFIX
    || path.startsWith(`${LEGACY_PORTFOLIO_ROUTE_PREFIX}/`)
}

export function isQualityEvaluationRoute(path: string): boolean {
  return path.startsWith('/quality') && !path.startsWith(LEGACY_PORTFOLIO_ROUTE_PREFIX)
}
