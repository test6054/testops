import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type {
  ArchiveVolumeDetailResponse,
  ArchiveVolumeNavChainStepVO,
  ArchiveVolumeNextStepActionVO,
} from '@/apis/mark/archive-volume'
import { computed, inject, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArchiveVolumeDetail } from '@/apis/mark/archive-volume'
import {
  ARCHIVE_VOLUME_DETAIL_SECTION_TABS,
  ARCHIVE_VOLUME_DETAIL_TAB_KEYS,
} from '@/constants/archive-volume-detail-tabs'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'

export interface ArchiveVolumeSidebarTab {
  key: string
  label: string
  chainStatus?: ArchiveVolumeNavChainStepVO['chainStatus']
  badge?: number
}

export interface ArchiveVolumeWorkbenchContext {
  volumeId: ComputedRef<string>
  detail: Ref<ArchiveVolumeDetailResponse | null>
  loading: Ref<boolean>
  activeTab: Ref<string>
  sidebarTabs: ComputedRef<ArchiveVolumeSidebarTab[]>
  navigationChainSteps: ComputedRef<ArchiveVolumeNavChainStepVO[]>
  navigationFlowChainSteps: ComputedRef<ArchiveVolumeNavChainStepVO[]>
  nextStepActions: ComputedRef<ArchiveVolumeNextStepActionVO[]>
  setActiveTab: (tabKey: string) => void
  loadDetail: (options?: { silent?: boolean }) => Promise<void>
  syncActiveTabFromNavigation: (options?: { preserveUserTab?: boolean }) => void
}

export const ARCHIVE_VOLUME_WORKBENCH_CONTEXT_KEY: InjectionKey<ArchiveVolumeWorkbenchContext>
  = Symbol('archiveVolumeWorkbenchContext')

export function provideArchiveVolumeWorkbenchContext(): ArchiveVolumeWorkbenchContext {
  const route = useRoute()
  const router = useRouter()

  const volumeId = computed(() => String(route.params.volumeId ?? ''))
  const detail = ref<ArchiveVolumeDetailResponse | null>(null)
  const loading = ref(true)
  const activeTab = ref<string>('materials')
  let loadDetailGeneration = 0
  let silentRefreshFailureCount = 0
  const SILENT_REFRESH_FAILURE_THRESHOLD = 2

  const navigationChainSteps = computed(() => detail.value?.navigationSummary?.chainSteps ?? [])
  const navigationFlowChainSteps = computed(
    () => detail.value?.navigationSummary?.flowChainSteps ?? [],
  )
  const nextStepActions = computed(() => detail.value?.navigationSummary?.nextStepActions ?? [])

  const sidebarTabs = computed((): ArchiveVolumeSidebarTab[] => {
    const chain = navigationChainSteps.value
    if (chain.length) {
      return chain.map((step) => ({
        key: step.tabKey,
        label: step.label,
        chainStatus: step.chainStatus,
        badge: step.badgeCount && step.badgeCount > 0 ? step.badgeCount : undefined,
      }))
    }
    return ARCHIVE_VOLUME_DETAIL_SECTION_TABS.map((item) => ({
      key: item.key,
      label: item.label,
    }))
  })

  function isValidDetailTab(tabKey: string): boolean {
    if (ARCHIVE_VOLUME_DETAIL_SECTION_TABS.some((item) => item.key === tabKey)) {
      return true
    }
    return navigationChainSteps.value.some((step) => step.tabKey === tabKey)
  }

  function syncActiveTabFromNavigation(options?: { preserveUserTab?: boolean }): void {
    const raw = route.query.tab
    if (typeof raw === 'string' && isValidDetailTab(raw)) {
      activeTab.value = raw
      return
    }
    if (options?.preserveUserTab && isValidDetailTab(activeTab.value)) {
      return
    }
    const suggested = detail.value?.navigationSummary?.suggestedTabKey
    if (suggested && isValidDetailTab(suggested)) {
      activeTab.value = suggested
    }
  }

  function resolveInitialTab(): void {
    const raw = route.query.tab
    if (typeof raw !== 'string') {
      return
    }
    const matchedTab = ARCHIVE_VOLUME_DETAIL_TAB_KEYS.find((tabKey) => tabKey === raw)
    if (matchedTab) {
      activeTab.value = matchedTab
    }
  }

  function setActiveTab(tabKey: string): void {
    if (!isValidDetailTab(tabKey)) {
      return
    }
    activeTab.value = tabKey
    void router.replace({
      path: route.path,
      query: { ...route.query, tab: tabKey },
    })
  }

  async function loadDetail(options?: { silent?: boolean }): Promise<void> {
    if (!volumeId.value) {
      showUserError(new Error('缺少归档卷 ID'), '缺少归档卷 ID')
      loading.value = false
      return
    }
    const loadGeneration = ++loadDetailGeneration
    if (!options?.silent) {
      loading.value = true
    }
    try {
      const nextDetail = await getArchiveVolumeDetail(volumeId.value)
      if (loadGeneration !== loadDetailGeneration) {
        return
      }
      detail.value = nextDetail
      silentRefreshFailureCount = 0
      syncActiveTabFromNavigation({ preserveUserTab: options?.silent === true })
    } catch (error) {
      if (loadGeneration !== loadDetailGeneration) {
        return
      }
      if (!options?.silent) {
        showUserError(error, getUserErrorMessage(error, '加载归档卷详情失败'))
        detail.value = null
      } else {
        silentRefreshFailureCount += 1
        if (silentRefreshFailureCount >= SILENT_REFRESH_FAILURE_THRESHOLD) {
          showUserError(error, getUserErrorMessage(error, '归档卷材料状态刷新失败'))
        }
      }
    } finally {
      if (loadGeneration === loadDetailGeneration) {
        loading.value = false
      }
    }
  }

  resolveInitialTab()

  watch(
    () => route.query.tab,
    (raw) => {
      if (typeof raw === 'string' && isValidDetailTab(raw)) {
        activeTab.value = raw
      }
    },
  )

  watch(
    volumeId,
    (id) => {
      if (id) {
        void loadDetail()
      }
    },
    { immediate: true },
  )

  const context: ArchiveVolumeWorkbenchContext = {
    volumeId,
    detail,
    loading,
    activeTab,
    sidebarTabs,
    navigationChainSteps,
    navigationFlowChainSteps,
    nextStepActions,
    setActiveTab,
    loadDetail,
    syncActiveTabFromNavigation,
  }

  provide(ARCHIVE_VOLUME_WORKBENCH_CONTEXT_KEY, context)
  return context
}

export function useArchiveVolumeWorkbenchContext(): ArchiveVolumeWorkbenchContext {
  const context = inject(ARCHIVE_VOLUME_WORKBENCH_CONTEXT_KEY, null)
  if (!context) {
    throw new Error(
      'useArchiveVolumeWorkbenchContext 必须在 archive-volume-detail-layout 子树内使用',
    )
  }
  return context
}

export function useArchiveVolumeId(): { volumeId: ComputedRef<string> } {
  const injected = inject(ARCHIVE_VOLUME_WORKBENCH_CONTEXT_KEY, null)
  if (injected) {
    return { volumeId: injected.volumeId }
  }
  const route = useRoute()
  const volumeId = computed(() => String(route.params.volumeId ?? ''))
  return { volumeId }
}
