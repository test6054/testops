<script setup lang="ts">
/**
 * layout 级 OBE 七步快捷导航（32px、低饱和、无 KPI 数字）。
 */
import type { ObeJourneyStepVO } from '@/apis/quality/workbench'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useObeJourneySummary } from '@/composables/useObeJourneySummary'
import { useQualityStore } from '@/stores/modules/quality'

defineOptions({ name: 'QualityObeJourneyStrip' })

const PLAN_CONFIRMED_ROUTE_NAMES = new Set([
  'QualityAchievement',
  'QualityAchievementDetail',
  'QualityReport',
])

const router = useRouter()
const qualityStore = useQualityStore()
const { summary, loading } = useObeJourneySummary()

const steps = computed(() => summary.value?.steps ?? [])

function stepClass(step: ObeJourneyStepVO): string {
  return `quality-obe-journey-strip__step quality-obe-journey-strip__step--${step.status}`
}

function goStep(step: ObeJourneyStepVO): void {
  if (!step.routeName) return
  if (
    PLAN_CONFIRMED_ROUTE_NAMES.has(step.routeName) &&
    qualityStore.currentPlan?.confirmationStatus !== 'CONFIRMED'
  ) {
    void router.push({ name: 'QualityTrainingPlanWorkbench' })
    return
  }
  if (step.routeName === 'QualityIngestHub') {
    void router.push({ path: '/quality/ingest-hub/score-batch' })
    return
  }
  void router.push({ name: step.routeName })
}
</script>

<template>
  <nav v-if="steps.length" class="quality-obe-journey-strip" aria-label="OBE 评价阶段">
    <button
      v-for="step in steps"
      :key="step.stepKey"
      type="button"
      class="quality-obe-journey-strip__btn"
      :class="stepClass(step)"
      :disabled="loading || step.status === 'pending'"
      @click="goStep(step)"
    >
      <span class="quality-obe-journey-strip__dot" aria-hidden="true" />
      <span class="quality-obe-journey-strip__label">{{ step.title }}</span>
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.quality-obe-journey-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 32px;
  padding: 0 24px 8px;
  overflow-x: auto;
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.45));
    font-size: 12px;
    line-height: 32px;
    white-space: nowrap;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.55;
    }

    &:not(:disabled):hover {
      color: var(--ant-color-primary);
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  &__step--completed {
    color: var(--ant-color-success);
  }

  &__step--active {
    color: var(--ant-color-primary);
    font-weight: 500;
  }

  &__step--pending {
    color: var(--dp-text-secondary, rgba(0, 0, 0, 0.45));
  }
}
</style>
