<template>
  <div class="ui-segment-steps">
    <div
      v-for="(step, index) in normalizedSteps"
      :key="step.key"
      class="ui-segment-steps__item"
      :class="[
        `ui-segment-steps__item--${step.status}`,
        { 'ui-segment-steps__item--clickable': clickable && step.status !== 'pending' },
      ]"
      @click="handleClick(step, index)"
    >
      <div class="ui-segment-steps__segment" />
      <div class="ui-segment-steps__label">
        <span class="ui-segment-steps__title">{{ step.title }}</span>
        <span v-if="step.description" class="ui-segment-steps__desc">{{ step.description }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UiStepItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiSegmentSteps',
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
.ui-segment-steps {
  display: flex;
  gap: 4px;
  width: 100%;
}

.ui-segment-steps__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-segment-steps__segment {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.ui-segment-steps__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ui-segment-steps__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.4;
}

.ui-segment-steps__desc {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

/* ===== 状态：进行中 ===== */
.ui-segment-steps__item--running .ui-segment-steps__segment {
  background: linear-gradient(90deg, #3b82f6 0%, #3b82f6 50%, #e2e8f0 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: segment-pulse 1.5s ease-in-out infinite;
}

@keyframes segment-pulse {
  0%,
  100% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 0%;
  }
}

.ui-segment-steps__item--running .ui-segment-steps__title {
  color: #2563eb;
}

/* ===== 状态：已完成 ===== */
.ui-segment-steps__item--completed .ui-segment-steps__segment {
  background: #3b82f6;
}

/* ===== 状态：待处理 ===== */
.ui-segment-steps__item--pending .ui-segment-steps__title {
  color: #94a3b8;
}

/* ===== 可点击 ===== */
.ui-segment-steps__item--clickable {
  cursor: pointer;
}

.ui-segment-steps__item--clickable:hover .ui-segment-steps__segment {
  transform: scaleY(1.3);
}
</style>
