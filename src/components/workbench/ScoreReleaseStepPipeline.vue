<script lang="ts" setup>
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'
import type { ScoreReleaseStep } from '@/utils/score-release-step'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import { computed } from 'vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { buildScoreReleaseSteps } from '@/utils/score-release-step'

defineOptions({ name: 'ScoreReleaseStepPipeline' })

const props = defineProps<{
  overview: FinalScoreRiskOverviewResponse | null
  allScoresPublished?: boolean
}>()

const { currentStep, navigateToStep } = useScoreReleaseNavigation()

const steps = computed<ScoreReleaseStep[]>(() =>
  buildScoreReleaseSteps(currentStep.value, props.overview, props.allScoresPublished),
)

const doneCount = computed(() => steps.value.filter((item) => item.status === 'done').length)

function handleSelect(step: ScoreReleaseStep): void {
  navigateToStep(step.key)
}
</script>

<template>
  <WorkbenchSurfaceCard class="score-release-pipeline">
    <template #head>
      <span class="score-release-pipeline__title">发布流程</span>
      <span class="score-release-pipeline__meta">{{ doneCount }}/{{ steps.length }} 已完成</span>
    </template>
    <ul class="score-release-pipeline__track" aria-label="成绩发布流程">
      <li v-for="(step, index) in steps" :key="step.key" class="score-release-pipeline__item">
        <button
          type="button"
          class="score-release-pipeline__step"
          :class="[
            `score-release-pipeline__step--${step.status}`,
            { 'score-release-pipeline__step--current': step.status === 'active' },
          ]"
          @click="handleSelect(step)"
        >
          <span
            v-if="index < steps.length - 1"
            class="score-release-pipeline__connector"
            aria-hidden="true"
          />
          <span class="score-release-pipeline__dot">
            <CheckOutlined v-if="step.status === 'done'" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span class="score-release-pipeline__label">{{ step.label }}</span>
          <span class="score-release-pipeline__desc">{{ step.description }}</span>
        </button>
      </li>
    </ul>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.score-release-pipeline {
  margin-top: var(--dp-space-component);

  &__title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__meta {
    margin-left: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    font-weight: 400;
    color: var(--dp-text-secondary);
  }

  &__track {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--dp-space-component);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    margin: 0;
    padding: 0;
    min-width: 0;
  }

  &__step {
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--dp-space-component-tight);
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
    background: var(--dp-surface);
    text-align: left;
    cursor: pointer;
    transition:
      border-color var(--dp-duration-normal),
      background var(--dp-duration-normal);

    &:hover {
      border-color: var(--dp-blue-200);
    }

    &--active,
    &--current {
      border-color: var(--dp-blue-500);
      background: var(--dp-blue-50);
    }

    &--done {
      border-color: var(--dp-green-200);
      background: var(--dp-green-50);
    }

    &--pending {
      opacity: 0.92;
    }
  }

  &__connector {
    display: none;
  }

  &__dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    background: var(--dp-surface-subtle);
    color: var(--dp-text-secondary);

    .score-release-pipeline__step--active &,
    .score-release-pipeline__step--current & {
      background: var(--dp-blue-600);
      color: var(--dp-text-inverse);
    }

    .score-release-pipeline__step--done & {
      background: var(--dp-green-600);
      color: var(--dp-text-inverse);
    }
  }

  &__label {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__desc {
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-secondary);
  }
}
</style>
