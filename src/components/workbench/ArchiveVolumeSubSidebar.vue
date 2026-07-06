<template>
  <aside
    class="archive-volume-sub-sidebar"
    :class="{
      'archive-volume-sub-sidebar--collapsed': collapsed && !mobileOpen,
      'archive-volume-sub-sidebar--mobile-open': mobileOpen,
    }"
  >
    <div v-if="!collapsed" class="archive-volume-sub-sidebar__header">
      <button type="button" class="archive-volume-sub-sidebar__back" @click="emit('back-to-list')">
        ← 返回列表
      </button>
      <div class="archive-volume-sub-sidebar__title-row">
        <span
          class="archive-volume-sub-sidebar__status-dot"
          :class="`archive-volume-sub-sidebar__status-dot--${volumeStatusTone}`"
        />
        <h2 class="archive-volume-sub-sidebar__title">{{ archiveTitle }}</h2>
      </div>
      <p class="archive-volume-sub-sidebar__subtitle">{{ archiveSubtitle }}</p>
    </div>

    <div v-if="!collapsed" class="archive-volume-sub-sidebar__section-label">归档模块</div>
    <nav class="archive-volume-sub-sidebar__nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="archive-volume-sub-sidebar__nav-item"
        :class="{
          'archive-volume-sub-sidebar__nav-item--active': activeTab === tab.key,
          'archive-volume-sub-sidebar__nav-item--warn': tab.chainStatus === 'warn' && activeTab !== tab.key,
        }"
        :title="collapsed ? tab.label : undefined"
        @click="emit('tab-change', tab.key)"
      >
        <span class="archive-volume-sub-sidebar__nav-label">
          <span
            class="archive-volume-sub-sidebar__dot"
            :class="dotClass(tab)"
          />
          <span v-if="!collapsed">{{ tab.label }}</span>
        </span>
        <span
          v-if="!collapsed && tab.badge"
          class="archive-volume-sub-sidebar__badge"
        >
          {{ tab.badge }}
        </span>
      </button>
    </nav>

    <template v-if="!collapsed && statusRows.length">
      <div class="archive-volume-sub-sidebar__section-label archive-volume-sub-sidebar__section-label--meta">
        卷状态
      </div>
      <div class="archive-volume-sub-sidebar__meta">
        <div
          v-for="row in statusRows"
          :key="row.key"
          class="archive-volume-sub-sidebar__meta-row"
        >
          <span>{{ row.label }}</span>
          <span class="archive-volume-sub-sidebar__meta-value">{{ row.value }}</span>
        </div>
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
import type { ArchiveVolumeNavigationChainStatusCode } from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ArchiveVolumeSidebarTab } from '@/composables/useArchiveVolumeWorkbenchContext'
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'

defineOptions({ name: 'ArchiveVolumeSubSidebar' })

const props = defineProps<{
  archiveTitle: string
  archiveSubtitle: string
  volumeStatusTone: BadgeTone
  activeTab: string
  tabs: ArchiveVolumeSidebarTab[]
  statusRows: Array<{ key: string, label: string, value: string }>
  collapsed: boolean
  mobileOpen: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'tab-change': [tabKey: string]
  'back-to-list': []
  'toggle-collapse': []
}>()

function dotClass(tab: ArchiveVolumeSidebarTab): string {
  const chainStatus: ArchiveVolumeNavigationChainStatusCode | undefined = tab.chainStatus
  if (tab.key === props.activeTab) {
    return chainStatus === 'warn'
      ? 'archive-volume-sub-sidebar__dot--warn'
      : 'archive-volume-sub-sidebar__dot--current'
  }
  if (chainStatus === 'done') {
    return 'archive-volume-sub-sidebar__dot--done'
  }
  if (chainStatus === 'warn') {
    return 'archive-volume-sub-sidebar__dot--warn'
  }
  return 'archive-volume-sub-sidebar__dot--pending'
}
</script>

<style lang="scss" scoped>
.archive-volume-sub-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-bg-container);
  border-right: 1px solid var(--ant-color-border-secondary);
  min-height: 0;

  &--collapsed {
    width: 64px;
  }

  &__header {
    padding: 16px 16px 12px;
    flex-shrink: 0;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    margin-bottom: 8px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--ant-color-text-quaternary);
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: var(--ant-color-text-secondary);
    }
  }

  &__title-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  &__status-dot {
    width: 7px;
    height: 7px;
    margin-top: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--ant-color-text-quaternary);

    &--green {
      background: var(--ant-color-success);
    }

    &--blue {
      background: var(--ant-color-primary);
    }

    &--orange {
      background: var(--ant-color-warning);
    }

    &--red {
      background: var(--ant-color-error);
    }

    &--gray {
      background: var(--ant-color-text-quaternary);
    }
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ant-color-text);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__subtitle {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ant-color-text-tertiary);
    word-break: break-all;
  }

  &__section-label {
    padding: 8px 16px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ant-color-text-quaternary);
    text-transform: uppercase;
    flex-shrink: 0;

    &--meta {
      margin-top: 8px;
    }
  }

  &__nav {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: var(--dp-radius-panel, 6px);
    background: transparent;
    color: var(--ant-color-text-secondary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: var(--ant-color-fill-tertiary);
      color: var(--ant-color-text);
    }

    &--active {
      background: color-mix(in srgb, var(--ant-color-primary) 8%, transparent);
      color: var(--ant-color-primary);
      font-weight: 500;
    }

    &--warn:not(&--active) {
      color: var(--ant-color-warning);
    }
  }

  &__nav-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--ant-color-fill-secondary);

    &--done {
      background: var(--ant-color-success);
    }

    &--current {
      background: var(--ant-color-primary);
    }

    &--warn {
      background: var(--ant-color-warning);
    }

    &--pending {
      background: var(--ant-color-fill-secondary);
    }
  }

  &__badge {
    min-width: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--ant-color-primary) 12%, transparent);
    color: var(--ant-color-primary);
    font-size: 11px;
    font-weight: 500;
    line-height: 18px;
    text-align: center;
  }

  &__meta {
    padding: 0 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  &__meta-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__meta-value {
    color: var(--ant-color-text-secondary);
    text-align: right;
    word-break: break-all;
  }

  &__footer {
    margin-top: auto;
    padding: 12px 16px;
    border-top: 1px solid var(--ant-color-border-secondary);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  &__collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--dp-radius-panel, 6px);
    background: transparent;
    color: var(--ant-color-text-tertiary);
    cursor: pointer;

    &:hover {
      background: var(--ant-color-fill-tertiary);
      color: var(--ant-color-text);
    }
  }

  @media (max-width: 767px) {
    position: fixed;
    z-index: 200;
    top: 56px;
    left: 0;
    height: calc(100vh - 56px);
    width: 260px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--dp-shadow-md, 0 4px 12px rgb(0 0 0 / 12%));

    &--mobile-open {
      transform: translateX(0);
    }

    &--collapsed:not(.archive-volume-sub-sidebar--mobile-open) {
      width: 260px;
    }
  }
}
</style>
