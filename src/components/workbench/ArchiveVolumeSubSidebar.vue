<template>
  <aside
    class="archive-volume-sub-sidebar"
    :class="{
      'archive-volume-sub-sidebar--collapsed': collapsed && !mobileOpen,
      'archive-volume-sub-sidebar--mobile-open': mobileOpen,
    }"
  >
    <div v-if="!collapsed" class="archive-volume-sub-sidebar__exam-switch">
      <ExamSidebarExamSwitch
        :exam-display-name="archiveTitle"
        :exam-display-no="archiveNo"
        :exam-context-line="archiveContextLine"
        :exam-status-label="volumeStatusLabel"
        :exam-status-tone="volumeStatusTone"
      />
    </div>

    <div v-if="!collapsed && journeyStages.length" class="exam-sub-sidebar__progress">
      <div class="exam-sub-sidebar__progress-meta">
        <span>{{ journeyProgressLabel }}</span>
        <span :class="{ 'exam-sub-sidebar__progress-pct--attention': journeyAttentionCount > 0 }">
          {{ journeyProgressPercent }}%
        </span>
      </div>
      <div
        class="exam-sub-sidebar__progress-bar"
        :class="{ 'exam-sub-sidebar__progress-bar--attention': journeyAttentionCount > 0 }"
      >
        <div
          class="exam-sub-sidebar__progress-fill"
          :style="{
            transform: `scaleX(${Math.max(0, Math.min(1, journeyProgressPercent / 100))})`,
          }"
        />
      </div>
    </div>

    <UiDivider v-if="!collapsed" class="archive-volume-sub-sidebar__divider" />

    <nav
      class="exam-journey-sidebar-nav"
      :class="{ 'exam-journey-sidebar-nav--collapsed': collapsed }"
      aria-label="归档旅程"
    >
      <UiSkeletonState
        v-if="loading && journeyStages.length === 0"
        :rows="4"
        compact
        class="exam-journey-sidebar-nav__skeleton"
      />
      <template v-else>
        <div v-if="!collapsed" class="exam-journey-sidebar-nav__section-label">归档旅程</div>
        <button
          v-for="(stage, index) in journeyStages"
          :key="stage.key"
          type="button"
          class="exam-journey-sidebar-nav__item"
          :class="{
            'exam-journey-sidebar-nav__item--active': activeJourneyKey === stage.key,
            'exam-journey-sidebar-nav__item--completed': stage.status === 'completed',
          }"
          :title="collapsed ? stage.title : undefined"
          @click="emit('journey-select', stage.key)"
        >
          <span
            class="exam-journey-sidebar-nav__index"
            :class="`exam-journey-sidebar-nav__index--${stage.status}`"
          >
            <CheckOutlined
              v-if="stage.status === 'completed'"
              class="exam-journey-sidebar-nav__check"
            />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span v-if="!collapsed" class="exam-journey-sidebar-nav__title">{{ stage.title }}</span>
        </button>
      </template>
    </nav>

    <template v-if="activeMenuTabs.length">
      <UiDivider v-if="!collapsed" class="archive-volume-sub-sidebar__divider" />
      <div class="archive-volume-sub-sidebar__menu">
        <nav class="exam-sub-sidebar-nav">
          <UiMenu
            :selected-keys="[activeTab]"
            :inline-collapsed="collapsed"
            mode="inline"
            @click="onMenuClick"
          >
            <UiMenuItem v-for="tab in activeMenuTabs" :key="tab.key">
              <template #icon>
                <ExamSubSidebarMenuIcon
                  :icon="menuIconMap[tab.key] || FolderOutlined"
                  :label="tab.label"
                  :collapsed="collapsed"
                />
              </template>
              <template v-if="!collapsed">
                {{ tab.label }}
                <span v-if="tab.badge" class="exam-sub-sidebar-nav__badge">
                  {{ tab.badge }}
                </span>
              </template>
            </UiMenuItem>
          </UiMenu>
        </nav>
      </div>
    </template>

    <template v-if="!collapsed && manageActions.length">
      <UiDivider class="archive-volume-sub-sidebar__divider" />
      <div class="archive-volume-sub-sidebar__manage">
        <button
          v-for="action in manageActions"
          :key="action.key"
          type="button"
          class="archive-volume-sub-sidebar__manage-item"
          :class="{ 'archive-volume-sub-sidebar__manage-item--danger': action.danger }"
          @click="emit('manage-action', action.key)"
        >
          {{ action.label }}
        </button>
      </div>
    </template>

    <div class="archive-volume-sub-sidebar__footer">
      <button
        type="button"
        class="archive-volume-sub-sidebar__collapse-btn"
        @click="emit('toggle-collapse')"
      >
        <MenuFoldOutlined v-if="!collapsed" />
        <MenuUnfoldOutlined v-else />
      </button>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { Component } from 'vue'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type {
  ArchiveVolumeManageActionKey,
  ArchiveVolumeSidebarManageAction,
  ArchiveVolumeSidebarTab,
} from '@/composables/useArchiveVolumeWorkbenchContext'
import type { WorkbenchStage } from '@/types/workbench'
import type { ArchiveVolumeSidebarNavGroupView } from '@/utils/archive-volume-sidebar-navigation'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import CloudUploadOutlined from '@ant-design/icons-vue/CloudUploadOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import FileProtectOutlined from '@ant-design/icons-vue/FileProtectOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import HistoryOutlined from '@ant-design/icons-vue/HistoryOutlined'
import InboxOutlined from '@ant-design/icons-vue/InboxOutlined'
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SafetyOutlined from '@ant-design/icons-vue/SafetyOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import SolutionOutlined from '@ant-design/icons-vue/SolutionOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import { computed } from 'vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ExamSidebarExamSwitch from '@/components/workbench/ExamSidebarExamSwitch.vue'
import ExamSubSidebarMenuIcon from '@/components/workbench/ExamSubSidebarMenuIcon.vue'
import {
  buildArchiveVolumeJourneyStages,
  resolveArchiveVolumeActiveJourneyKey,
} from '@/utils/archive-volume-sidebar-navigation'

defineOptions({ name: 'ArchiveVolumeSubSidebar' })

const props = withDefaults(
  defineProps<{
    archiveTitle: string
    archiveNo: string
    archiveContextLine: string
    volumeStatusLabel: string
    volumeStatusTone: BadgeTone
    activeTab: string
    navGroups: ArchiveVolumeSidebarNavGroupView[]
    manageActions?: ArchiveVolumeSidebarManageAction[]
    collapsed: boolean
    mobileOpen: boolean
    loading?: boolean
  }>(),
  {
    manageActions: () => [],
    loading: false,
  },
)

const emit = defineEmits<{
  'tab-change': [tabKey: string]
  'journey-select': [journeyKey: string]
  'toggle-collapse': []
  'manage-action': [key: ArchiveVolumeManageActionKey]
}>()

const menuIconMap: Record<string, Component> = {
  "materials": FolderOutlined,
  'ocr-search': FileSearchOutlined,
  'task-settings': SettingOutlined,
  "collaborators": TeamOutlined,
  'start-collecting': PlayCircleOutlined,
  "scores": SolutionOutlined,
  "integrity": SafetyOutlined,
  'self-check': AuditOutlined,
  'four-property': FileProtectOutlined,
  'department-review': AuditOutlined,
  'scan-batches': CloudUploadOutlined,
  'scan-review': ScanOutlined,
  "transfer": InboxOutlined,
  "storage": ContainerOutlined,
  "access": ProfileOutlined,
  "appraisal": FileProtectOutlined,
  "events": HistoryOutlined,
}

const journeyStages = computed((): WorkbenchStage[] =>
  buildArchiveVolumeJourneyStages(props.navGroups, props.activeTab),
)

const activeJourneyKey = computed(() =>
  resolveArchiveVolumeActiveJourneyKey(props.navGroups, props.activeTab),
)

const activeMenuTabs = computed((): ArchiveVolumeSidebarTab[] => {
  const group = props.navGroups.find((item) => item.key === activeJourneyKey.value)
  return group?.tabs ?? []
})

const journeyProgressPercent = computed(() => {
  const stages = journeyStages.value
  if (!stages.length) {
    return 0
  }
  const completedCount = stages.filter((stage) => stage.status === 'completed').length
  return Math.round((completedCount / stages.length) * 100)
})

const journeyAttentionCount = computed(() => {
  return journeyStages.value.filter(
    (stage) => stage.status === 'warning' || stage.status === 'error' || stage.status === 'blocked',
  ).length
})

const journeyProgressLabel = computed(() => {
  const stages = journeyStages.value
  if (!stages.length) {
    return '旅程进度'
  }
  const completedCount = stages.filter((stage) => stage.status === 'completed').length
  const attention = journeyAttentionCount.value
  if (attention > 0) {
    return `已完成 ${completedCount}/${stages.length} · ${attention} 步需处理`
  }
  return `已完成 ${completedCount}/${stages.length} 步`
})

function onMenuClick(info: MenuInfo): void {
  emit('tab-change', String(info.key))
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.archive-volume-sub-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--dp-surface, var(--dp-bg-container));
  border-right: 1px solid var(--dp-border, var(--dp-border-subtle));
  min-height: 0;

  &--collapsed {
    width: 64px;
  }

  &__exam-switch {
    padding: var(--dp-space-3, 12px) var(--dp-space-3, 12px) var(--dp-space-2, 8px);
    flex-shrink: 0;
  }

  &__divider {
    margin: 0 !important;
  }

  &__menu {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__manage {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 var(--dp-space-2, 8px) var(--dp-space-2, 8px);
    flex-shrink: 0;
  }

  &__manage-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    border: none;
    border-radius: var(--dp-radius-panel);
    background: transparent;
    color: var(--dp-text-secondary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;

    &:hover {
      background: var(--dp-fill-tertiary);
      color: var(--dp-text-primary);
    }

    &--danger {
      color: var(--dp-danger);

      &:hover {
        background: color-mix(in srgb, var(--dp-danger) 8%, var(--dp-surface));
        color: var(--dp-danger);
      }
    }
  }

  &__footer {
    margin-top: auto;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    border-top: 1px solid var(--dp-border, var(--dp-border-subtle));
    display: flex;
    justify-content: end;
    flex-shrink: 0;
  }

  &__collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--dp-radius-panel);
    background: transparent;
    color: var(--dp-text-muted, var(--dp-text-tertiary));
    cursor: pointer;

    &:hover {
      background: var(--dp-gray-100, var(--dp-fill-tertiary));
      color: var(--dp-text-primary, var(--dp-text));
    }
  }

  @media (max-width: bp.$layout-mobile-max) {
    position: fixed;
    z-index: 200;
    top: 56px;
    left: 0;
    height: calc(100vh - 56px);
    width: 260px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--dp-shadow-md);

    &--mobile-open {
      transform: translateX(0);
    }

    &--collapsed:not(.archive-volume-sub-sidebar--mobile-open) {
      width: 260px;
    }
  }
}

.exam-journey-sidebar-nav {
  flex-shrink: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 42vh;
  overflow-y: auto;

  &--collapsed {
    align-items: center;
    padding: 8px 4px;
  }

  &__skeleton {
    padding: 4px 8px;
  }

  &__section-label {
    margin: 8px 8px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--dp-text-muted);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: var(--dp-radius-panel);
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: var(--dp-text-primary);
    transition: background 0.2s ease;

    &:hover {
      background: var(--dp-fill-tertiary);
    }

    &--active {
      background: var(--dp-blue-50);

      .exam-journey-sidebar-nav__title {
        color: var(--dp-color-primary);
        font-weight: 600;
      }
    }
  }

  &__check {
    font-size: 11px;
  }

  &__index {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    background: var(--dp-surface-subtle);
    color: var(--dp-text-secondary);

    &--pending {
      background: var(--dp-surface-subtle);
      color: var(--dp-text-muted);
    }

    &--active {
      background: var(--dp-blue-50);
      color: var(--dp-color-primary);
    }

    &--completed {
      background: var(--dp-success-bg);
      color: var(--dp-success);
    }

    &--warning {
      background: var(--dp-warning-bg);
      color: var(--dp-warning);
    }

    &--error,
    &--blocked {
      background: var(--dp-error-bg);
      color: var(--dp-danger);
    }
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--dp-text-primary);
  }

  &--collapsed &__item {
    width: 40px;
    justify-content: center;
    padding: 8px 0;
  }

  &--collapsed &__index {
    margin: 0;
  }
}

.exam-sub-sidebar__progress-pct--attention {
  color: var(--dp-warning);
  font-weight: 600;
}

.exam-sub-sidebar__progress-bar--attention {
  box-shadow: inset 0 0 0 1px var(--dp-warning-border);
}

.exam-sub-sidebar-nav {
  flex: 1;
  overflow: auto;
  padding: 8px;

  :deep(.ant-menu-item) {
    border-radius: var(--dp-radius-panel);
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  :deep(.ant-menu-item-selected) {
    background: var(--dp-color-primary-bg);
  }

  :deep(.ant-menu-inline-collapsed) {
    width: 100%;
  }

  :deep(.ant-menu-inline-collapsed > .ant-menu-item) {
    padding-inline: calc(50% - 14px);
  }

  &__badge {
    margin-left: auto;
    min-width: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: var(--dp-warning-bg);
    color: var(--dp-warning);
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
}
</style>
