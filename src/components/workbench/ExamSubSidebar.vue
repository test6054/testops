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
        :exam-context-line="examContextLine"
        :exam-status-label="examStatusLabel"
        :exam-status-tone="examStatusTone"
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

    <UiDivider v-if="!collapsed" class="exam-sub-sidebar__divider" />

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
      <UiDivider v-if="!collapsed" class="exam-sub-sidebar__divider" />
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
import { computed } from 'vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import ExamJourneySidebarNav from '@/components/workbench/ExamJourneySidebarNav.vue'
import ExamSidebarExamSwitch from '@/components/workbench/ExamSidebarExamSwitch.vue'
import ExamSubSidebarNav from '@/components/workbench/ExamSubSidebarNav.vue'

defineOptions({
  name: 'ExamSubSidebar',
})

const props = defineProps<{
  examStatusLabel: string
  examStatusTone: BadgeTone | undefined
  examDisplayName?: string
  examDisplayNo?: string
  examContextLine?: string
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

const journeyProgressPercent = computed(() => {
  const stages = props.journeyStages
  if (!stages.length) {
    return 0
  }
  const completedCount = stages.filter((stage) => stage.status === 'completed').length
  return Math.round((completedCount / stages.length) * 100)
})

const journeyAttentionCount = computed(() => {
  return props.journeyStages.filter(
    (stage) => stage.status === 'blocked' || stage.status === 'warning' || stage.status === 'error',
  ).length
})

const journeyProgressLabel = computed(() => {
  const stages = props.journeyStages
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
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.exam-sub-sidebar {
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

  &__footer {
    margin-top: auto;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    border-top: 1px solid var(--dp-border, var(--dp-border-subtle));
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

    &--collapsed:not(.exam-sub-sidebar--mobile-open) {
      width: 260px;
    }
  }
}

.exam-sub-sidebar__progress-pct--attention {
  color: var(--dp-warning);
  font-weight: 600;
}

.exam-sub-sidebar__progress-bar--attention {
  box-shadow: inset 0 0 0 1px var(--dp-warning-border);
}
</style>
