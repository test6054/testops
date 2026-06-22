import { inject, onActivated, onMounted, watch } from 'vue'
import {
  qualityIngestEmbeddedKey,
  qualityLayoutScopeProvidedKey,
} from '@/composables/quality-layout-context'
import { useQualityStore } from '@/stores/modules/quality'

/** 页面是否应渲染自有 QualityScopeHeader */
export function useQualityPageScope() {
  const layoutScopeProvided = inject(qualityLayoutScopeProvidedKey, undefined)
  const ingestEmbedded = inject(qualityIngestEmbeddedKey, undefined)
  const showPageScopeHeader = !layoutScopeProvided?.value && !ingestEmbedded?.value
  const useStandaloneShell = !ingestEmbedded?.value
  return {
    showPageScopeHeader,
    useStandaloneShell,
  }
}

/** Layout 级范围切换后自动刷新页面数据（含 keepAlive 缓存页） */
export function useQualityScopeReload(reloadFn: () => void | Promise<void>) {
  const qualityStore = useQualityStore()
  watch(
    () => qualityStore.scopeChangeEpoch,
    () => {
      void reloadFn()
    },
  )
}

export interface QualityScopedLoaderOptions {
  /** 是否在 currentQualityCourseId / trainingPlanId / programId 变化时 reload（含 scopeChangeEpoch） */
  watchScope?: boolean
  /** 首次挂载是否立即 load */
  immediate?: boolean
  /** keepAlive 激活时是否 reload */
  reloadOnActivated?: boolean
}

/**
 * 质量页统一数据加载：合并 scopeChangeEpoch 与 programId/trainingPlanId/qualityCourseId watch。
 * 替代「useQualityScopeReload + watch(currentQualityCourseId)」双触发写法。
 * loadFn 内在每次 await 后须用 beginQualityScopeRequest().isStale() 丢弃过期响应。
 */
export function useQualityScopedLoader(
  loadFn: () => void | Promise<void>,
  options?: QualityScopedLoaderOptions,
) {
  const qualityStore = useQualityStore()
  const watchScope = options?.watchScope ?? true
  const immediate = options?.immediate ?? true
  const reloadOnActivated = options?.reloadOnActivated ?? true

  function guardedReload(): void | Promise<void> {
    return loadFn()
  }

  if (watchScope) {
    watch(
      () => [
        qualityStore.scopeChangeEpoch,
        qualityStore.currentProgramId,
        qualityStore.currentTrainingPlanId,
        qualityStore.currentQualityCourseId,
      ] as const,
      () => {
        void guardedReload()
      },
      { immediate },
    )
  }
  else {
    useQualityScopeReload(guardedReload)
    if (immediate) {
      onMounted(() => {
        void guardedReload()
      })
    }
  }

  if (reloadOnActivated) {
    onActivated(() => {
      void guardedReload()
    })
  }

  return {
    reload: guardedReload,
  }
}
