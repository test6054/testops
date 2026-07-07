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
  margin-top: var(--dp-space-4, 16px);
  padding-top: var(--dp-space-3, 12px);
  border-top: 1px solid var(--dp-border, #e2e8f0);

  &--standalone {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  &__label {
    display: block;
    margin-bottom: var(--dp-space-2, 8px);
    font-size: var(--dp-type-hint-size, 12px);
    color: var(--dp-text-muted, #64748b);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  &__arrow {
    color: var(--dp-text-muted, #94a3b8);
    font-size: 12px;
  }

  &__count {
    margin-left: 4px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__tag--emphasis {
    box-shadow: 0 0 0 1px var(--ant-color-primary-border, #91caff);
  }
}
</style>
