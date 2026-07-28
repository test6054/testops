<template>
  <div
    class="score-analytics-status-flow"
    :class="{ 'score-analytics-status-flow--standalone': standalone }"
  >
    <span v-if="!standalone" class="score-analytics-status-flow__label">分数状态流转</span>
    <div class="score-analytics-status-flow__tags">
      <template v-for="(step, index) in steps" :key="step.code">
        <UiTag
          :tone="step.tone"
          size="sm"
          :class="step.emphasis ? 'score-analytics-status-flow__tag--emphasis' : undefined"
        >
          {{ step.label
          }}<span v-if="step.count > 0" class="score-analytics-status-flow__count">{{
            step.count
          }}</span>
        </UiTag>
        <span v-if="index < steps.length - 1" class="score-analytics-status-flow__arrow">→</span>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ScoreAnalyticsFlowStep } from '@/utils/score-workbench-analytics'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'ScoreAnalyticsStatusFlow' })

defineProps<{
  steps: ScoreAnalyticsFlowStep[]
  /** 作为独立卡片主体展示时去掉顶部分隔线与重复标题 */
  standalone?: boolean
}>()
</script>

<style lang="scss" scoped>
.score-analytics-status-flow {
  margin-top: var(--dp-space-block);
  padding-top: var(--dp-space-component);
  border-top: 1px solid var(--dp-border);

  &--standalone {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  &__label {
    display: block;
    margin-bottom: var(--dp-space-component-tight);
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-xs);
  }

  &__arrow {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__count {
    margin-left: var(--dp-space-component-xs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__tag--emphasis {
    box-shadow: 0 0 0 1px var(--dp-color-primary-border);
  }
}
</style>
