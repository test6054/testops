<template>
  <div class="ui-pill-steps">
    <div
      v-for="(step, index) in normalizedSteps"
      :key="step.key"
      class="ui-pill-steps__item"
      :class="[
        `ui-pill-steps__item--${step.status}`,
        { 'ui-pill-steps__item--clickable': clickable && step.status !== 'pending' },
      ]"
      @click="handleClick(step, index)"
    >
      <span class="ui-pill-steps__number">{{ index + 1 }}</span>
      <span class="ui-pill-steps__title">{{ step.title }}</span>
      <span v-if="step.status === 'completed'" class="ui-pill-steps__check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M5 12l5 5L19 7" />
        </svg>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UiStepItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiPillSteps',
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
      step.status
      || (index < props.current ? 'completed' : index === props.current ? 'running' : 'pending'),
  }))
})

function handleClick(step: UiStepItem, index: number) {
  if (props.clickable && step.status !== 'pending') {
    emit('change', index, step)
  }
}
</script>

<style scoped>
.ui-pill-steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ui-pill-steps__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.ui-pill-steps__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #cbd5e1;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.ui-pill-steps__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-primary, #0f172a);
}

.ui-pill-steps__check {
  width: 16px;
  height: 16px;
  color: #22c55e;
}

.ui-pill-steps__check svg {
  width: 100%;
  height: 100%;
}

/* ===== 状态：进行中 ===== */
.ui-pill-steps__item--running {
  background: #eff6ff;
  box-shadow: 0 0 0 2px #3b82f6;
}

.ui-pill-steps__item--running .ui-pill-steps__number {
  background: #3b82f6;
}

.ui-pill-steps__item--running .ui-pill-steps__title {
  color: #1e40af;
  font-weight: 600;
}

/* ===== 状态：已完成 ===== */
.ui-pill-steps__item--completed {
  background: #f0fdf4;
}

.ui-pill-steps__item--completed .ui-pill-steps__number {
  background: #22c55e;
}

/* ===== 状态：待处理 ===== */
.ui-pill-steps__item--pending {
  background: #f8fafc;
}

.ui-pill-steps__item--pending .ui-pill-steps__number {
  background: #e2e8f0;
  color: #94a3b8;
}

.ui-pill-steps__item--pending .ui-pill-steps__title {
  color: #94a3b8;
}

/* ===== 可点击 ===== */
.ui-pill-steps__item--clickable {
  cursor: pointer;
}

.ui-pill-steps__item--clickable:hover {
  border-color: var(--dp-border-strong, #e2e8f0);
}
</style>
