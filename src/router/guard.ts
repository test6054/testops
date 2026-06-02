import type { Router } from 'vue-router'
import type { RoleEnum } from '@/utils/permission'
import { isValidRole } from '@/utils/permission'
import type { SeoMeta } from '@/utils/seo'
import { applySeoMeta } from '@/utils/seo'
import NProgress from 'nprogress'
import { getDefaultRoute, hasRoutePermission, requiresAuth } from '@/router/permission'
import { useAuthStore, useRouteStore, useUserStore } from '@/stores'
import { getToken } from '@/utils/auth'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'
import { getRoutePreloadManager } from './preload-strategy'
import 'nprogress/nprogress.css'

NProgress.configure({
  easing: 'ease', // 动画方式
  speed: 500, // 递增进度条的速度
  showSpinner: false, // 是否显示圆圈加载
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
})

/** 是否已经生成过菜单数据 */
let hasMenuFlag = false
export const resetHasMenuFlag = () => {
  hasMenuFlag = false
}

/** 初始化路由守卫 */
export const setupRouterGuard = (router: Router) => {
  router.beforeEach(async (to, _from) => {
    NProgress.start()

    const authStore = useAuthStore()
    const userStore = useUserStore()

    const getAuthenticatedDefaultRoute = async () => {
      await authStore.initializeAuth().catch(() => {})
      const token = getToken()

      if (!token) {
        return ''
      }

      if (!userStore.userInfo.userId) {
        try {
          await userStore.getInfo()
        } catch {
          await authStore.logoutCallBack()
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
    const token = getToken()
    if (!token) {
      return `/login?redirect=${encodeURIComponent(to.fullPath)}`
    }

    // 确保用户信息和权限完整加载后再生成菜单
    const promises: Promise<unknown>[] = []

    // 只有在用户信息缺失时才获取
    let userInfoLoadFailed = false
    if (!userStore.userInfo.userId) {
      promises.push(
        userStore.getInfo().catch(() => {
          userInfoLoadFailed = true
        }),
      )
    } else {
      // 用户信息存在，但需要确保isTenantAdmin已加载
      // 如果isTenantAdmin为undefined，说明还未加载，需要获取
      if (userStore.userInfo.isTenantAdmin === undefined) {
        promises.push(
          userStore.fetchTenantAdminPermission().catch(() => {
            // 获取失败，默认设为false
            userStore.userInfo.isTenantAdmin = false
          }),
        )
      }
    }

    // 等待用户信息和权限加载完成
    if (promises.length > 0) {
      await Promise.all(promises)
      if (userInfoLoadFailed) {
        // 用户信息获取失败，重新登录
        await authStore.logoutCallBack()
        return `/login?redirect=${encodeURIComponent(to.fullPath)}`
      }
    }

    // 用户信息和权限加载完成后，再加载菜单数据
    const routeStore = useRouteStore()
    if (!hasMenuFlag || routeStore.asyncRoutes.length === 0) {
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

    const needsSecurityRefresh =
      to.path !== '/change-password' &&
      (!userStore.userInfo.forcePasswordChange || !userStore.userInfo.currentLoginProviderType)

    if (needsSecurityRefresh) {
      try {
        await userStore.refreshSecurityState()
      } catch (error: unknown) {
        // 真正的认证失败（401 / refresh token 失效）才登出；
        // 网络层 / 5xx 时使用本地缓存的安全状态继续放行，避免抖动登出。
        const err = error as {
          response?: { status?: number }
          code?: string
          _handledByInterceptor?: boolean
        }
        const status = err?.response?.status
        const code = err?.code
        const isNetworkLevel =
          !err?.response ||
          code === 'ERR_NETWORK' ||
          code === 'ECONNABORTED' ||
          (typeof status === 'number' && status >= 500)

        if (isNetworkLevel) {
          // 本次导航继续放行
        } else {
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
  })

  router.onError(() => {
    NProgress.done()
  })

  router.afterEach((to) => {
    NProgress.done()

    // SEO：应用路由 SEO 配置
    if (to.meta.seo) {
      applySeoMeta(to.meta.seo as SeoMeta)
    } else if (to.meta.title) {
      // 回退到普通标题设置
      document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`
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
        preloadManager.preloadByRole([userRole as RoleEnum]).catch()
      }
    }
  })
}
