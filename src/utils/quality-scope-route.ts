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
      return profile as QualityScopeProfile
    }
  }
  return 'none'
}

/** 当前路由是否展示 quality-workspace-layout chrome（scope / journey / AI 条） */
export function showsQualityWorkspaceChrome(route: QualityScopeRouteLike): boolean {
  if (!isQualityEvaluationRoute(route.path)) {
    return false
  }
  return scopeProfileShowsChrome(resolveQualityScopeProfile(route.matched))
}
