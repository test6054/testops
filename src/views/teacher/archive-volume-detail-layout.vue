<template>
  <div class="archive-volume-detail-layout">
    <header
      class="archive-volume-detail-layout__header"
      :class="{ 'archive-volume-detail-layout__header--collapsed': sidebarCollapsed }"
    >
      <div class="archive-volume-detail-layout__logo" @click="goArchiveList">
        <img alt="logo" class="archive-volume-detail-layout__logo-img" src="/logo.svg" />
        <span class="archive-volume-detail-layout__logo-title">{{ appTitle }}</span>
      </div>
      <div v-if="volumeId" class="archive-volume-detail-layout__header-toolbar">
        <UiButton
          class="archive-volume-detail-layout__menu-toggle"
          variant="outline"
          size="sm"
          @click="mobileNavOpen = true"
        >
          <template #icon><MenuOutlined /></template>
          <span class="archive-volume-detail-layout__menu-toggle-text">{{ activeTabLabel }}</span>
        </UiButton>
        <div class="archive-volume-detail-layout__header-switcher">
          <ArchiveVolumeSwitcher
            :selected-volume-id="volumeId"
            :options="volumeSwitcherOptions"
            :loading="volumeSelectorLoading"
            @change="onVolumeSwitch"
            @search="onVolumeSearch"
          />
        </div>
      </div>
      <div class="archive-volume-detail-layout__header-gap" />
      <HeaderRightBar variant="workbench" class="archive-volume-detail-layout__header-right" />
    </header>

    <div class="archive-volume-detail-layout__body">
      <div
        v-if="volumeId && mobileNavOpen"
        class="archive-volume-detail-layout__backdrop"
        @click="mobileNavOpen = false"
      />

      <ArchiveVolumeSubSidebar
        v-if="volumeId"
        :archive-title="sidebarArchiveTitle"
        :archive-no="sidebarArchiveNo"
        :archive-context-line="sidebarContextLine"
        :volume-status-label="volumeStatusLabel"
        :volume-status-tone="volumeStatusTone"
        :active-tab="activeTab"
        :nav-groups="sidebarNavGroups"
        :manage-actions="sidebarManageActions"
        :loading="loading"
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileNavOpen"
        @tab-change="onTabChange"
        @journey-select="onJourneySelect"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
        @manage-action="onManageAction"
      />

      <main class="archive-volume-detail-layout__main">
        <div class="archive-volume-detail-layout__content">
          <WorkbenchContextGateStrip
            v-if="!volumeId"
            tag="缺少上下文"
            body="缺少归档任务上下文，请从归档列表进入"
            cta-label="返回归档列表"
            list-route-name="TeacherArchiveVolumeList"
            class="archive-volume-detail-layout__empty"
          />

          <router-view v-else v-slot="{ Component: ViewComponent, route: childRoute }">
            <keep-alive v-if="ViewComponent && shouldCacheDetailRoute(childRoute)">
              <component :is="ViewComponent" :key="childRoute.fullPath" />
            </keep-alive>
            <component v-else-if="ViewComponent" :is="ViewComponent" :key="childRoute.fullPath" />
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { RouteLocationNormalized } from 'vue-router'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ArchiveVolumeSwitcherOption } from '@/components/workbench/ArchiveVolumeSwitcher.vue'
import type {
  ArchiveVolumeManageActionKey,
  ArchiveVolumeSidebarManageAction,
} from '@/composables/useArchiveVolumeWorkbenchContext'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_VOLUME_STATUS_TONE,
  ArchiveVolumeStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import ArchiveVolumeSubSidebar from '@/components/workbench/ArchiveVolumeSubSidebar.vue'
import ArchiveVolumeSwitcher from '@/components/workbench/ArchiveVolumeSwitcher.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { useArchiveVolumeSelector } from '@/composables/useArchiveVolumeSelector'
import { provideArchiveVolumeWorkbenchContext } from '@/composables/useArchiveVolumeWorkbenchContext'
import HeaderRightBar from '@/layout/components/HeaderRightBar/index.vue'
import { useAppStore } from '@/stores/modules/app'
import { ArchiveVolumeStatusCode } from '@/types/enums/archive-volume-status-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import {
  formatArchiveVolumeOptionLabel,
} from '@/utils/archive-volume-option'
import {
  buildArchiveVolumeSidebarNavGroups,
  resolveArchiveVolumeJourneyLandingTab,
} from '@/utils/archive-volume-sidebar-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeDetailLayout' })

const router = useRouter()
const appStore = useAppStore()
const appTitle = computed(() => appStore.getTitle())

const sidebarCollapsed = ref(false)
const mobileNavOpen = ref(false)

const { volumeId, detail, loading, detailLoadError, activeTab, sidebarTabs, setActiveTab, requestManageAction }
  = provideArchiveVolumeWorkbenchContext()

const {
  volumes,
  volumeOptions,
  loading: selectorLoading,
  searching: selectorSearching,
  resolvingPinned: selectorResolvingPinned,
  onVolumeSearch,
  pinFromVolume,
  init: initVolumeSelector,
} = useArchiveVolumeSelector({
  currentVolumeId: () => volumeId.value,
})

const volumeSelectorLoading = computed(
  () => selectorLoading.value || selectorSearching.value || selectorResolvingPinned.value,
)

onMounted(() => {
  void initVolumeSelector()
})

watch(
  () => detail.value?.volume,
  (volume) => {
    if (volume) {
      pinFromVolume(volume)
    }
  },
  { immediate: true },
)

const sidebarArchiveTitle = computed(() => {
  const volume = detail.value?.volume
  if (volume) {
    return volume.archiveTitle || volume.archiveNo
  }
  if (detailLoadError.value) {
    return '归档任务加载失败'
  }
  return loading.value ? '加载归档任务…' : '归档任务'
})

const sidebarArchiveNo = computed(() => detail.value?.volume.archiveNo ?? volumeId.value)

const sidebarContextLine = computed(() => {
  const volume = detail.value?.volume
  if (!volume) {
    return ''
  }
  const parts: string[] = []
  if (volume.courseName) {
    parts.push(volume.courseName)
  } else if (volume.teachingClassName) {
    parts.push(volume.teachingClassName)
  } else if (volume.departmentName) {
    parts.push(volume.departmentName)
  }
  if (volume.academicYear || volume.semester) {
    const term = [volume.academicYear, formatSemester(volume.semester)].filter(Boolean).join(' ')
    if (term) {
      parts.push(term)
    }
  }
  return parts.join(' · ')
})

const volumeStatusLabel = computed(() => {
  const status = detail.value?.volume.volumeStatus
  if (!status) {
    return ''
  }
  return strictEnumLabel(ArchiveVolumeStatusDescription, status, 'volumeStatus')
})

const volumeStatusTone = computed((): BadgeTone => {
  const status = detail.value?.volume.volumeStatus
  if (!status) {
    return 'gray'
  }
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, status, 'volumeStatus')
})

const sidebarNavGroups = computed(() =>
  buildArchiveVolumeSidebarNavGroups(
    sidebarTabs.value,
    detail.value?.volume.volumeStatus,
    detail.value?.capabilities?.departmentReviewEnabled,
  ),
)

/** 页签型收材准备入口走侧栏导航；此处仅保留非页签操作。 */
const sidebarManageActions = computed((): ArchiveVolumeSidebarManageAction[] => {
  const caps = detail.value?.capabilities
  if (!caps) {
    return []
  }
  const actions: ArchiveVolumeSidebarManageAction[] = []
  const status = detail.value?.volume.volumeStatus
  if (status === ArchiveVolumeStatusCode.SUBMITTED || status === ArchiveVolumeStatusCode.STORED) {
    actions.push({ key: 'export', label: '导出 manifest' })
  }
  if (caps.canRejectCollection === true) {
    actions.push({ key: 'reject', label: '驳回收材', danger: true })
  }
  return actions
})

function onManageAction(key: ArchiveVolumeManageActionKey): void {
  mobileNavOpen.value = false
  requestManageAction(key)
}

const activeTabLabel = computed(() => {
  for (const group of sidebarNavGroups.value) {
    const tab = group.tabs.find((item) => item.key === activeTab.value)
    if (tab) {
      return tab.label
    }
  }
  const fallback = sidebarTabs.value.find((item) => item.key === activeTab.value)
  return fallback?.label ?? '归档阶段'
})

function toVolumeSwitcherOption(volume: {
  volumeId: string
  archiveTitle: string
  archiveNo: string
  volumeStatus?: ArchiveVolumeStatusCode
}): ArchiveVolumeSwitcherOption {
  const status = volume.volumeStatus
  return {
    value: volume.volumeId,
    label: formatArchiveVolumeOptionLabel(volume),
    statusLabel: status
      ? strictEnumLabel(ArchiveVolumeStatusDescription, status, 'volumeStatus')
      : undefined,
    statusTone: status
      ? strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, status, 'volumeStatus')
      : undefined,
  }
}

const volumeSwitcherOptions = computed<ArchiveVolumeSwitcherOption[]>(() => {
  const merged = new Map<string, ArchiveVolumeSwitcherOption>()
  for (const item of volumes.value) {
    merged.set(item.volumeId, toVolumeSwitcherOption(item))
  }
  if (detail.value?.volume) {
    merged.set(detail.value.volume.volumeId, toVolumeSwitcherOption(detail.value.volume))
  }
  for (const item of volumeOptions.value) {
    if (!merged.has(item.value)) {
      merged.set(item.value, { ...item })
    }
  }
  return Array.from(merged.values())
})

function goArchiveList(): void {
  mobileNavOpen.value = false
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function onVolumeSwitch(value: SelectValue): void {
  const nextVolumeId = value != null ? String(value) : ''
  if (!nextVolumeId || nextVolumeId === volumeId.value) {
    return
  }
  mobileNavOpen.value = false
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: nextVolumeId },
    query: activeTab.value ? { tab: activeTab.value } : undefined,
  })
}

function onTabChange(tabKey: string): void {
  mobileNavOpen.value = false
  setActiveTab(tabKey)
}

function onJourneySelect(journeyKey: string): void {
  const group = sidebarNavGroups.value.find((item) => item.key === journeyKey)
  const landingTab = resolveArchiveVolumeJourneyLandingTab(group)
  if (!landingTab) {
    return
  }
  mobileNavOpen.value = false
  setActiveTab(landingTab)
}

function shouldCacheDetailRoute(childRoute: RouteLocationNormalized): boolean {
  if (childRoute.meta.noCache === true) {
    return false
  }
  return childRoute.meta.keepAlive === true
}

watch(volumeId, () => {
  mobileNavOpen.value = false
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.archive-volume-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--dp-bg-layout);

  &__header {
    --sidebar-width: 260px;
    display: grid;
    grid-template-columns: var(--sidebar-width) auto minmax(0, 1fr) auto;
    align-items: center;
    height: 56px;
    padding: 0 24px 0 0;
    background: var(--dp-bg-container);
    border-bottom: 1px solid var(--dp-border-subtle);
    flex-shrink: 0;

    &--collapsed {
      --sidebar-width: 64px;

      .archive-volume-detail-layout__logo-title {
        display: none;
      }
    }
  }

  &__logo {
    grid-column: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    width: var(--sidebar-width);
    flex-shrink: 0;
    padding-left: 24px;
    cursor: pointer;
    min-width: 0;
  }

  &__logo-img {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  &__logo-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__header-toolbar {
    grid-column: 2;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__header-switcher {
    width: 320px;
    max-width: 360px;
    min-width: 0;
    flex-shrink: 0;
  }

  &__menu-toggle {
    display: none;
    flex-shrink: 0;
  }

  &__menu-toggle-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__backdrop {
    display: none;
  }

  &__header-gap {
    grid-column: 3;
    min-width: 0;
  }

  &__header-right {
    grid-column: 4;
    margin-left: 16px;
    flex-shrink: 0;
    min-width: 0;
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--dp-bg-layout);
  }

  &__content {
    flex: 1;
    overflow: auto;
    padding: var(--dp-space-3);
    background: var(--dp-bg-layout);

    :deep(> *) {
      max-width: min(100%, 1680px);
      margin: 0 auto;
    }
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  @media (max-width: bp.$layout-mobile-max) {
    &__header {
      grid-template-columns: auto minmax(0, 1fr) auto;
      padding: 0 16px;
    }

    &__logo {
      grid-column: 1;
      width: auto;
      padding-left: 0;
    }

    &__logo-title {
      display: none;
    }

    &__header-toolbar {
      grid-column: 2;
      min-width: 0;
    }

    &__header-switcher {
      width: auto;
      max-width: none;
      flex: 1;
    }

    &__header-gap {
      display: none;
    }

    &__header-right {
      grid-column: 3;
      margin-left: 8px;
    }

    &__menu-toggle {
      display: inline-flex;
    }

    &__backdrop {
      display: block;
      position: fixed;
      inset: 56px 0 0;
      z-index: 190;
      background: rgb(0 0 0 / 35%);
    }
  }
}
</style>
