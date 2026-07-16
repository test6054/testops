import type { Ref } from 'vue'
import { ref, watch } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { PortfolioWorkShellCode } from '@/apis/portfolio/types'
import { cloneDeep } from 'lodash-es'
import { defineStore } from 'pinia'
import XEUtils from 'xe-utils'
import { readPortfolioWorkShellCode } from '@/composables/usePortfolioReviewAccess'
import { passesPortfolioReviewerGate } from '@/router/permission'
import { commonRoutes } from '@/router/routes/common'
import { portfolioRoutes } from '@/router/routes/portfolio'
import { qualityRoutes } from '@/router/routes/quality'
import { studentRoutes } from '@/router/routes/student'
import { teacherRoutes } from '@/router/routes/teacher'
import { RoleEnum } from '@/types/enums'
import { useAuthStore } from './auth'
import { useUserStore } from './user'

/** 系统管理 / requireTenantAdmin 路由：超管或 edu-user 判定的租户管理员可访问 */
function passesTenantAdminRouteGate(userRole: string, userIsTenantAdmin: boolean): boolean {
  return userRole === RoleEnum.SUPER_ADMIN || userIsTenantAdmin
}

function isSidebarMenuRoute(route: RouteRecordRaw): boolean {
  return !route.meta?.hideInMenu && !(route.redirect && !route.component && !route.components)
}

function withoutChildren(route: RouteRecordRaw): RouteRecordRaw {
  const nextRoute: RouteRecordRaw = { ...route }
  delete nextRoute.children
  return nextRoute
}

/** 判断路由层级是否大于 2 */
export const isMultipleRoute = (route: RouteRecordRaw) => {
  return route.children?.some((child) => child.children?.length) ?? false
}

/** 路由降级（把三级及其以上的路由转化为二级路由） */
export const flatMultiLevelRoutes = (routes: RouteRecordRaw[]) => {
  return cloneDeep(routes).map((route) => {
    if (!isMultipleRoute(route)) return route

    return {
      ...route,
      children: XEUtils.toTreeArray<RouteRecordRaw>(route.children ?? []).map<RouteRecordRaw>((item) =>
        withoutChildren(item),
      ),
    }
  })
}

function resolveRouteRoles(route: RouteRecordRaw): string[] | null {
  const roles = route.meta?.roles
  if (roles === undefined) {
    return null
  }
  if (Array.isArray(roles) && roles.every((role) => typeof role === 'string')) {
    return roles
  }
  throw new Error(`路由 ${String(route.name ?? route.path)} 的 roles 契约不是字符串数组`)
}

interface RouteStoreState {
  routes: Ref<RouteRecordRaw[]>
  asyncRoutes: Ref<RouteRecordRaw[]>
  generateMenus: () => Promise<RouteRecordRaw[]>
  generateRoutes: () => Promise<RouteRecordRaw[]>
  getMenuRoutes: () => RouteRecordRaw[]
}

const storeSetup = (): RouteStoreState => {
  // 所有路由(常驻路由 + 动态路由) - 用于菜单显示
  const routes = ref<RouteRecordRaw[]>([])
  // 动态路由(异步路由) - 用于菜单显示
  const asyncRoutes = ref<RouteRecordRaw[]>([])

  // 合并路由 - 用于菜单数据
  const setRoutes = (data: RouteRecordRaw[]) => {
    routes.value = data
    asyncRoutes.value = data
  }

  const userStore = useUserStore()

  // 权限版本是服务端授权投影的失效信号；变化后必须整表重建菜单。
  watch(
    () => [userStore.userInfo.permissionVersion, userStore.userInfo.isTenantAdmin],
    () => {
      void generateMenus()
    },
  )

  // 生成菜单数据 - 基于用户权限过滤菜单
  const generateMenus = async (): Promise<RouteRecordRaw[]> => {
    const userStore = useUserStore()
    const authStore = useAuthStore()
    const userRole = authStore.userRole
    const userIsTenantAdmin = userStore.isTenantAdmin
    const currentPortfolioWorkShell = readPortfolioWorkShellCode()

    // 根据用户角色选择对应的路由
    let roleRoutes: RouteRecordRaw[]

    if (userRole === RoleEnum.SUPER_ADMIN) {
      // 超管：考试阅卷（含 SaaS 监管）+ 质量评价
      roleRoutes = [...teacherRoutes, ...qualityRoutes, ...portfolioRoutes, ...commonRoutes]
    } else if (userRole === RoleEnum.SCH_TECH) {
      // 教师角色：阅卷工作台 + 教学质量评价 + 教学档案袋
      roleRoutes = [...teacherRoutes, ...qualityRoutes, ...portfolioRoutes, ...commonRoutes]
    } else if (userRole === RoleEnum.SCH_STU) {
      roleRoutes = [...studentRoutes, ...commonRoutes]
    } else {
      roleRoutes = [...commonRoutes]
    }

    const filteredRoutes = filterRoutesByPermission(
      roleRoutes,
      userRole,
      userIsTenantAdmin,
      currentPortfolioWorkShell,
    )
    const flatRoutes = flatMultiLevelRoutes(cloneDeep(filteredRoutes))
    setRoutes(filteredRoutes)
    return flatRoutes
  }

  // 兼容性：保持原有接口
  const generateRoutes = generateMenus

  // 根据权限过滤路由
  const filterRoutesByPermission = (
    routes: RouteRecordRaw[],
    userRole: string,
    userIsTenantAdmin: boolean,
    currentPortfolioWorkShell: PortfolioWorkShellCode | '',
  ): RouteRecordRaw[] => {
    return routes
      .filter((route) => {
        if (
          route.meta?.requireTenantAdmin
          && !passesTenantAdminRouteGate(userRole, userIsTenantAdmin)
        ) {
          return false
        }

        if (userRole !== RoleEnum.SUPER_ADMIN) {
          // 检查路由权限
          const roles = resolveRouteRoles(route)
          if (roles) {
            const hasRolePermission = roles.includes(userRole)
            if (!hasRolePermission) {
              return false
            }
          }
        }

        // 档案审核台由服务端审核范围投影决定，教研室负责人须为具备受管教研室的 SCH_TECH。
        if (route.meta?.requirePortfolioReviewer) {
          if (!passesPortfolioReviewerGate(userRole as RoleEnum, userIsTenantAdmin)) {
            return false
          }
        }

        const portfolioWorkShells = route.meta?.portfolioWorkShells
        if (portfolioWorkShells) {
          return currentPortfolioWorkShell !== ''
            && portfolioWorkShells.includes(currentPortfolioWorkShell)
        }

        return true
      })
      .map((route) => {
        const filteredChildren = route.children
          ? filterRoutesByPermission(
              route.children,
              userRole,
              userIsTenantAdmin,
              currentPortfolioWorkShell,
            )
          : undefined

        const result: RouteRecordRaw = {
          ...route,
        }

        if (filteredChildren) {
          result.children = filteredChildren
        }

        return result
      })
      .filter((route) => {
        // 如果有子路由，确保至少有一个子路由可访问
        return !(route.children && route.children.length === 0)
      })
  }

  // 获取菜单路由（过滤掉隐藏的菜单项）
  const getMenuRoutes = (): RouteRecordRaw[] => {
    return filterMenuRoutes(routes.value)
  }

  // 过滤菜单路由
  const filterMenuRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw[] => {
    const step1 = routes.filter((route) => {
      // 过滤掉基础路由（登录、注册等）和错误页面
      if (
        route.path === '/'
        || route.path === '/login'
        || route.path === '/register'
        || route.path === '/forgot-password'
        || route.path === '/403'
        || route.path === '/404'
        || route.path.includes('pathMatch')
      ) {
        return false
      }

      // 过滤掉隐藏的菜单项与纯 redirect 占位
      return isSidebarMenuRoute(route)
    })

    const step2 = step1.map((route) => {
      const filteredChildren = route.children ? filterMenuRoutes(route.children) : undefined
      const result: RouteRecordRaw = {
        ...route,
      }

      if (filteredChildren) {
        result.children = filteredChildren
      }

      return result
    })

    return step2.filter((route) => {
      // 如果有子路由，确保至少有一个子路由在菜单中显示
      return !(route.children && route.children.length === 0)
    })
  }

  return {
    routes,
    asyncRoutes,
    generateMenus,
    generateRoutes, // 兼容性
    getMenuRoutes,
  }
}

export const useRouteStore = defineStore('route', storeSetup)
