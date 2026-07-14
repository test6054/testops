import type { PortfolioReviewAccessScopeVO, PortfolioWorkShellCode } from '@/apis/portfolio/types'
import { ref } from 'vue'
import { portfolioReviewApi } from '@/apis/portfolio/review'
import { showUserError } from '@/utils/error-handler'

export const PORTFOLIO_REVIEW_ACCESS_STORAGE_KEY = 'portfolioReviewAccess'
export const PORTFOLIO_WORK_SHELL_STORAGE_KEY = 'portfolioWorkShell'
export const PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY = 'portfolioWorkShellRoute'

let loadPromise: Promise<PortfolioReviewAccessScopeVO | null> | null = null

const accessScope = ref<PortfolioReviewAccessScopeVO | null>(null)

export function readPortfolioReviewAccessFlag(): boolean | null {
  const raw = sessionStorage.getItem(PORTFOLIO_REVIEW_ACCESS_STORAGE_KEY)
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return null
}

export function writePortfolioReviewAccessFlag(reviewAccess: boolean): void {
  sessionStorage.setItem(PORTFOLIO_REVIEW_ACCESS_STORAGE_KEY, String(reviewAccess))
}

/** 权限版本变化时清除旧会话投影，下一次导航必须重新向服务端读取工作壳。 */
export function resetPortfolioReviewAccessCache(): void {
  accessScope.value = null
  sessionStorage.removeItem(PORTFOLIO_REVIEW_ACCESS_STORAGE_KEY)
  sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY)
  sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY)
}

/** 读取服务端最后一次确认的默认工作壳；未加载前返回空，不以角色键猜测。 */
export function readPortfolioWorkShellRoute(): string {
  return sessionStorage.getItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY) || ''
}

/** 读取服务端最后一次确认的默认工作壳编码，菜单投影不得从用户角色键反推。 */
export function readPortfolioWorkShellCode(): string {
  return sessionStorage.getItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY) || ''
}

/** 读取会话中的审核台菜单投影，用于识别组织范围变更后是否需要重建菜单。 */
export function readPortfolioReviewAccessProjection(): string {
  return [
    readPortfolioReviewAccessFlag(),
    readPortfolioWorkShellCode(),
    readPortfolioWorkShellRoute(),
  ].join('|')
}

/**
 * 仅在服务端返回的可用壳与入口映射中切换；不接受前端拼接的工作壳路由。
 */
export function selectPortfolioWorkShell(workShell: PortfolioWorkShellCode): string {
  const scope = accessScope.value
  const route = scope?.workShellRoutes?.[workShell]
  if (!scope?.availableWorkShells?.includes(workShell) || !route) {
    throw new Error(`当前会话无权切换教学档案袋工作壳 ${workShell}`)
  }
  scope.defaultWorkShell = workShell
  scope.defaultWorkShellRoute = route
  sessionStorage.setItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY, workShell)
  sessionStorage.setItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY, route)
  return route
}

/**
 * 加载并缓存档案审核台访问范围；供路由门禁与审核页筛选器复用。
 */
export async function ensurePortfolioReviewAccessLoaded(forceRefresh = false): Promise<PortfolioReviewAccessScopeVO | null> {
  if (accessScope.value && !forceRefresh) {
    return accessScope.value
  }
  if (!loadPromise) {
    loadPromise = portfolioReviewApi
      .getAccessScope()
      .then((scope) => {
        accessScope.value = scope
        writePortfolioReviewAccessFlag(Boolean(scope.reviewAccess))
        sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY)
        sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY)
        if (scope.defaultWorkShell) {
          sessionStorage.setItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY, scope.defaultWorkShell)
        }
        if (scope.defaultWorkShellRoute) {
          sessionStorage.setItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY, scope.defaultWorkShellRoute)
        }
        return scope
      })
      .catch((error) => {
        resetPortfolioReviewAccessCache()
        showUserError(error, '加载失败')
        return null
      })
      .finally(() => {
        loadPromise = null
      })
  }
  return loadPromise
}

export function usePortfolioReviewAccess() {
  return {
    accessScope,
    ensureLoaded: ensurePortfolioReviewAccessLoaded,
    readCachedFlag: readPortfolioReviewAccessFlag,
    selectWorkShell: selectPortfolioWorkShell,
  }
}
