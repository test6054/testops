import type { QualityStoreScopeField } from '@/constants/quality-scope-profile'
import { onActivated, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQualityScopeProfile } from '@/composables/useQualityScopeProfile'
import { useSequencedLoad } from '@/composables/useSequencedLoad'
import { scopeProfileShowsChrome } from '@/constants/quality-scope-profile'
import { useQualityStore } from '@/stores/modules/quality'
import { resolveQualityScopeProfile } from '@/utils/quality-scope-route'

/** scope 联动防抖：合并同轮 program/plan/course 连续变更 */
const QUALITY_SCOPED_LOADER_DEBOUNCE_MS = 80

/** 当前路由是否需要 quality 培养方案上下文 */
export function useRequiresQualityScope() {
  const route = useRoute()
  return scopeProfileShowsChrome(resolveQualityScopeProfile(route.matched))
}

export interface QualityScopedLoaderOptions {
  watchScope?: boolean
  immediate?: boolean
  reloadOnActivated?: boolean
  /** 覆盖默认 scope 防抖毫秒；0 关闭防抖 */
  debounceMs?: number
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
 * - 每次 reload 递增 store.scopedLoadGeneration，并与 useSequencedLoad 对齐；
 * - loadFn 内在每次 await 后须用 beginQualityScopeRequest().isStale() 丢弃过期响应；
 * - scope watch 默认 80ms 防抖，避免联动字段连续变更打出并行请求；
 * - keep-alive 首次 mounted+activated 双触发时跳过首次 activated（bootstrap 由 immediate / onMounted / 页内自管）。
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
  const debounceMs = options?.debounceMs ?? QUALITY_SCOPED_LOADER_DEBOUNCE_MS
  const sequenced = useSequencedLoad({ debounceMs })
  /** keep-alive 首次进入会同步触发 activated；与 immediate/onMounted 去重 */
  let skipFirstActivated = true

  const profile = resolveQualityScopeProfile(route.matched)
  const scopeActive = scopeProfileShowsChrome(profile) || profile === 'none'

  function invokeLoad(): void {
    sequenced.runNow((token) => {
      qualityStore.setScopedLoadGeneration(token.generation)
      return loadFn()
    })
  }

  function scheduleLoad(): void {
    /** 调度前立即失效 in-flight，避免防抖窗口内旧响应落地 */
    sequenced.invalidate()
    qualityStore.setScopedLoadGeneration(sequenced.getGeneration())
    sequenced.schedule((token) => {
      qualityStore.setScopedLoadGeneration(token.generation)
      return loadFn()
    })
  }

  /** 对外 reload：立即执行（取消防抖），供按钮/页内显式刷新 */
  function guardedReload(): void {
    invokeLoad()
  }

  if (!scopeActive) {
    return {
      reload: guardedReload,
      getLoadGeneration: () => sequenced.getGeneration(),
    }
  }

  if (watchScope && scopeWatchFields.value.length > 0) {
    let scopeWatchPrimed = false
    watch(
      () => buildScopeWatchValues(qualityStore, scopeWatchFields.value),
      () => {
        /** 首次 immediate 立即加载；后续 scope 联动走防抖 */
        if (!scopeWatchPrimed && immediate) {
          scopeWatchPrimed = true
          invokeLoad()
          return
        }
        scopeWatchPrimed = true
        scheduleLoad()
      },
      { immediate },
    )
  }
  else if (immediate) {
    onMounted(() => {
      invokeLoad()
    })
  }

  if (reloadOnActivated) {
    onActivated(() => {
      if (skipFirstActivated) {
        skipFirstActivated = false
        return
      }
      invokeLoad()
    })
  }

  return {
    reload: guardedReload,
    getLoadGeneration: () => sequenced.getGeneration(),
  }
}
