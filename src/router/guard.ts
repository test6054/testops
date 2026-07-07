import type { Router } from 'vue-router'
import type { SeoMeta } from '@/utils/seo'
import NProgress from 'nprogress'
import { runPortfolioTeacherReadinessGuard } from '@/router/guards/portfolio-teacher-readiness'
import { getDefaultRoute, hasRoutePermission, requiresAuth } from '@/router/permission'
import { useAuthStore, useRouteStore, useUserStore } from '@/stores'
import { getValidToken } from '@/utils/auth'
import { isAuthRequestFailure, isTransientRequestError } from '@/utils/error-handler'
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

/** 初始化路由守卫 */
export const setupRouterGuard = (router: Router) => {
  router.beforeEach(async (to, _from) => {
    NProgress.start()

    const authStore = useAuthStore()
    const userStore = useUserStore()

    const getAuthenticatedDefaultRoute = async () => {
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

    if (to.path === '/' || to.path === '/login') {
      const defaultRoute = await getAuthenticatedDefaultRoute()
      if (defaultRoute) {
        return defaultRoute
      }

      if (to.path === '/') {
        return '/login'
      }

      return
    }

    // 检查是否需要认证
    if (!requiresAuth(to.path)) {
      // 无需认证的页面直接放行
      return
    }

    // 先初始化用户状态，确保token状态正确（等待完成）
    try {
      await authStore.initializeAuth()
    } catch {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }

    // 检查用户是否已登录
    if (!getValidToken()) {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }

    // 确保用户信息、租户管理员权限加载完成后再生成菜单
    let userInfoLoadFailed = false
    if (!userStore.userInfo.userId) {
      try {
        await userStore.getInfo()
      } catch (error) {
        if (isAuthRequestFailure(error)) {
          userInfoLoadFailed = true
        }
      }
    }

    if (userInfoLoadFailed && !userStore.userInfo.userId) {
      await authStore.logoutCallBack()
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }

    const tenantAdminBeforeRefresh = userStore.isTenantAdmin
    await userStore.fetchTenantAdminPermission().catch(() => {
      userStore.userInfo.isTenantAdmin = false
    })

    const routeStore = useRouteStore()
    const tenantAdminChanged = tenantAdminBeforeRefresh !== userStore.isTenantAdmin
    if (!hasMenuFlag || routeStore.asyncRoutes.length === 0 || tenantAdminChanged) {
      try {
        await routeStore.generateMenus()
        hasMenuFlag = true
      } catch {
        // 菜单生成失败不阻塞导航
      }
    }

    // 验证用户是否真正认证成功
    if (!authStore.isAuthenticated) {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }

    // 已登录用户访问登录页，重定向到对应工作台
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

    // 检查是否需要强制修改密码
    if (shouldEnforcePasswordChange(userStore.userInfo) && to.path !== '/change-password') {
      return '/change-password'
    }

    // 检查路由权限
    const userRole = authStore.userRole
    const userIsTenantAdmin = userStore.isTenantAdmin

    if (!hasRoutePermission(to.path, userRole, userIsTenantAdmin)) {
      // 权限不足，重定向到对应的默认页面
      const defaultRoute = getDefaultRoute(userRole)
      if (defaultRoute !== to.path) {
        return defaultRoute
      } else {
        // 如果默认路由也是当前路由，说明配置有问题，跳转到403页面
        return '/403'
      }
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
  })

  router.onError(() => {
    NProgress.done()
  })

  router.afterEach((to) => {
    NProgress.done()

    // SEO：应用路由 SEO 配置
    if (hasSeoMeta(to.meta.seo)) {
      applySeoMeta(to.meta.seo)
    } else if (to.meta.title) {
      document.title = `${to.meta.title} - ${resolveDocumentBrandTitle()}`
    } else {
      document.title = import.meta.env.VITE_APP_TITLE
    }

    // 路由导航完成后触发预加载
    const preloadManager = getRoutePreloadManager()
    const authStore = useAuthStore()
    if (preloadManager && authStore.isAuthenticated) {
      // 根据用户角色预加载相关路由
      const userRole = authStore.userRole
      if (userRole && isValidRole(userRole)) {
        preloadManager.preloadByRole([userRole]).catch()
      }
    }
  })
}
