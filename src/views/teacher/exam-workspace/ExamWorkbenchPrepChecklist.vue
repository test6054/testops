<template>
  <WorkbenchSurfaceCard class="prep-checklist">
    <template #head>
      <div class="prep-checklist__head">
        <h3 class="prep-checklist__title">准备步骤</h3>
        <span class="prep-checklist__meta">{{ completedCount }}/{{ steps.length }} 已完成</span>
      </div>
    </template>
    <ol class="prep-checklist__list">
      <li
        v-for="step in steps"
        :key="step.key"
        class="prep-checklist__step"
        :class="`prep-checklist__step--${step.status}`"
      >
        <span class="prep-checklist__node" />
        <div class="prep-checklist__body">
          <div class="prep-checklist__row">
            <span class="prep-checklist__step-title">{{ step.title }}</span>
            <UiTag :tone="statusTone(step.status)" size="sm">{{ step.statusText }}</UiTag>
          </div>
          <p v-if="step.advisoryReason" class="prep-checklist__advisory">
            {{ step.advisoryReason }}
          </p>
        </div>
        <UiButton
          v-if="step.status !== 'completed'"
          size="sm"
          :variant="step.status === 'warning' || step.status === 'error' ? 'outline' : 'ghost'"
          @click="emit('step-navigate', step.key)"
        >
          去处理
        </UiButton>
        <UiButton v-else size="sm" variant="ghost" @click="emit('step-navigate', step.key)">
          查看
        </UiButton>
      </li>
    </ol>
  </WorkbenchSurfaceCard>
</template>

<script lang="ts" setup>
import type {
  ExamWorkbenchPrepStepResponse,
  WorkbenchStageStatusCode,
} from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { WORKSPACE_STAGE_STATUS_TONE } from '@/constants/mark-workspace-nav'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamWorkbenchPrepChecklist' })

const props = defineProps<{
  steps: ExamWorkbenchPrepStepResponse[]
}>()

const emit = defineEmits<{
  'step-navigate': [stepKey: string]
}>()

const completedCount = computed(() => props.steps.filter((s) => s.status === 'completed').length)

function statusTone(status: WorkbenchStageStatusCode): BadgeTone {
  return strictEnumTone(WORKSPACE_STAGE_STATUS_TONE, status, '考试准备阶段状态')
}
</script>

<style lang="scss" scoped>
.prep-checklist {
  &__head {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component) 0;
    border-bottom: 1px solid var(--dp-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__node {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-top: var(--dp-space-component-tight);
    border-radius: var(--dp-radius-full);
    background: var(--dp-gray-300);
  }

  &__step--completed &__node {
    background: var(--dp-green-500);
  }

  &__step--active &__node {
    background: var(--dp-color-primary);
  }

  &__step--warning &__node,
  &__step--error &__node,
  &__step--blocked &__node {
    background: var(--dp-orange-500);
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__step-title {
    font-size: var(--dp-font-size-md);
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  &__advisory {
    margin: var(--dp-space-component-xs) 0 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    line-height: 1.4;
  }
}
</style>
