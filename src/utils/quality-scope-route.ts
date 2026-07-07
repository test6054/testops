import type { RouteLocationNormalizedLoaded, RouteRecordNormalized } from 'vue-router'
import type { QualityScopeProfile } from '@/constants/quality-scope-profile'
import { scopeProfileShowsChrome } from '@/constants/quality-scope-profile'
import { isQualityEvaluationRoute } from '@/utils/portfolio-route'

type QualityScopeRouteLike = Pick<RouteLocationNormalizedLoaded, 'path' | 'matched'>

/** 解析叶子路由 scopeProfile，默认 none */
export function resolveQualityScopeProfile(matched: RouteRecordNormalized[]): QualityScopeProfile {
  for (let i = matched.length - 1; i >= 0; i--) {
    const profile = matched[i].meta?.scopeProfile
    if (profile) {
      if (isQualityScopeProfile(profile)) {
        return profile
      }
      throw new Error(`质量评价路由 scopeProfile 契约异常：${String(matched[i].name ?? matched[i].path)}`)
    }
  }
  return 'none'
}

function isQualityScopeProfile(value: unknown): value is QualityScopeProfile {
  return value === 'none'
    || value === 'program'
    || value === 'plan'
    || value === 'plan-period'
    || value === 'plan-course'
    || value === 'accreditation'
}

/** 当前路由是否展示 quality-workspace-layout chrome（scope / journey / AI 条） */
export function showsQualityWorkspaceChrome(route: QualityScopeRouteLike): boolean {
  if (!isQualityEvaluationRoute(route.path)) {
    return false
  }
  return scopeProfileShowsChrome(resolveQualityScopeProfile(route.matched))
}
