import type { QualityScopeProfile, QualityStoreScopeField } from '@/constants/quality-scope-profile'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  DEFAULT_SCOPE_WATCH_FIELDS,
  scopeProfileShowsChrome,
} from '@/constants/quality-scope-profile'
import { resolveQualityScopeProfile } from '@/utils/quality-scope-route'

/** 当前叶子路由 scopeProfile 及 layout chrome 开关 */
export function useQualityScopeProfile() {
  const route = useRoute()

  const scopeProfile = computed((): QualityScopeProfile => {
    return resolveQualityScopeProfile(route.matched)
  })

  const showQualityChrome = computed(() => scopeProfileShowsChrome(scopeProfile.value))

  /** dashboard 页内 StageRail 已承担详细 OBE 轨，layout strip 关闭 */
  const showObeJourneyStrip = computed(() => {
    if (!showQualityChrome.value) {
      return false
    }
    if (route.name === 'QualityDashboard') {
      return false
    }
    const profile = scopeProfile.value
    return profile === 'plan'
      || profile === 'plan-period'
      || profile === 'plan-course'
  })

  const scopeWatchFields = computed((): QualityStoreScopeField[] => {
    const override = route.meta.scopeWatchFields as QualityStoreScopeField[] | undefined
    if (override?.length) {
      return override
    }
    return DEFAULT_SCOPE_WATCH_FIELDS[scopeProfile.value]
  })

  return {
    scopeProfile,
    showQualityChrome,
    showObeJourneyStrip,
    scopeWatchFields,
  }
}
