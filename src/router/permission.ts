/**
 * 路由权限工具函数
 * 基于各 routes/*.ts 路由配置进行权限检查，避免重复配置
 */

import type { RouteRecordRaw } from 'vue-router'
import { archiveVolumeWorkspaceRoutes } from '@/router/routes/archive-volume-workspace'
import { commonRoutes, errorRoutes } from '@/router/routes/common'
import { constantRoutes } from '@/router/routes/constant'
import { examWorkspaceRoutes } from '@/router/routes/exam-workspace'
import { portfolioRoutes } from '@/router/routes/portfolio'
import { qualityRoutes } from '@/router/routes/quality'
import { studentRoutes } from '@/router/routes/student'
import { teacherRoutes } from '@/router/routes/teacher'
import { isValidRole, RoleEnum } from '@/utils/permission'

export { runPortfolioTeacherReadinessGuard } from '@/router/guards/portfolio-teacher-readiness'

const allRoutes: RouteRecordRaw[] = [
  ...constantRoutes,
  ...teacherRoutes,
  examWorkspaceRoutes,
  archiveVolumeWorkspaceRoutes,
  ...qualityRoutes,
  ...portfolioRoutes,
  ...studentRoutes,
  ...commonRoutes,
  ...errorRoutes,
]

/**
 * 扁平化路由记录，携带构建后的完整路径
 */
type FlatRoute = RouteRecordRaw & { fullPath: string }

/**
 * 扁平化路由数组，包含所有嵌套路由，并构建完整路径
 */
function flattenRoutes(routes: RouteRecordRaw[]): FlatRoute[] {
    const result: FlatRoute[] = []

    function traverse(routes: RouteRecordRaw[], parentPath = '') {
        routes.forEach(route => {
            // 构建完整路径
            let fullPath: string
            if (route.path.startsWith('/')) {
                // 绝对路径
                fullPath = route.path
            } else {
                // 相对路径，需要拼接父路径
                fullPath = parentPath === '' ? `/${route.path}` : `${parentPath}/${route.path}`
            }

            // 规范化路径，去除多余的斜杠
            fullPath = fullPath.replace(/\/+/g, '/')

            // 创建路由副本，包含完整路径
            const routeWithFullPath = {
                ...route,
                fullPath
            }

            result.push(routeWithFullPath)

            if (route.children && route.children.length > 0) {
                traverse(route.children, fullPath)
            }
        })
    }

    traverse(routes)
    return result
}

// 静态路由缓存
let flatRoutesCache: FlatRoute[] | null = null

/**
 * 获取所有扁平化的路由
 */
function getFlatRoutes(): FlatRoute[] {
    if (flatRoutesCache) return flatRoutesCache

    // 直接使用导入的路由配置
    flatRoutesCache = flattenRoutes(allRoutes)
    return flatRoutesCache
}

/**
 * 根据路由 name 查找路由配置。
 *
 * 与 findRouteByPath 不同，本函数不需要构造完整 path，避免在动态路由（含 :param）场景下 router.resolve({ name })
 * 因缺少 params 而失败。主要服务于路由预加载策略的权限过滤。
 */
function findRouteByName(name: string): RouteRecordRaw | undefined {
    return getFlatRoutes().find(route => route.name === name)
}

/**
 * 根据路径查找路由配置
 */
function findRouteByPath(path: string): RouteRecordRaw | undefined {
    const flatRoutes = getFlatRoutes()

    return flatRoutes.find(route => {
        const routePath = route.fullPath

        // 精确匹配
        if (routePath === path) {
            return true
        }

        // 动态路由匹配（包含参数的路由）
        if (routePath.includes(':')) {
            // 将路由模式转换为正则表达式，使用完整匹配
            const routePattern = routePath
                .replace(/:[^/]+/g, '[^/]+') // 将 :id 替换为 [^/]+
                .replace(/\//g, '\\/') // 转义斜杠
            const regex = new RegExp(`^${routePattern}$`)
            return regex.test(path)
        }

        return false
    })
}

/**
 * 根据路径获取路由权限信息
 */
export function getRoutePermission(path: string): {
  roles: RoleEnum[]
  requireTenantAdmin?: boolean
  requirePortfolioReviewer?: boolean
} | undefined {
    const route = findRouteByPath(path)

    if (!route?.meta) {
        return undefined
    }

    return {
        roles: route.meta.roles || [],
        requireTenantAdmin: route.meta.requireTenantAdmin,
        requirePortfolioReviewer: route.meta.requirePortfolioReviewer,
    }
}

function passesTenantAdminRouteGate(userRole: RoleEnum, isTenantAdmin: boolean): boolean {
    return userRole === RoleEnum.SUPER_ADMIN || isTenantAdmin
}

function passesPortfolioReviewerGate(userRole: RoleEnum, isTenantAdmin: boolean): boolean {
    return userRole === RoleEnum.SUPER_ADMIN || isTenantAdmin
}

/**
 * 检查用户是否有权限访问指定路由
 */
export function hasRoutePermission(
    path: string,
    userRole: string,
    isTenantAdmin: boolean = false
): boolean {
    const permission = getRoutePermission(path)

    // 如果没有找到权限配置，默认拒绝访问
    if (!permission) {
        return false
    }

    if (!isValidRole(userRole)) {
        return false
    }

    if (userRole === RoleEnum.SUPER_ADMIN) {
        if (permission.requireTenantAdmin) {
            return passesTenantAdminRouteGate(userRole, isTenantAdmin)
        }
        return true
    }

    // 检查角色权限
    const hasRolePermission = permission.roles.includes(userRole)
    if (!hasRolePermission) {
        return false
    }
    if (permission.requireTenantAdmin && !passesTenantAdminRouteGate(userRole, isTenantAdmin)) {
        return false
    }
    return !(permission.requirePortfolioReviewer && !passesPortfolioReviewerGate(userRole, isTenantAdmin));
}

/**
 * 按路由 name 检查当前用户是否有访问权限。
 *
 * 与 hasRoutePermission 语义一致，但以路由 name 为查询键，供预加载策略与菜单生成等需要参考权限但
 * 手头只有 RouteRecord.name 的场景复用。路由未配置、meta 缺失、该角色不在 roles 列表中都返回 false。
 */
export function hasRouteNamePermission(
    name: string,
    userRole: string,
    isTenantAdmin: boolean = false
): boolean {
    const route = findRouteByName(name)
    if (!route?.meta) {
        return false
    }

    const roles = route.meta.roles ?? []
    const requireTenantAdmin = route.meta.requireTenantAdmin
    if (!isValidRole(userRole)) {
        return false
    }
    if (userRole === RoleEnum.SUPER_ADMIN) {
        if (requireTenantAdmin) {
            return passesTenantAdminRouteGate(userRole, isTenantAdmin)
        }
        return true
    }
    if (!roles.includes(userRole)) {
        return false
    }
    if (requireTenantAdmin && !passesTenantAdminRouteGate(userRole, isTenantAdmin)) {
        return false
    }
    const requirePortfolioReviewer = route.meta.requirePortfolioReviewer
    return !(requirePortfolioReviewer && !passesPortfolioReviewerGate(userRole, isTenantAdmin));
}

/**
 * 根据角色获取默认重定向路径（阅卷端业务）
 */
export function getDefaultRoute(userRole: string): string {
    switch (userRole) {
        case RoleEnum.SUPER_ADMIN:
            return '/teacher/dashboard'
        case RoleEnum.SCH_TECH:
            return '/teacher/dashboard'
        case RoleEnum.SCH_STU:
            return '/student/score'
        default:
            return '/login'
    }
}

/**
 * 检查路由是否需要认证
 */
export function requiresAuth(path: string): boolean {
  const noAuthPaths = [
    '/',
    '/login',
    '/forgot-password',
    '/cas-first-login-completion',
    '/403',
    '/404',
  ]
  // 注意：/change-password 需要认证，因为需要验证当前密码
  // 根路径 / 不需要强制认证，由路由守卫动态处理（已登录则跳转工作台，未登录则显示登录页）
  // /requirement 是公开的需求收集页面，不需要认证
  // /403、/404 错误页允许未认证访问，避免权限不足时无法展示错误页
  if (path.startsWith('/survey/')) {
    return false
  }
  // /scanner-kiosk 部署在一体机本地浏览器，统一走 Agent push_token，不走教师 JWT。
  if (path === '/scanner-kiosk' || path.startsWith('/scanner-kiosk/')) {
    return false
  }
  return !noAuthPaths.includes(path)
}
