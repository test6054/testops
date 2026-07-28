<script setup lang="ts">
/**
 * layout 级 OBE 七步快捷导航（32px、低饱和、无 KPI 数字）。
 */
import type { ObeJourneyStepVO } from '@/apis/quality/workbench'
import message from 'ant-design-vue/es/message'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import { useObeJourneySummary } from '@/composables/useObeJourneySummary'
import { useQualityStore } from '@/stores/modules/quality'
import { ObeJourneyStepStatusCode } from '@/types/enums/obe-journey-step-status-enum'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'

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

function isStepBlocked(step: ObeJourneyStepVO): boolean {
  return step.status === ObeJourneyStepStatusCode.PENDING
}

function goStep(step: ObeJourneyStepVO): void {
  if (step.status === ObeJourneyStepStatusCode.LOCKED) {
    void message.warning('培养方案尚未确认。请先完成确认，再进入后续阶段')
    void router.push(buildQualityPlanWorkbenchLocation(QUALITY_PLAN_GATE_REASON_UNCONFIRMED))
    return
  }
  if (!step.routeName) return
  if (
    PLAN_CONFIRMED_ROUTE_NAMES.has(step.routeName)
    && qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
  ) {
    void message.warning('培养方案尚未确认。请先完成确认，再进入达成度结果与质量报告')
    void router.push(buildQualityPlanWorkbenchLocation(QUALITY_PLAN_GATE_REASON_UNCONFIRMED))
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
      :disabled="loading || isStepBlocked(step)"
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
  gap: var(--dp-space-component-tight);
  min-height: 28px;
  padding: 0 var(--dp-space-component) var(--dp-space-component-xs);
  overflow-x: auto;
  background: var(--dp-surface);
  border-bottom: 1px solid var(--dp-border);

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
    line-height: 32px;
    white-space: nowrap;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.55;
    }

    &:not(:disabled):hover {
      color: var(--dp-color-primary);
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  &__step--completed {
    color: var(--dp-success);
  }

  &__step--active {
    color: var(--dp-color-primary);
    font-weight: 500;
  }

  &__step--pending {
    color: var(--dp-text-secondary);
  }

  &__step--locked {
    color: var(--dp-text-muted, var(--dp-text-secondary));
    opacity: 0.72;
  }
}
</style>
