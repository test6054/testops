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
  ArchiveVolumeDetailTabDescription,
  ArchiveVolumeDetailTabKey,
} from '@/constants/archive-volume-detail-tabs'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

export interface ArchiveVolumeSidebarTab {
  key: string
  label: string
  chainStatus?: ArchiveVolumeNavChainStepVO['chainStatus']
  badge?: number
}

/** 侧栏「其他操作」：导出 / 驳回（页签型卷务入口走 setActiveTab） */
export type ArchiveVolumeManageActionKey = 'export' | 'reject'

export interface ArchiveVolumeSidebarManageAction {
  key: ArchiveVolumeManageActionKey
  label: string
  danger?: boolean
}

export interface ArchiveVolumeWorkbenchContext {
  volumeId: ComputedRef<string>
  detail: Ref<ArchiveVolumeDetailResponse | null>
  loading: Ref<boolean>
  /** 首次加载失败时的用户可见原因；成功后清空。有详情时的刷新失败不写此字段。 */
  detailLoadError: Ref<string | null>
  activeTab: Ref<string>
  sidebarTabs: ComputedRef<ArchiveVolumeSidebarTab[]>
  navigationChainSteps: ComputedRef<ArchiveVolumeNavChainStepVO[]>
  navigationFlowChainSteps: ComputedRef<ArchiveVolumeNavChainStepVO[]>
  nextStepActions: ComputedRef<ArchiveVolumeNextStepActionVO[]>
  setActiveTab: (tabKey: string) => void
  loadDetail: (options?: { silent?: boolean }) => Promise<void>
  syncActiveTabFromNavigation: (options?: { preserveUserTab?: boolean }) => void
  /** 侧栏其他操作：导出 manifest / 驳回收材 */
  requestManageAction: (key: ArchiveVolumeManageActionKey) => void
  manageActionTick: Ref<{ key: ArchiveVolumeManageActionKey, seq: number } | null>
}

export const ARCHIVE_VOLUME_WORKBENCH_CONTEXT_KEY: InjectionKey<ArchiveVolumeWorkbenchContext>
  = Symbol('archiveVolumeWorkbenchContext')

export function provideArchiveVolumeWorkbenchContext(): ArchiveVolumeWorkbenchContext {
  const route = useRoute()
  const router = useRouter()

  const volumeId = computed(() => String(route.params.volumeId ?? ''))
  const detail = ref<ArchiveVolumeDetailResponse | null>(null)
  const loading = ref(true)
  const detailLoadError = ref<string | null>(null)
  const activeTab = ref<string>('materials')
  let loadDetailGeneration = 0
  let silentRefreshFailureCount = 0
  const SILENT_REFRESH_FAILURE_THRESHOLD = 2

  const navigationChainSteps = computed(() => detail.value?.navigationSummary?.chainSteps ?? [])
  const navigationFlowChainSteps = computed(
    () => detail.value?.navigationSummary?.flowChainSteps ?? [],
  )
  const nextStepActions = computed(() => detail.value?.navigationSummary?.nextStepActions ?? [])

  const manageSidebarTabs = computed((): ArchiveVolumeSidebarTab[] => {
    const tabs: ArchiveVolumeSidebarTab[] = [
      {
        key: ArchiveVolumeDetailTabKey.TASK_SETTINGS,
        label: strictEnumLabel(
          ArchiveVolumeDetailTabDescription,
          ArchiveVolumeDetailTabKey.TASK_SETTINGS,
          '归档卷详情页签',
        ),
      },
      {
        key: ArchiveVolumeDetailTabKey.COLLABORATORS,
        label: strictEnumLabel(
          ArchiveVolumeDetailTabDescription,
          ArchiveVolumeDetailTabKey.COLLABORATORS,
          '归档卷详情页签',
        ),
      },
    ]
    const status = detail.value?.volume.volumeStatus
    const canStart = detail.value?.capabilities?.canStartCollecting === true
    if (status === ArchiveVolumeStatusCode.DRAFT || canStart) {
      tabs.push({
        key: ArchiveVolumeDetailTabKey.START_COLLECTING,
        label: strictEnumLabel(
          ArchiveVolumeDetailTabDescription,
          ArchiveVolumeDetailTabKey.START_COLLECTING,
          '归档卷详情页签',
        ),
      })
    }
    return tabs
  })

  const sidebarTabs = computed((): ArchiveVolumeSidebarTab[] => {
    const manageTabs = manageSidebarTabs.value
    const chain = navigationChainSteps.value
    if (chain.length) {
      return [
        ...manageTabs,
        { key: 'ocr-search', label: '卷内检索' },
        ...chain.map((step) => ({
          key: step.tabKey,
          label: step.label,
          chainStatus: step.chainStatus,
          badge: step.badgeCount && step.badgeCount > 0 ? step.badgeCount : undefined,
        })),
      ]
    }
    const sectionTabs = ARCHIVE_VOLUME_DETAIL_SECTION_TABS
      .filter((item) => !manageTabs.some((tab) => tab.key === item.key))
      .map((item) => ({
        key: item.key,
        label: item.label,
      }))
    return [...manageTabs, ...sectionTabs]
  })

  function isValidDetailTab(tabKey: string): boolean {
    if (ARCHIVE_VOLUME_DETAIL_SECTION_TABS.some((item) => item.key === tabKey)) {
      return true
    }
    if (manageSidebarTabs.value.some((item) => item.key === tabKey)) {
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
      detailLoadError.value = '缺少归档任务编号'
      loading.value = false
      return
    }
    const loadGeneration = ++loadDetailGeneration
    if (!options?.silent) {
      loading.value = true
      if (!detail.value) {
        detailLoadError.value = null
      }
    }
    try {
      // 页级失败由主区错误面板承接，避免与右上角 Message 重复打扰
      const nextDetail = await getArchiveVolumeDetail(volumeId.value, {
        showErrorMessage: false,
      })
      if (loadGeneration !== loadDetailGeneration) {
        return
      }
      detail.value = nextDetail
      detailLoadError.value = null
      silentRefreshFailureCount = 0
      syncActiveTabFromNavigation({ preserveUserTab: options?.silent === true })
    } catch (error) {
      if (loadGeneration !== loadDetailGeneration) {
        return
      }
      const userMessage = getUserErrorMessage(error, '加载归档任务详情失败')
      if (!options?.silent) {
        if (detail.value) {
          showUserError(error, '刷新归档任务失败')
        } else {
          detailLoadError.value = userMessage
        }
      } else {
        silentRefreshFailureCount += 1
        if (silentRefreshFailureCount >= SILENT_REFRESH_FAILURE_THRESHOLD) {
          showUserError(error, getUserErrorMessage(error, '归档任务材料状态刷新失败'))
        }
      }
    } finally {
      if (loadGeneration === loadDetailGeneration) {
        loading.value = false
      }
    }
  }

  resolveInitialTab()

  const manageActionTick = ref<{ key: ArchiveVolumeManageActionKey, seq: number } | null>(null)
  let manageActionSeq = 0

  function requestManageAction(key: ArchiveVolumeManageActionKey): void {
    manageActionSeq += 1
    manageActionTick.value = { key, seq: manageActionSeq }
  }

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
    detailLoadError,
    activeTab,
    sidebarTabs,
    navigationChainSteps,
    navigationFlowChainSteps,
    nextStepActions,
    setActiveTab,
    loadDetail,
    syncActiveTabFromNavigation,
    requestManageAction,
    manageActionTick,
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
