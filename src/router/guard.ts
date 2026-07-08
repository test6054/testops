import type { NavigationGuardReturn, RouteLocationNormalized, Router } from 'vue-router'
import type { SeoMeta } from '@/utils/seo'
import NProgress from 'nprogress'
import {
  scheduleDeferredRouteBootstrap,
  schedulePostTimeoutAuthRecovery,
} from '@/router/guards/deferred-route-bootstrap'
import { runPortfolioTeacherReadinessGuard } from '@/router/guards/portfolio-teacher-readiness'
import { getDefaultRoute, hasRoutePermission, requiresAuth } from '@/router/permission'
import { useAuthStore, useRouteStore, useUserStore } from '@/stores'
import { getValidToken } from '@/utils/auth'
import { isAuthRequestFailure, isTransientRequestError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { prefersReducedMotion } from '@/utils/motion-preference'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'
import { isValidRole } from '@/utils/permission'
import { isQualityEvaluationRoute } from '@/utils/portfolio-route'
import {
  ensureQualityPlanConfirmedForNavigation,
  routeRequiresPlanConfirmed,
} from '@/utils/quality-plan-guard'
import { applySeoMeta } from '@/utils/seo'
import { getRoutePreloadManager } from './preload-strategy'
import 'nprogress/nprogress.css'

NProgress.configure({
  easing: 'ease', // 动画方式
  speed: prefersReducedMotion() ? 0 : 500, // 递增进度条的速度
  showSpinner: false, // 是否显示圆圈加载
  trickleSpeed: prefersReducedMotion() ? 0 : 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
})

/** 路由守卫关键链路总超时：弱网先放行页面，非关键数据改由 afterEach 补齐 */
const ROUTER_GUARD_TIMEOUT_MS = 5000

/** 是否已经生成过菜单数据 */
let hasMenuFlag = false
export const resetHasMenuFlag = () => {
  hasMenuFlag = false
}

/** 页面标题后缀只用品牌短名，完整副标题保留在 VITE_APP_TITLE 无页标题回退中 */
function resolveDocumentBrandTitle(): string {
  const rawTitle = import.meta.env.VITE_APP_TITLE
  if (typeof rawTitle !== 'string' || !rawTitle.trim()) {
    return '教学质量中心'
  }
  const shortTitle = rawTitle.split('|')[0]?.trim()
  return shortTitle || rawTitle.trim()
}

function hasSeoMeta(value: unknown): value is SeoMeta {
  return typeof value === 'object' && value !== null
}

function applyDocumentTitle(to: RouteLocationNormalized): void {
  if (hasSeoMeta(to.meta.seo)) {
    applySeoMeta(to.meta.seo)
  } else if (to.meta.title) {
    document.title = `${to.meta.title} - ${resolveDocumentBrandTitle()}`
  } else {
    document.title = import.meta.env.VITE_APP_TITLE
  }
}

/** 根路径 / 登录页：已登录则跳转默认工作台 */
async function resolveAuthenticatedDefaultRoute(): Promise<string> {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  await authStore.initializeAuth().catch(() => {})
  if (!getValidToken()) {
    return ''
  }

  if (!userStore.userInfo.userId) {
    try {
      await userStore.getInfo()
    } catch (error) {
      if (isAuthRequestFailure(error) && !userStore.userInfo.userId) {
        await authStore.logoutCallBack()
      }
      return ''
    }
  }

  if (!authStore.userRole && userStore.userInfo.roleKey) {
    authStore.setRole(userStore.userInfo.roleKey)
  }

  const defaultRoute = getDefaultRoute(authStore.userRole)
  return defaultRoute === '/login' ? '' : defaultRoute
}

/** 需认证路由的关键守卫：鉴权、菜单、权限与必要重定向。 */
async function runProtectedRouteGuard(to: RouteLocationNormalized): Promise<NavigationGuardReturn> {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  try {
    await authStore.initializeAuth()
  } catch {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  if (!getValidToken()) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  let userInfoLoadFailed = false
  const tenantAdminBeforeRefresh = userStore.userInfo.isTenantAdmin
  if (!userStore.userInfo.userId) {
    try {
      await userStore.getInfo()
    } catch (error) {
      if (isAuthRequestFailure(error)) {
        userInfoLoadFailed = true
      }
    }
  } else {
    await userStore.fetchTenantAdminPermission().catch(() => {})
  }

  if (userInfoLoadFailed && !userStore.userInfo.userId) {
    await authStore.logoutCallBack()
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  const routeStore = useRouteStore()
  const tenantAdminAfterRefresh = userStore.userInfo.isTenantAdmin
  const tenantAdminChanged = tenantAdminBeforeRefresh !== tenantAdminAfterRefresh
  if (!hasMenuFlag || routeStore.asyncRoutes.length === 0 || tenantAdminChanged) {
    try {
      await routeStore.generateMenus()
      hasMenuFlag = true
    } catch {
      // 菜单生成失败不阻塞导航
    }
  }

  if (!authStore.isAuthenticated) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }

  if (to.path === '/login') {
    return getDefaultRoute(authStore.userRole)
  }

  const needsSecurityRefresh
    = to.path !== '/change-password'
      && (!userStore.userInfo.forcePasswordChange || !userStore.userInfo.currentLoginProviderType)

  if (needsSecurityRefresh) {
    try {
      await userStore.refreshSecurityState()
    } catch (error: unknown) {
      if (isTransientRequestError(error)) {
        // 503 / 网络抖动：保留本地会话继续导航
      } else if (isAuthRequestFailure(error)) {
        await authStore.logoutCallBack()
        return `/login?redirect=${encodeURIComponent(to.fullPath)}`
      }
    }
  }

  if (shouldEnforcePasswordChange(userStore.userInfo) && to.path !== '/change-password') {
    return '/change-password'
  }

  const userRole = authStore.userRole
  const userIsTenantAdmin = userStore.isTenantAdmin

  if (!hasRoutePermission(to.path, userRole, userIsTenantAdmin)) {
    const defaultRoute = getDefaultRoute(userRole)
    if (defaultRoute !== to.path) {
      return defaultRoute
    }
    return '/403'
  }

  const portfolioRedirect = await runPortfolioTeacherReadinessGuard(to)
  if (portfolioRedirect) {
    return portfolioRedirect
  }

  if (isQualityEvaluationRoute(to.path) && routeRequiresPlanConfirmed(to.matched)) {
    const planOk = await ensureQualityPlanConfirmedForNavigation(to.matched)
    if (!planOk) {
      return { path: '/quality/training-plan-workbench' }
    }
  }
}

async function runBeforeEachWithTimeout(
  task: () => Promise<NavigationGuardReturn>,
): Promise<{ timedOut: true } | { timedOut: false, result: NavigationGuardReturn }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task().then((result) => ({ timedOut: false as const, result })),
      new Promise<{ timedOut: true }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ timedOut: true }), ROUTER_GUARD_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

/** 初始化路由守卫 */
export const setupRouterGuard = (router: Router) => {
  router.beforeEach(async (to, _from) => {
    NProgress.start()

    if (to.path === '/' || to.path === '/login') {
      const defaultRoute = await resolveAuthenticatedDefaultRoute()
      if (defaultRoute) {
        return defaultRoute
      }

      if (to.path === '/') {
        return '/login'
      }

      return
    }

    if (!requiresAuth(to.path)) {
      return
    }

    const guardOutcome = await runBeforeEachWithTimeout(() => runProtectedRouteGuard(to))
    if (guardOutcome.timedOut) {
      message.warning('网络较慢，页面已先行展示，部分数据仍在加载')
      schedulePostTimeoutAuthRecovery(to)
      return
    }

    return guardOutcome.result
  })

  router.onError(() => {
    NProgress.done()
  })

  router.afterEach((to) => {
    NProgress.done()
    applyDocumentTitle(to)
    scheduleDeferredRouteBootstrap(to)

    const preloadManager = getRoutePreloadManager()
    const authStore = useAuthStore()
    if (preloadManager && authStore.isAuthenticated) {
      const userRole = authStore.userRole
      if (userRole && isValidRole(userRole)) {
        preloadManager.preloadByRole([userRole]).catch()
      }
    }
  })
}
