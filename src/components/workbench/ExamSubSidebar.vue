<template>
  <aside
    class="exam-sub-sidebar"
    :class="{
      'exam-sub-sidebar--collapsed': collapsed && !mobileOpen,
      'exam-sub-sidebar--mobile-open': mobileOpen,
    }"
  >
    <div v-if="!collapsed" class="exam-sub-sidebar__exam-switch">
      <ExamSidebarExamSwitch
        :exam-display-name="examDisplayName"
        :exam-display-no="examDisplayNo"
        :exam-status-label="examStatusLabel"
        :exam-status-tone="examStatusTone"
      />
    </div>

    <a-divider v-if="!collapsed" class="exam-sub-sidebar__divider" />

    <ExamJourneySidebarNav
      :journey-stages="journeyStages"
      :active-journey-key="activeJourneyKey"
      :suggested-stage-key="suggestedStageKey"
      :collapsed="collapsed"
      :loading="journeyLoading"
      @select="(key) => emit('journey-select', key)"
      @overview-select="emit('overview-select')"
    />

    <template v-if="activeJourneyKey !== 'overview'">
      <a-divider v-if="!collapsed" class="exam-sub-sidebar__divider" />
      <div v-if="!collapsed" class="exam-sub-sidebar__section-label">当前步骤功能</div>
      <div class="exam-sub-sidebar__menu">
        <ExamSubSidebarNav
          :active-journey-key="activeJourneyKey"
          :active-menu-key="activeMenuKey"
          :collapsed="collapsed"
          :menu-icon-map="menuIconMap"
          @menu-click="(key) => emit('menu-click', key)"
        />
      </div>
    </template>

    <p v-else-if="!collapsed" class="exam-sub-sidebar__overview-hint">
      概览页查看全局进度；选择上方旅程步骤进入具体功能。
    </p>

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
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage } from '@/types/workbench'
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'
import ExamJourneySidebarNav from '@/components/workbench/ExamJourneySidebarNav.vue'
import ExamSidebarExamSwitch from '@/components/workbench/ExamSidebarExamSwitch.vue'
import ExamSubSidebarNav from '@/components/workbench/ExamSubSidebarNav.vue'

defineOptions({
  name: 'ExamSubSidebar',
})

defineProps<{
  examStatusLabel: string
  examStatusTone: BadgeTone | undefined
  examDisplayName?: string
  examDisplayNo?: string
  activeMenuKey: string
  activeJourneyKey: ExamWorkspaceJourneyKey
  journeyStages: WorkbenchStage[]
  suggestedStageKey?: MarkStageKey | null
  journeyLoading?: boolean
  collapsed: boolean
  mobileOpen: boolean
  menuIconMap: Record<ExamWorkspaceMenuKey, Component>
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: string): void
  (e: 'journey-select', key: string): void
  (e: 'overview-select'): void
  (e: 'toggle-collapse'): void
}>()
</script>

<style lang="scss" scoped>
.exam-sub-sidebar {
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

  &__exam-switch {
    padding: 16px 16px 12px;
    flex-shrink: 0;
  }

  &__divider {
    margin: 0 !important;
  }

  &__section-label {
    padding: 4px 16px 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ant-color-text-quaternary);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  &__overview-hint {
    flex: 1;
    margin: 0;
    padding: 12px 16px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ant-color-text-tertiary);
  }

  &__menu {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
    border-radius: var(--dp-radius-panel);
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
