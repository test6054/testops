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
        <div v-if="volumeHeaderLine" class="archive-volume-detail-layout__volume-pill">
          <UiTag tone="blue" size="sm">{{ volumeHeaderLine }}</UiTag>
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
        :archive-subtitle="sidebarArchiveSubtitle"
        :volume-status-tone="volumeStatusTone"
        :active-tab="activeTab"
        :nav-groups="sidebarNavGroups"
        :status-rows="sidebarStatusRows"
        :loading="loading"
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileNavOpen"
        @tab-change="onTabChange"
        @back-to-list="goArchiveList"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
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
import type { RouteLocationNormalized } from 'vue-router'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_VOLUME_STATUS_TONE,
  ArchiveIntegrityStatusDescription,
  ArchiveTransferStatusDescription,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ArchiveVolumeSubSidebar from '@/components/workbench/ArchiveVolumeSubSidebar.vue'
import { provideArchiveVolumeWorkbenchContext } from '@/composables/useArchiveVolumeWorkbenchContext'
import HeaderRightBar from '@/layout/components/HeaderRightBar/index.vue'
import { useAppStore } from '@/stores/modules/app'
import { buildArchiveVolumeSidebarNavGroups } from '@/utils/archive-volume-sidebar-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeDetailLayout' })

const router = useRouter()
const appStore = useAppStore()
const appTitle = computed(() => appStore.getTitle())

const sidebarCollapsed = ref(false)
const mobileNavOpen = ref(false)

const { volumeId, detail, loading, activeTab, sidebarTabs, setActiveTab }
  = provideArchiveVolumeWorkbenchContext()

const sidebarArchiveTitle = computed(() => {
  const volume = detail.value?.volume
  if (!volume) {
    return '加载归档任务…'
  }
  return volume.archiveTitle || volume.archiveNo
})

const sidebarArchiveSubtitle = computed(() => {
  const volume = detail.value?.volume
  if (!volume) {
    return volumeId.value
  }
  const parts = [volume.archiveNo]
  if (volume.teachingClassName) {
    parts.push(volume.teachingClassName)
  } else if (volume.departmentName) {
    parts.push(volume.departmentName)
  }
  return parts.join(' · ')
})

const volumeHeaderLine = computed(() => detail.value?.volume.archiveNo ?? '')

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

const sidebarStatusRows = computed(() => {
  const volume = detail.value?.volume
  if (!volume) {
    return []
  }
  const retention = volume.permanentRetention
    ? '永久保管'
    : volume.retentionYears
      ? `${volume.retentionYears} 年`
      : '—'
  const location
    = volume.physicalStorageLocation
      || [volume.physicalBuilding, volume.physicalRoom, volume.physicalCabinet, volume.physicalSlot]
      .filter(Boolean)
      .join(' / ')
      || volume.physicalLocationNote
      || '—'
  return [
    {
      key: 'integrity',
      label: '完整性',
      value: strictEnumLabel(
        ArchiveIntegrityStatusDescription,
        volume.integrityStatus,
        'integrityStatus',
      ),
    },
    ...(volume.securityLevel
      ? [
          {
            key: 'security-mark',
            label: '密级定密',
            value: volume.securityMarkPending ? '待确认' : '已确认',
          },
        ]
      : []),
    {
      key: 'transfer',
      label: '移交',
      value: strictEnumLabel(
        ArchiveTransferStatusDescription,
        volume.transferStatus,
        'transferStatus',
      ),
    },
    {
      key: 'retention',
      label: '保管期限',
      value: retention,
    },
    {
      key: 'location',
      label: '存放位置',
      value: location,
    },
  ]
})

function goArchiveList(): void {
  mobileNavOpen.value = false
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function onTabChange(tabKey: string): void {
  mobileNavOpen.value = false
  setActiveTab(tabKey)
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

  &__volume-pill {
    min-width: 0;
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
    background: var(--dp-gray-50);

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
