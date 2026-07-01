import type { QualityStoreScopeField } from '@/constants/quality-scope-profile'
import { scopeProfileShowsChrome } from '@/constants/quality-scope-profile'
import { onActivated, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQualityScopeProfile } from '@/composables/useQualityScopeProfile'
import { useQualityStore } from '@/stores/modules/quality'
import { resolveQualityScopeProfile } from '@/utils/quality-scope-route'

/** 当前路由是否需要 quality 培养方案上下文 */
export function useRequiresQualityScope() {
  const route = useRoute()
  return scopeProfileShowsChrome(resolveQualityScopeProfile(route.matched))
}

export interface QualityScopedLoaderOptions {
  watchScope?: boolean
  immediate?: boolean
  reloadOnActivated?: boolean
}

function buildScopeWatchValues(
  qualityStore: ReturnType<typeof useQualityStore>,
  fields: QualityStoreScopeField[],
): unknown[] {
  const values: unknown[] = [qualityStore.scopeChangeEpoch]
  for (const field of fields) {
    values.push(qualityStore[field])
  }
  return values
}

/**
 * 质量页统一数据加载：按 scopeProfile 默认 watch 字段刷新。
 * loadFn 内在每次 await 后须用 beginQualityScopeRequest().isStale() 丢弃过期响应。
 */
export function useQualityScopedLoader(
  loadFn: () => void | Promise<void>,
  options?: QualityScopedLoaderOptions,
) {
  const route = useRoute()
  const qualityStore = useQualityStore()
  const { scopeWatchFields } = useQualityScopeProfile()
  const watchScope = options?.watchScope ?? true
  const immediate = options?.immediate ?? true
  const reloadOnActivated = options?.reloadOnActivated ?? true

  const profile = resolveQualityScopeProfile(route.matched)
  const scopeActive = scopeProfileShowsChrome(profile) || profile === 'none'

  function guardedReload(): void | Promise<void> {
    return loadFn()
  }

  if (!scopeActive) {
    return { reload: guardedReload }
  }

  if (watchScope && scopeWatchFields.value.length > 0) {
    watch(
      () => buildScopeWatchValues(qualityStore, scopeWatchFields.value),
      () => {
        void guardedReload()
      },
      { immediate },
    )
  }
  else if (immediate) {
    onMounted(() => {
      void guardedReload()
    })
  }

  if (reloadOnActivated) {
    onActivated(() => {
      void guardedReload()
    })
  }

  return { reload: guardedReload }
}
