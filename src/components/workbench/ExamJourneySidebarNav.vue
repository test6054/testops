<template>
  <nav
    class="exam-journey-sidebar-nav"
    :class="{ 'exam-journey-sidebar-nav--collapsed': collapsed }"
    aria-label="考试旅程"
  >
    <UiSkeletonState
      v-if="loading && journeyStages.length === 0"
      :rows="4"
      compact
      class="exam-journey-sidebar-nav__skeleton"
    />

    <template v-else>
      <button
        type="button"
        class="exam-journey-sidebar-nav__item exam-journey-sidebar-nav__item--overview"
        :class="{
          'exam-journey-sidebar-nav__item--active': resolvedActiveJourneyKey === 'overview',
        }"
        @click="emit('overview-select')"
      >
        <DashboardOutlined class="exam-journey-sidebar-nav__icon" />
        <span v-if="!collapsed" class="exam-journey-sidebar-nav__title">考试概览</span>
      </button>

      <div v-if="!collapsed" class="exam-journey-sidebar-nav__section-label">考试旅程</div>

      <button
        v-for="(stage, index) in journeyStages"
        :key="stage.key"
        type="button"
        class="exam-journey-sidebar-nav__item"
        :class="{
          'exam-journey-sidebar-nav__item--active': resolvedActiveJourneyKey === stage.key,
          'exam-journey-sidebar-nav__item--completed': stage.status === 'completed',
          'exam-journey-sidebar-nav__item--suggested': showSuggestionBadge(stage.key),
        }"
        :title="collapsed ? stage.title : undefined"
        @click="handleJourneySelect(stage.key)"
      >
        <span class="exam-journey-sidebar-nav__index" :class="statusClass(stage.status)">
          <CheckOutlined
            v-if="stage.status === 'completed'"
            class="exam-journey-sidebar-nav__check"
          />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span v-if="!collapsed" class="exam-journey-sidebar-nav__title">{{ stage.title }}</span>
        <span
          v-if="!collapsed && showSuggestionBadge(stage.key)"
          class="exam-journey-sidebar-nav__badge"
        >
          下一步
        </span>
      </button>
    </template>
  </nav>
</template>

<script lang="ts" setup>
import type { ExamJourneyKey, ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import { computed } from 'vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { isExamWorkspaceJourneyKey, resolveJourneyKeyByStage } from '@/constants/exam-journey'
import { shouldShowJourneySuggestion } from '@/constants/mark-workspace-nav'

defineOptions({
  name: 'ExamJourneySidebarNav',
})

const props = defineProps<{
  journeyStages: WorkbenchStage[]
  activeJourneyKey: string
  suggestedStageKey?: MarkStageKey | null
  collapsed: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', journeyKey: ExamJourneyKey): void
  (e: 'overview-select'): void
}>()

const suggestedJourneyKey = computed<ExamJourneyKey | null>(() => {
  if (!props.suggestedStageKey) {
    return null
  }
  return resolveJourneyKeyByStage(props.suggestedStageKey)
})

function requireExamJourneyKey(journeyKey: string): ExamJourneyKey {
  if (!isExamWorkspaceJourneyKey(journeyKey) || journeyKey === 'overview') {
    throw new Error(`未知考试旅程键：${journeyKey}`)
  }
  return journeyKey
}

function showSuggestionBadge(journeyKey: string): boolean {
  const key = requireExamJourneyKey(journeyKey)
  if (suggestedJourneyKey.value !== key) {
    return false
  }
  return shouldShowJourneySuggestion(resolvedActiveJourneyKey.value, props.suggestedStageKey)
}

function handleJourneySelect(journeyKey: string): void {
  emit('select', requireExamJourneyKey(journeyKey))
}

const resolvedActiveJourneyKey = computed((): ExamWorkspaceJourneyKey => {
  if (!isExamWorkspaceJourneyKey(props.activeJourneyKey)) {
    throw new Error(`未知考试旅程键：${props.activeJourneyKey}`)
  }
  return props.activeJourneyKey
})

function statusClass(status: WorkbenchStageStatus): string {
  return `exam-journey-sidebar-nav__index--${status}`
}
</script>

<style lang="scss" scoped>
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
    text-transform: uppercase;
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

    &--suggested:not(&--active) {
      box-shadow: inset 2px 0 0 var(--dp-warning);
    }

    &--overview {
      margin-bottom: 4px;
    }
  }

  &__check {
    font-size: 11px;
  }

  &__icon {
    font-size: 16px;
    color: var(--dp-text-secondary);
    flex-shrink: 0;
    margin-top: 1px;
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

  &__badge {
    flex-shrink: 0;
    font-size: 10px;
    line-height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: var(--dp-warning-bg);
    color: var(--dp-warning);
    font-weight: 600;
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
</style>
