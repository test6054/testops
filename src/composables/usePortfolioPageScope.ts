import { computed, onActivated, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { usePortfolioStore } from '@/stores/modules/portfolio'

/** 解析当前页应使用的目标教师 ID（授权 URL 深链 > store > 本人默认）。 */
export function usePortfolioPageScope() {
  const route = useRoute()
  const portfolioStore = usePortfolioStore()
  const { accessScope } = usePortfolioReviewAccess()
  const { canPickTeachers, canReviewPortfolio, resolveDefaultTeacherId, currentUserId } = usePortfolioTeacherAccess()

  const queryTeacherId = computed(() =>
    typeof route.query.teacherId === 'string' ? route.query.teacherId : '')

  /** 非选人角色深链他人时，须等 access-scope 落地后再判定是否授权 */
  const reviewAccessPendingForDeepLink = computed(() => {
    const queryId = queryTeacherId.value
    if (!queryId || queryId === currentUserId.value || canPickTeachers.value) {
      return false
    }
    return accessScope.value === null && !canReviewPortfolio.value
  })

  const targetTeacherId = computed(() => {
    const queryId = queryTeacherId.value
    if (queryId) {
      if (canPickTeachers.value || canReviewPortfolio.value) {
        return queryId
      }
      if (queryId === currentUserId.value) {
        return queryId
      }
      if (reviewAccessPendingForDeepLink.value) {
        return queryId
      }
      return resolveDefaultTeacherId()
    }
    if (portfolioStore.currentTeacherId) {
      return portfolioStore.currentTeacherId
    }
    return resolveDefaultTeacherId()
  })

  const scopeTeacherIdFromUrlRejected = computed(() =>
    Boolean(
      queryTeacherId.value
      && !reviewAccessPendingForDeepLink.value
      && targetTeacherId.value !== queryTeacherId.value,
    ))

  /**
   * 可挑选教师时必须已选定目标；URL 被拒绝或审核权限未就绪时 scope 未就绪。
   * 本人页在默认教师可解析后即就绪。
   */
  const scopeReady = computed(() => {
    if (reviewAccessPendingForDeepLink.value || scopeTeacherIdFromUrlRejected.value) {
      return false
    }
    if (canPickTeachers.value) {
      return Boolean(targetTeacherId.value)
    }
    return Boolean(targetTeacherId.value)
  })

  // 深链 teacherId 在页面 setup 即同步 store，避免 Header onMounted 前子页按旧 store 拉取
  watch(
    [queryTeacherId, canPickTeachers, canReviewPortfolio, currentUserId, reviewAccessPendingForDeepLink],
    () => {
      const queryId = queryTeacherId.value
      if (reviewAccessPendingForDeepLink.value) {
        return
      }
      if (queryId && (canPickTeachers.value || canReviewPortfolio.value)) {
        if (portfolioStore.currentTeacherId !== queryId) {
          portfolioStore.setTeacher(queryId)
        }
        return
      }
      if (
        queryId
        && queryId === currentUserId.value
        && portfolioStore.currentTeacherId !== queryId
      ) {
        portfolioStore.setTeacher(queryId)
      }
    },
    { immediate: true },
  )

  return {
    targetTeacherId,
    scopeReady,
    scopeTeacherIdFromUrlRejected,
    canPickTeachers,
    canReviewPortfolio,
    currentUserId,
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
  /** 为 false 时跳过本次 reload（如 scope 未就绪） */
  isReady?: () => boolean
}

/** 单次 scope 读取令牌：await 后校验 epoch + teacherId */
export interface PortfolioScopeRequestToken {
  teacherId: string
  epoch: number
  isStale: () => boolean
}

/** 捕获当前档案袋教师 scope，供列表/汇总并发请求丢弃过期响应 */
export function beginPortfolioScopeRequest(getTeacherId: () => string): PortfolioScopeRequestToken {
  const portfolioStore = usePortfolioStore()
  const teacherId = getTeacherId()
  const epoch = portfolioStore.scopeChangeEpoch
  return {
    teacherId,
    epoch,
    isStale: () =>
      portfolioStore.scopeChangeEpoch !== epoch || getTeacherId() !== teacherId,
  }
}

/**
 * 档案袋教师页统一加载：监听 scopeChangeEpoch 与 targetTeacherId。
 * 返回 reloadGeneration，页内可与 beginPortfolioScopeRequest 联用丢弃旧响应。
 */
export function usePortfolioScopedLoader(
  loadFn: () => void | boolean | PromiseLike<void | boolean | unknown>,
  getTeacherId: () => string,
  options?: PortfolioScopedLoaderOptions,
) {
  const portfolioStore = usePortfolioStore()
  const watchScope = options?.watchScope ?? true
  const immediate = options?.immediate ?? true
  const reloadOnActivated = options?.reloadOnActivated ?? true
  let reloadGeneration = 0

  function guardedReload(): void {
    if (options?.isReady && !options.isReady()) {
      return
    }
    reloadGeneration += 1
    void loadFn()
  }

  if (watchScope) {
    watch(
      () => [
        portfolioStore.scopeChangeEpoch,
        getTeacherId(),
        options?.isReady ? options.isReady() : true,
      ],
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

  return {
    reload: guardedReload,
    getReloadGeneration: () => reloadGeneration,
  }
}
