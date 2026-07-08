import type { RouteLocationNormalized } from 'vue-router'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import { getDefaultRoute, requiresAuth } from '@/router/permission'
import { useAuthStore, useQualityStore, useTenantStore, useUserStore } from '@/stores'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import { getValidToken } from '@/utils/auth'
import { isQualityEvaluationRoute } from '@/utils/portfolio-route'

/** 导航完成后异步补齐学校、学年学期与质量评价 scope 目录，不阻塞首屏路由。 */
async function runDeferredRouteBootstrap(to: RouteLocationNormalized): Promise<void> {
  if (!requiresAuth(to.path)) {
    return
  }

  if (!getValidToken()) {
    return
  }

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }

  const userStore = useUserStore()
  const tenantStore = useTenantStore()
  const tenantId = userStore.userInfo.tenantId

  if (tenantId && !tenantStore.tenantInfo.tenantName?.trim()) {
    await tenantStore.fetchTenantInfo(tenantId).catch(() => {})
  }

  if (isQualityEvaluationRoute(to.path)) {
    await hydrateQualitySchoolPeriodContext().catch(() => {})
  }
}

/** 质量评价域：恢复 persist scope，补齐默认学年学期并预拉目录缓存。 */
async function hydrateQualitySchoolPeriodContext(): Promise<void> {
  const qualityStore = useQualityStore()
  qualityStore.sanitizePersistedScope()

  const defaults = getDefaultAcademicYearAndSemester()
  if (!qualityStore.currentSchoolYear.trim()) {
    qualityStore.setSchoolPeriod(defaults.academicYear, undefined)
  }
  if (!qualityStore.currentSemester) {
    qualityStore.setSchoolPeriod(undefined, defaults.semester)
  }

  await Promise.all([
    qualityStore.loadMajorCategoryOptions(),
    qualityStore.loadDepartmentOptions(),
  ])

  if (qualityStore.currentProgramId || qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions({
      programId: qualityStore.currentProgramId || undefined,
    })
  }

  if (!qualityStore.currentTrainingPlanId) {
    return
  }

  const plan = qualityStore.currentPlan
    ?? await trainingPlanApi.detail(qualityStore.currentTrainingPlanId).catch(() => undefined)

  const schoolYear = plan?.schoolYear?.trim()
  if (schoolYear && !qualityStore.currentSchoolYear.trim()) {
    qualityStore.setSchoolPeriod(schoolYear, undefined)
  }
}

/** 每次成功导航后调度非关键 bootstrap。 */
export function scheduleDeferredRouteBootstrap(to: RouteLocationNormalized): void {
  void runDeferredRouteBootstrap(to).catch(() => {})
}

/** 守卫超时放行后，若仍停留在需认证路由则补一次轻量重定向校验。 */
export function schedulePostTimeoutAuthRecovery(to: RouteLocationNormalized): void {
  void (async () => {
    const authStore = useAuthStore()
    await authStore.initializeAuth().catch(() => {})
    if (!getValidToken() || !requiresAuth(to.path)) {
      return
    }

    const userStore = useUserStore()
    if (!userStore.userInfo.userId) {
      await userStore.getInfo().catch(() => {})
    }

    if (!authStore.isAuthenticated) {
      window.location.replace(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      return
    }

    const defaultRoute = getDefaultRoute(authStore.userRole)
    if (defaultRoute && defaultRoute !== to.path && to.path === '/login') {
      window.location.replace(defaultRoute)
    }
  })()
}
