import { computed, inject, onActivated, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioLayoutScopeProvidedKey } from '@/composables/portfolio-layout-context'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { usePortfolioStore } from '@/stores/modules/portfolio'

/** 解析当前页应使用的目标教师 ID（store > query > 本人默认） */
export function usePortfolioPageScope() {
  const route = useRoute()
  const portfolioStore = usePortfolioStore()
  const layoutScopeProvided = inject(portfolioLayoutScopeProvidedKey, undefined)
  const { canPickTeachers, resolveDefaultTeacherId, currentUserId } = usePortfolioTeacherAccess()

  const queryTeacherId = computed(() =>
    typeof route.query.teacherId === 'string' ? route.query.teacherId : '')

  const targetTeacherId = computed(() => {
    if (portfolioStore.currentTeacherId) {
      return portfolioStore.currentTeacherId
    }
    const queryId = queryTeacherId.value
    if (queryId) {
      if (canPickTeachers.value) {
        return queryId
      }
      if (queryId === currentUserId.value) {
        return queryId
      }
      return resolveDefaultTeacherId()
    }
    return resolveDefaultTeacherId()
  })

  const scopeTeacherIdFromUrlRejected = computed(() =>
    Boolean(queryTeacherId.value && targetTeacherId.value !== queryTeacherId.value))

  const scopeReady = computed(() => !canPickTeachers.value || Boolean(targetTeacherId.value))

  const showPageScopeHeader = !layoutScopeProvided?.value

  return {
    targetTeacherId,
    scopeReady,
    scopeTeacherIdFromUrlRejected,
    canPickTeachers,
    currentUserId,
    showPageScopeHeader,
    portfolioStore,
  }
}

/** 教师范围切换后自动刷新页面数据（含 keepAlive） */
export function usePortfolioScopeReload(reloadFn: () => void | Promise<void>) {
  const portfolioStore = usePortfolioStore()
  watch(
    () => portfolioStore.scopeChangeEpoch,
    () => {
      void reloadFn()
    },
  )
}

export interface PortfolioScopedLoaderOptions {
  watchScope?: boolean
  immediate?: boolean
  reloadOnActivated?: boolean
}

/**
 * 档案袋教师页统一加载：监听 scopeChangeEpoch 与 targetTeacherId。
 */
export function usePortfolioScopedLoader(
  loadFn: () => void | Promise<void>,
  getTeacherId: () => string,
  options?: PortfolioScopedLoaderOptions,
) {
  const portfolioStore = usePortfolioStore()
  const watchScope = options?.watchScope ?? true
  const immediate = options?.immediate ?? true
  const reloadOnActivated = options?.reloadOnActivated ?? true

  function guardedReload(): void {
    void loadFn()
  }

  if (watchScope) {
    watch(
      () => [portfolioStore.scopeChangeEpoch, getTeacherId()],
      () => {
        guardedReload()
      },
      { immediate },
    )
  }
  else if (immediate) {
    onMounted(guardedReload)
  }

  if (reloadOnActivated) {
    onActivated(guardedReload)
  }
}
