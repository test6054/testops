import type { Ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { cloneDeep, omit } from 'lodash-es'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import XEUtils from 'xe-utils'
import { commonRoutes, qualityRoutes, studentRoutes, teacherRoutes } from '@/router/routes'
import { RoleEnum } from '@/types/enums'
import { useAuthStore } from './auth'
import { useUserStore } from './user'

function isSidebarMenuRoute(route: RouteRecordRaw): boolean {
  return !route.meta?.hideInMenu && !(route.redirect && !route.component && !route.components)
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
      children: XEUtils.toTreeArray(route.children).map((item) => omit(item, 'children')) as RouteRecordRaw[],
    }
  })
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

  // 监听用户权限变化，自动重新生成菜单
  const userStore = useUserStore()
  watch(
    () => userStore.isTenantAdmin,
    (newValue, oldValue) => {
      // 只有当isTenantAdmin从undefined变为具体值，或者值发生变化时才重新生成菜单
      if (oldValue !== newValue && routes.value.length > 0) {
        generateMenus().catch(() => {})
      }
    }
  )

  // 生成菜单数据 - 基于用户权限过滤菜单
  const generateMenus = async (): Promise<RouteRecordRaw[]> => {
    const userStore = useUserStore()
    const authStore = useAuthStore()
    const userRole = authStore.userRole
    const userIsTenantAdmin = userStore.isTenantAdmin

    // 根据用户角色选择对应的路由
    let roleRoutes: RouteRecordRaw[]

    if (userRole === RoleEnum.SUPER_ADMIN) {
      // 超管：阅卷中心（含 SaaS 监管）+ 质量评价
      roleRoutes = [...teacherRoutes, ...qualityRoutes, ...commonRoutes]
    } else if ([RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER].includes(userRole as RoleEnum)) {
      // 教师角色：阅卷工作台 + 教学质量评价工作台（OBE 主链责任人）
      roleRoutes = [...teacherRoutes, ...qualityRoutes, ...commonRoutes]
    } else if (userRole === RoleEnum.SCH_STU) {
      roleRoutes = [...studentRoutes, ...commonRoutes]
    } else {
      roleRoutes = [...commonRoutes]
    }

    const filteredRoutes = filterRoutesByPermission(roleRoutes, userRole, userIsTenantAdmin)
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
    userIsTenantAdmin: boolean
  ): RouteRecordRaw[] => {
    return routes
      .filter(route => {
        if (userRole === RoleEnum.SUPER_ADMIN) {
          return true
        }

        // 检查路由权限
        if (route.meta?.roles) {
          const roles = route.meta.roles as string[]
          const hasRolePermission = Array.isArray(roles) && roles.includes(userRole)
          if (!hasRolePermission) {
            return false
          }
        }

        // 检查租户管理员权限
        if (route.meta?.requireTenantAdmin && !userIsTenantAdmin) {
          return false
        }

        return true
      })
      .map(route => {
        const filteredChildren = route.children
          ? filterRoutesByPermission(route.children, userRole, userIsTenantAdmin)
          : undefined

        const result: RouteRecordRaw = {
          ...route,
        }

        if (filteredChildren) {
          result.children = filteredChildren
        }

        return result
      })
      .filter(route => {
        // 如果有子路由，确保至少有一个子路由可访问
        return !(route.children && route.children.length === 0);
      })
  }

  // 获取菜单路由（过滤掉隐藏的菜单项）
  const getMenuRoutes = (): RouteRecordRaw[] => {
    return filterMenuRoutes(routes.value)
  }

  // 过滤菜单路由
  const filterMenuRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw[] => {
    const step1 = routes.filter(route => {
      // 过滤掉基础路由（登录、注册等）和错误页面
      if (route.path === '/' || route.path === '/login' || route.path === '/register'
        || route.path === '/forgot-password' || route.path === '/403' || route.path === '/404'
        || route.path.includes('pathMatch')) {
        return false
      }

      // 过滤掉隐藏的菜单项与纯 redirect 占位
      return isSidebarMenuRoute(route)
    })

    const step2 = step1.map(route => {
      const filteredChildren = route.children ? filterMenuRoutes(route.children) : undefined
      const result: RouteRecordRaw = {
        ...route,
      }

      if (filteredChildren) {
        result.children = filteredChildren
      }

      return result
    })

    return step2.filter(route => {
      // 如果有子路由，确保至少有一个子路由在菜单中显示
      return !(route.children && route.children.length === 0);
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
