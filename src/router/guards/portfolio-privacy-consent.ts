import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { portfolioPrivacyConsentApi } from '@/apis/portfolio/privacy-consent'
import { useAuthStore } from '@/stores/modules/auth'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/utils/permission'

const TEACHER_PORTFOLIO_PREFIX = '/portfolio/teacher/'
const CONSENT_PATH = '/portfolio/teacher/privacy-consent'
const ONBOARDING_PATH = '/portfolio/teacher/onboarding'

const PORTFOLIO_TEACHER_ROLES = new Set<string>([RoleEnum.SCH_TECH, RoleEnum.SUPER_ADMIN])

function resolveOwnTeacherPath(to: RouteLocationNormalized): boolean {
  const queryTeacherId = typeof to.query.teacherId === 'string' ? to.query.teacherId : ''
  if (!queryTeacherId) {
    return true
  }
  const userStore = useUserStore()
  return queryTeacherId === String(userStore.userInfo.userId)
}

function resolveTeacherId(to: RouteLocationNormalized): string | undefined {
  const queryTeacherId = typeof to.query.teacherId === 'string' ? to.query.teacherId : ''
  if (queryTeacherId) {
    return queryTeacherId
  }
  const portfolioStore = usePortfolioStore()
  return portfolioStore.currentTeacherId || undefined
}

/** 教师本人进入档案袋主链前须确认现行告知版本（§11.1） */
export async function runPortfolioPrivacyConsentGuard(
  to: RouteLocationNormalized,
): Promise<string | void> {
  if (!to.path.startsWith(TEACHER_PORTFOLIO_PREFIX)) {
    return
  }
  if (to.path === CONSENT_PATH || to.path === ONBOARDING_PATH) {
    return
  }

  const authStore = useAuthStore()
  if (!PORTFOLIO_TEACHER_ROLES.has(authStore.userRole)) {
    return
  }
  if (!resolveOwnTeacherPath(to)) {
    return
  }

  const teacherId = resolveTeacherId(to)
  try {
    const state = await portfolioPrivacyConsentApi.getCurrent(
      teacherId ? { teacherId } : undefined,
    )
    if (state.collectionAllowed) {
      return
    }
    const params = new URLSearchParams()
    if (teacherId) {
      params.set('teacherId', teacherId)
    }
    if (state.consentStatus === 'DECLINED' || state.consentStatus === 'WITHDRAWN') {
      params.set('mode', 'blocked')
    }
    const query = params.toString()
    return query ? `${CONSENT_PATH}?${query}` : CONSENT_PATH
  } catch {
    const params = new URLSearchParams({ mode: 'error' })
    if (teacherId) {
      params.set('teacherId', teacherId)
    }
    return `${CONSENT_PATH}?${params.toString()}`
  }
}

export function createPortfolioPrivacyConsentGuard() {
  return async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const redirect = await runPortfolioPrivacyConsentGuard(to)
    if (redirect && redirect !== to.fullPath) {
      next(redirect)
      return
    }
    next()
  }
}
