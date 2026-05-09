/**
 * 🚀 路由预加载策略
 * 智能预加载用户可能访问的页面，提升导航体验
 */

import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

/**
 * 路由预加载配置
 */
interface RoutePreloadConfig {
  /** 路由名称 */
  routeName: string
  /** 组件加载器 */
  componentLoader: () => Promise<unknown>
  /** 预加载优先级 */
  priority: number
  /** 需要的角色 */
  requiredRoles?: RoleEnum[]
  /** 预加载条件 */
  condition?: () => boolean
}

/**
 * 预加载策略配置
 */
const PRELOAD_STRATEGIES: Record<string, RoutePreloadConfig[]> = {
  // 登录后预加载
  afterLogin: [
    {
      routeName: 'UserProfile',
      componentLoader: () => import('@/views/user/profile/index.vue'),
      priority: 2
    }
  ],

  // 学生角色预加载
  studentRole: [
    {
      routeName: 'StudentScore',
      componentLoader: () => import('@/views/student/score.vue'),
      priority: 1,
      requiredRoles: [RoleEnum.SCH_STU]
    },
  ],

  // 教师角色预加载
  teacherRole: [
    {
      routeName: 'TeacherMarkingOverview',
      componentLoader: () => import('@/views/teacher/marking-overview.vue'),
      priority: 1,
      requiredRoles: [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
    },
  ],

  // 管理员角色预加载
  adminRole: [
    {
      routeName: 'AdminDashboard',
      componentLoader: () => import('@/views/admin/dashboard.vue'),
      priority: 1,
      requiredRoles: [RoleEnum.SUPER_ADMIN]
    },
  ],

  // 页面访问时预加载相关页面（Batch 1 阅卷业务页未实现，留空）
  contextual: []
}

/**
 * 路由预加载管理器
 */
export class RoutePreloadManager {
  private router: Router
  private preloadedRoutes = new Set<string>()
  private preloadPromises = new Map<string, Promise<unknown>>()

  constructor(router: Router) {
    this.router = router
    this.setupRouterHooks()
  }

  /**
   * 设置路由钩子
   */
  private setupRouterHooks() {
    // 路由导航后预加载（不阻塞导航）
    this.router.afterEach((to) => {
      void this.preloadContextualRoutes()
      void this.preloadRelatedRoutes(to.name as string)
    })
  }

  /**
   * 根据用户角色预加载路由
   */
  async preloadByRole(roles: RoleEnum[]) {
    const strategies: RoutePreloadConfig[] = []

    // 基础预加载
    strategies.push(...PRELOAD_STRATEGIES.afterLogin)

    // 角色特定预加载
    if (roles.includes(RoleEnum.SCH_STU)) {
      strategies.push(...PRELOAD_STRATEGIES.studentRole)
    }

    if (roles.some(role => [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER].includes(role))) {
      strategies.push(...PRELOAD_STRATEGIES.teacherRole)
    }

    if (roles.some((role) => [RoleEnum.SUPER_ADMIN].includes(role))) {
      strategies.push(...PRELOAD_STRATEGIES.adminRole)
    }

    await this.executePreloadStrategies(strategies)
  }

  /**
   * 预加载上下文相关的路由
   */
  private async preloadContextualRoutes() {
    const contextualStrategies = PRELOAD_STRATEGIES.contextual.filter(strategy => {
      return strategy.condition?.() || false
    })

    if (contextualStrategies.length > 0) {
      await this.executePreloadStrategies(contextualStrategies)
    }
  }

  /**
   * 预加载相关路由
   */
  private async preloadRelatedRoutes(currentRoute: string) {
    // 根据当前路由预加载相关路由
    const relatedRoutes = this.getRelatedRoutes(currentRoute)

    for (const routeConfig of relatedRoutes) {
      this.preloadRoute(routeConfig)
    }
  }

  /**
   * 获取相关路由
   */
  private getRelatedRoutes(currentRoute: string): RoutePreloadConfig[] {
    const routeRelations: Record<string, string[]> = {
      // Batch 1 阅卷端页面还未实现，不设置双向预加载关系
    }

    const relatedRouteNames = routeRelations[currentRoute] || []
    const allStrategies = Object.values(PRELOAD_STRATEGIES).flat()

    return allStrategies.filter(strategy =>
      relatedRouteNames.includes(strategy.routeName)
    )
  }

  /**
   * 执行预加载策略
   */
  private async executePreloadStrategies(strategies: RoutePreloadConfig[]) {
    // 按优先级排序
    const sortedStrategies = strategies.sort((a, b) => a.priority - b.priority)

    for (const strategy of sortedStrategies) {
      // 检查角色权限
      if (strategy.requiredRoles) {
        const authStore = useAuthStore()
        const userRole = authStore.userRole
        const hasPermission = strategy.requiredRoles.includes(userRole as RoleEnum)

        if (!hasPermission) {
          continue
        }
      }

      // 检查条件
      if (strategy.condition && !strategy.condition()) {
        continue
      }

      this.preloadRoute(strategy)
    }
  }

  /**
   * 预加载单个路由 - 仅预加载组件，不缓存数据
   */
  private preloadRoute(config: RoutePreloadConfig) {
    const { routeName, componentLoader, priority } = config

    // 避免重复预加载
    if (this.preloadedRoutes.has(routeName)) {
      return
    }

    this.preloadedRoutes.add(routeName)

    // 只预加载组件，不预加载数据（确保数据实时获取）
    void this.schedulePreload(
      `component_${routeName}`,
      componentLoader,
      priority
    )
  }

  /**
   * 调度预加载任务
   */
  private schedulePreload(key: string, loader: () => Promise<unknown>, priority: number): Promise<unknown> {
    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key)!
    }

    const preloadPromise = new Promise<unknown>((resolve) => {
      const execute = async () => {
        try {
          const result = await loader()
          resolve(result)
        } catch {
          resolve(null) // 预加载失败不影响正常使用
        }
      }

      // 根据优先级调度执行
      if (priority === 1) {
        // 高优先级立即执行
        void execute()
      } else if (priority === 2) {
        // 中优先级在下一个事件循环执行
        setTimeout(() => void execute(), 0)
      } else {
        // 低优先级在空闲时执行
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => void execute(), { timeout: 5000 })
        } else {
          setTimeout(() => void execute(), priority * 100)
        }
      }
    })

    this.preloadPromises.set(key, preloadPromise)

    // 清理已完成的Promise
    preloadPromise.finally(() => {
      this.preloadPromises.delete(key)
    })

    return preloadPromise
  }

  /**
   * 清理预加载缓存 - 在用户登出或强刷时调用
   */
  clearPreloadCache() {
    this.preloadedRoutes.clear()
    this.preloadPromises.clear()
  }
}

/**
 * 全局路由预加载管理器实例
 */
let routePreloadManager: RoutePreloadManager | null = null

/**
 * 初始化路由预加载
 */
export function setupRoutePreload(router: Router) {
  routePreloadManager = new RoutePreloadManager(router)

  // 监听用户登出，清理预加载缓存
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && !e.newValue) {
      // token被清除，用户登出
      routePreloadManager?.clearPreloadCache()
    }
  })

  return routePreloadManager
}

/**
 * 获取路由预加载管理器
 */
export function getRoutePreloadManager(): RoutePreloadManager | null {
  return routePreloadManager
}
