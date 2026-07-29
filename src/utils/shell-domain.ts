import type { Router, RouteRecordRaw } from 'vue-router'
import {
  isPortfolioRoute,
  isQualityEvaluationRoute,
  PORTFOLIO_ROUTE_PREFIX,
  QUALITY_ADMIN_MENU_GROUP,
} from '@/utils/portfolio-route'

/**
 * 壳层产品域：顶栏域切换与侧栏一级域共用。
 * platform（系统管理）不算产品域，顶栏不高亮三域。
 */
export type ShellProductDomain = 'marking' | 'quality' | 'portfolio'

/** 侧栏 DualDomainSideNav 一级 key，与历史菜单契约对齐 */
export type ShellSideNavDomainKey
  = 'domain-marking'
    | 'domain-quality'
    | 'domain-portfolio'
    | 'domain-platform'

export const SHELL_PRODUCT_DOMAIN_HOME: Record<ShellProductDomain, string> = {
  marking: '/teacher/exam-list',
  quality: '/quality/dashboard',
  portfolio: `${PORTFOLIO_ROUTE_PREFIX}/teacher/home`,
}

export const SHELL_PRODUCT_DOMAIN_LABEL: Record<ShellProductDomain, string> = {
  marking: '阅卷',
  quality: '质量',
  portfolio: '档案袋',
}

/** 移动端 Tab / 长文案场景：完整域名 */
export const SHELL_PRODUCT_DOMAIN_FULL_LABEL: Record<ShellProductDomain, string> = {
  marking: '考试阅卷',
  quality: '质量评价',
  portfolio: '教学档案袋',
}

export const SHELL_PRODUCT_DOMAIN_OPTIONS: ReadonlyArray<{
  value: ShellProductDomain
  label: string
}> = [
  { value: 'marking', label: SHELL_PRODUCT_DOMAIN_LABEL.marking },
  { value: 'quality', label: SHELL_PRODUCT_DOMAIN_LABEL.quality },
  { value: 'portfolio', label: SHELL_PRODUCT_DOMAIN_LABEL.portfolio },
]

const LAST_PATH_STORAGE_KEY = 'mark-vue:shell-domain-last-path-v1'

type DomainLastPathMap = Partial<Record<ShellProductDomain, string>>

/**
 * 从路径与 menuGroup 解析当前产品域。
 * quality-admin 归系统管理，返回 null（顶栏不选中三域）。
 */
export function resolveShellProductDomain(
  path: string,
  menuGroup?: unknown,
): ShellProductDomain | null {
  if (typeof menuGroup === 'string' && menuGroup === QUALITY_ADMIN_MENU_GROUP) {
    return null
  }
  if (path.startsWith('/teacher')) {
    return 'marking'
  }
  if (isPortfolioRoute(path)) {
    return 'portfolio'
  }
  if (isQualityEvaluationRoute(path)) {
    return 'quality'
  }
  return null
}

/**
 * 侧栏一级域 key：含 platform；与 DualDomainSideNav 历史 key 一致。
 */
export function resolveShellSideNavDomainKey(
  path: string,
  menuGroup?: unknown,
): ShellSideNavDomainKey | null {
  if (typeof menuGroup === 'string' && menuGroup === QUALITY_ADMIN_MENU_GROUP) {
    return 'domain-platform'
  }
  const product = resolveShellProductDomain(path, menuGroup)
  if (product === 'marking') {
    return 'domain-marking'
  }
  if (product === 'quality') {
    return 'domain-quality'
  }
  if (product === 'portfolio') {
    return 'domain-portfolio'
  }
  return null
}

function readLastPathMap(): DomainLastPathMap {
  try {
    const raw = sessionStorage.getItem(LAST_PATH_STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const result: DomainLastPathMap = {}
    for (const key of Object.keys(parsed) as ShellProductDomain[]) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.length > 0) {
        result[key] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

function writeLastPathMap(map: DomainLastPathMap): void {
  try {
    sessionStorage.setItem(LAST_PATH_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 隐私模式等写失败时忽略，回退到域首页
  }
}

/**
 * 记录某产品域最近访问 fullPath（含 query），供顶栏切回时恢复。
 */
export function rememberShellDomainPath(domain: ShellProductDomain, fullPath: string): void {
  if (!fullPath.startsWith('/')) {
    return
  }
  const map = readLastPathMap()
  map[domain] = fullPath
  writeLastPathMap(map)
}

/**
 * 读取域内最近路径；无记录返回 null。
 */
export function recallShellDomainPath(domain: ShellProductDomain): string | null {
  return readLastPathMap()[domain] ?? null
}

/**
 * 解析切域目标：优先恢复本会话上次路径，路由无效则回域首页。
 */
export function resolveShellDomainNavigateTo(router: Router, domain: ShellProductDomain): string {
  const recalled = recallShellDomainPath(domain)
  if (recalled) {
    const resolved = router.resolve(recalled)
    if (resolved.matched.length > 0) {
      const last = resolved.matched[resolved.matched.length - 1]
      if (last?.name !== 'NotFound' && last?.name !== 'Forbidden') {
        return recalled
      }
    }
  }
  return SHELL_PRODUCT_DOMAIN_HOME[domain]
}

/**
 * 当前是否处于三域教师壳（阅卷/质量/档案袋）路径，用于顶栏是否展示域切换、侧栏是否走单域模式。
 */
export function isShellProductDomainPath(path: string): boolean {
  return (
    path.startsWith('/teacher')
    || isQualityEvaluationRoute(path)
    || path.startsWith(PORTFOLIO_ROUTE_PREFIX)
  )
}

/**
 * 根据布局路由树解析当前会话可用的产品域（权限投影后）。
 */
export function listAvailableShellProductDomains(
  layoutRoutes: ReadonlyArray<Pick<RouteRecordRaw, 'path'>>,
): ShellProductDomain[] {
  const result: ShellProductDomain[] = []
  if (layoutRoutes.some((entry) => entry.path === '/teacher')) {
    result.push('marking')
  }
  if (layoutRoutes.some((entry) => entry.path === '/quality')) {
    result.push('quality')
  }
  if (layoutRoutes.some((entry) => entry.path === PORTFOLIO_ROUTE_PREFIX)) {
    result.push('portfolio')
  }
  return result
}

/**
 * 路径是否属于指定产品域（含该域下系统管理页）。
 * 用于移动端 Tab 高亮：系统管理页仍归所属前缀域。
 */
export function isPathInShellProductDomain(path: string, domain: ShellProductDomain): boolean {
  switch (domain) {
    case 'marking':
      return path.startsWith('/teacher')
    case 'quality':
      return isQualityEvaluationRoute(path)
    case 'portfolio':
      return path.startsWith(PORTFOLIO_ROUTE_PREFIX) || isPortfolioRoute(path)
    default:
      return false
  }
}
/**
 * 系统管理页归属的产品域（按路径前缀）。
 * 用于「返回业务域」文案与 Logo 退出，避免顶栏三域均未选中时无处可回。
 */
export function resolveShellPlatformExitDomain(path: string): ShellProductDomain {
  if (path.startsWith('/teacher')) {
    return 'marking'
  }
  if (isPortfolioRoute(path) || path.startsWith(PORTFOLIO_ROUTE_PREFIX)) {
    return 'portfolio'
  }
  if (isQualityEvaluationRoute(path)) {
    return 'quality'
  }
  return 'marking'
}

/**
 * 系统管理页退出目标：按路径前缀回到对应产品域上次位置或首页。
 * 顶栏 DomainSwitch 在 quality-admin 不选中三域时，侧栏需提供明确返回口。
 */
export function resolveShellPlatformExitTarget(router: Router, path: string): string {
  return resolveShellDomainNavigateTo(router, resolveShellPlatformExitDomain(path))
}

/**
 * Logo 点击目标：产品域内回本域首页；系统管理回归属域上次任务页；其余走调用方默认路由。
 */
export function resolveShellLogoNavigateTo(
  router: Router,
  path: string,
  menuGroup?: unknown,
): string | null {
  const product = resolveShellProductDomain(path, menuGroup)
  if (product) {
    return SHELL_PRODUCT_DOMAIN_HOME[product]
  }
  if (resolveShellSideNavDomainKey(path, menuGroup) === 'domain-platform') {
    return resolveShellPlatformExitTarget(router, path)
  }
  return null
}

/** 侧栏「返回业务域」菜单 key，不对应真实路由 */
export const SHELL_LEAVE_PLATFORM_MENU_KEY = '__shell-leave-platform__'
