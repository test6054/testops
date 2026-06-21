import { inject, watch } from 'vue'
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
