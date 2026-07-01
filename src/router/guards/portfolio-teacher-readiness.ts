import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioOnboardingApi } from '@/apis/portfolio/onboarding'
import { useAuthStore } from '@/stores/modules/auth'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { RoleEnum } from '@/utils/permission'

const TEACHER_PORTFOLIO_PREFIX = '/portfolio/teacher/'
const ONBOARDING_PATH = '/portfolio/teacher/onboarding'
const HOME_PATH = '/portfolio/teacher/home'

const PORTFOLIO_TEACHER_ROLES = new Set<string>([
  RoleEnum.SCH_TECH,
  RoleEnum.CROP_ADMIN,
  RoleEnum.CROP_USER,
  RoleEnum.SUPER_ADMIN,
])

function resolveTeacherId(to: RouteLocationNormalized): string | undefined {
  const queryTeacherId = typeof to.query.teacherId === 'string' ? to.query.teacherId : ''
  if (queryTeacherId) {
    return queryTeacherId
  }
  const portfolioStore = usePortfolioStore()
  return portfolioStore.currentTeacherId || undefined
}

function buildOnboardingBlockedPath(
  blocked: 'template' | 'readiness',
  teacherId?: string,
): string {
  const params = new URLSearchParams({ blocked })
  if (teacherId) {
    params.set('teacherId', teacherId)
  }
  return `${ONBOARDING_PATH}?${params.toString()}`
}

function isDismissedActive(dismissedUntil?: string): boolean {
  if (!dismissedUntil) {
    return false
  }
  const until = Date.parse(dismissedUntil)
  return Number.isFinite(until) && until > Date.now()
}

function isTeacherPortfolioPath(path: string): boolean {
  return path.startsWith(TEACHER_PORTFOLIO_PREFIX)
}

/** 教师档案袋主链就绪与 onboarding 路由守卫 */
export async function runPortfolioTeacherReadinessGuard(
  to: RouteLocationNormalized,
): Promise<string | void> {
  if (!isTeacherPortfolioPath(to.path)) {
    return
  }

  const authStore = useAuthStore()
  if (!PORTFOLIO_TEACHER_ROLES.has(authStore.userRole)) {
    return
  }

  const teacherId = resolveTeacherId(to)
  const teacherRequest = teacherId ? { teacherId } : {}

  if (to.path !== ONBOARDING_PATH) {
    try {
      const readiness = await portfolioArchiveTemplateApi.getTeacherReadiness()
      if (!readiness.templatePublished) {
        return buildOnboardingBlockedPath('template', teacherId)
      }
    }
    catch {
      return buildOnboardingBlockedPath('readiness', teacherId)
    }
  }

  if (to.path === HOME_PATH) {
    try {
      const state = await portfolioOnboardingApi.getState(teacherRequest)
      if (!state.completed && !isDismissedActive(state.dismissedUntil)) {
        const query = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : ''
        return `${ONBOARDING_PATH}${query}`
      }
    }
    catch {
      return buildOnboardingBlockedPath('readiness', teacherId)
    }
  }
}

export function createPortfolioTeacherReadinessGuard() {
  return async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const redirect = await runPortfolioTeacherReadinessGuard(to)
    if (redirect && redirect !== to.fullPath) {
      next(redirect)
      return
    }
    next()
  }
}
