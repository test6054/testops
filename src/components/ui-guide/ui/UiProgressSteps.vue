<template>
  <div class="ui-progress-steps">
    <div class="ui-progress-steps__track">
      <div class="ui-progress-steps__fill" :style="{ width: `${progressPercent}%` }" />
      <div
        v-for="(step, index) in normalizedSteps"
        :key="step.key"
        class="ui-progress-steps__node"
        :class="[
          `ui-progress-steps__node--${step.status}`,
          { 'ui-progress-steps__node--clickable': clickable && step.status !== 'pending' },
        ]"
        :style="{ left: `${(index / (normalizedSteps.length - 1)) * 100}%` }"
        @click="handleClick(step, index)"
      >
        <div class="ui-progress-steps__dot">
          <template v-if="step.status === 'completed'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M5 12l5 5L19 7" />
            </svg>
          </template>
          <template v-else>
            {{ index + 1 }}
          </template>
        </div>
      </div>
    </div>
    <div class="ui-progress-steps__labels">
      <div
        v-for="step in normalizedSteps"
        :key="`label-${step.key}`"
        class="ui-progress-steps__label"
        :class="`ui-progress-steps__label--${step.status}`"
      >
        <div class="ui-progress-steps__title">{{ step.title }}</div>
        <div v-if="step.description" class="ui-progress-steps__desc">{{ step.description }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UiStepItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiProgressSteps',
})

const props = withDefaults(
  defineProps<{
    steps?: UiStepItem[]
    current?: number
    clickable?: boolean
  }>(),
  {
    steps: () => [],
    current: 0,
    clickable: false,
  },
)

const emit = defineEmits<{
  (e: 'change', index: number, step: UiStepItem): void
}>()

const normalizedSteps = computed(() => {
  return props.steps.map((step, index) => ({
    ...step,
    key: step.key || `step-${index}`,
    status:
      step.status ||
      (index < props.current ? 'completed' : index === props.current ? 'running' : 'pending'),
  }))
})

const progressPercent = computed(() => {
  if (normalizedSteps.value.length <= 1) return 0
  const completedCount = normalizedSteps.value.filter((s) => s.status === 'completed').length
  return (completedCount / (normalizedSteps.value.length - 1)) * 100
})

function handleClick(step: UiStepItem, index: number) {
  if (props.clickable && step.status !== 'pending') {
    emit('change', index, step)
  }
}
</script>

<style scoped>
.ui-progress-steps {
  padding: 0 16px;
}

.ui-progress-steps__track {
  position: relative;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  margin: 16px 0;
}

.ui-progress-steps__fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.ui-progress-steps__node {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.ui-progress-steps__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.ui-progress-steps__dot svg {
  width: 14px;
  height: 14px;
}

.ui-progress-steps__node--running .ui-progress-steps__dot {
  border-color: #3b82f6;
  color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.ui-progress-steps__node--completed .ui-progress-steps__dot {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.ui-progress-steps__node--clickable {
  cursor: pointer;
}

.ui-progress-steps__node--clickable:hover .ui-progress-steps__dot {
  transform: scale(1.1);
}

.ui-progress-steps__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}

.ui-progress-steps__label {
  flex: 1;
  text-align: center;
}

.ui-progress-steps__label:first-child {
  text-align: left;
}

.ui-progress-steps__label:last-child {
  text-align: right;
}

.ui-progress-steps__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.4;
}

.ui-progress-steps__label--pending .ui-progress-steps__title {
  color: #94a3b8;
}

.ui-progress-steps__label--running .ui-progress-steps__title {
  color: #2563eb;
}

.ui-progress-steps__desc {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  margin-top: 2px;
}
</style>
