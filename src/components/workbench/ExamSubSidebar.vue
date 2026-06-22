<template>
  <aside
    class="exam-sub-sidebar"
    :class="{
      'exam-sub-sidebar--collapsed': collapsed && !mobileOpen,
      'exam-sub-sidebar--mobile-open': mobileOpen,
    }"
  >
    <div v-if="snapshot && !collapsed" class="exam-sub-sidebar__exam-info">
      <h3 class="exam-sub-sidebar__exam-title">{{ snapshot.examName }}</h3>
      <div class="exam-sub-sidebar__exam-meta">
        <span v-if="snapshot.examNo" class="exam-sub-sidebar__exam-no">编号 {{ snapshot.examNo }}</span>
        <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">{{ examStatusLabel }}</UiTag>
      </div>
    </div>

    <a-divider v-if="!collapsed" class="exam-sub-sidebar__divider" />

    <ExamSubSidebarNav
      :active-journey-key="activeJourneyKey"
      :active-menu-key="activeMenuKey"
      :ordered-stages="orderedStages"
      :collapsed="collapsed"
      :menu-icon-map="menuIconMap"
      @menu-click="(key) => emit('menu-click', key)"
    />

    <div class="exam-sub-sidebar__footer">
      <button type="button" class="exam-sub-sidebar__collapse-btn" @click="emit('toggle-collapse')">
        <MenuFoldOutlined v-if="!collapsed" />
        <MenuUnfoldOutlined v-else />
      </button>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import type { WorkbenchStage } from '@/types/workbench'
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ExamSubSidebarNav from '@/components/workbench/ExamSubSidebarNav.vue'

defineOptions({
  name: 'ExamSubSidebar',
})

defineProps<{
  snapshot: ExamSnapshotBrief | null
  examStatusLabel: string
  examStatusTone: BadgeTone | undefined
  activeMenuKey: string
  activeJourneyKey: ExamWorkspaceJourneyKey
  orderedStages: WorkbenchStage[]
  collapsed: boolean
  mobileOpen: boolean
  menuIconMap: Record<ExamWorkspaceMenuKey, Component>
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: string): void
  (e: 'toggle-collapse'): void
}>()

interface ExamSnapshotBrief {
  examName: string
  examNo?: string
  examStatus?: ExamStatusCode
}
</script>

<style lang="scss" scoped>
.exam-sub-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-bg-container);
  border-right: 1px solid var(--ant-color-border-secondary);

  &--collapsed {
    width: 64px;
  }

  &__exam-info {
    padding: 16px;
    flex-shrink: 0;
  }

  &__exam-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ant-color-text);
    word-break: break-word;
  }

  &__exam-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__exam-no {
    font-size: 13px;
    color: var(--ant-color-text-secondary);
  }

  &__divider {
    margin: 0 !important;
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid var(--ant-color-border-secondary);
    display: flex;
    justify-content: flex-end;
  }

  &__collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--dp-radius-md);
    background: transparent;
    color: var(--ant-color-text-tertiary);
    cursor: pointer;

    &:hover {
      background: var(--ant-color-fill-tertiary);
      color: var(--ant-color-text);
    }
  }

  @media (max-width: 768px) {
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

    &--collapsed:not(.exam-sub-sidebar--mobile-open) {
      width: 260px;
    }
  }
}
</style>
