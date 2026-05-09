<template>
  <div class="ui-card-steps" :class="{ 'ui-card-steps--compact': compact }">
    <div
      v-for="(step, index) in normalizedSteps"
      :key="step.key"
      class="ui-card-steps__item"
      :class="[
        `ui-card-steps__item--${step.status}`,
        { 'ui-card-steps__item--clickable': clickable && step.status !== 'pending' },
      ]"
      @click="handleClick(step, index)"
    >
      <div class="ui-card-steps__card">
        <div class="ui-card-steps__number">{{ index + 1 }}</div>
        <div class="ui-card-steps__info">
          <div class="ui-card-steps__title">{{ step.title }}</div>
          <div v-if="step.description" class="ui-card-steps__desc">{{ step.description }}</div>
        </div>
        <div v-if="step.status === 'completed'" class="ui-card-steps__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M5 12l5 5L19 7" />
          </svg>
        </div>
        <div v-else-if="step.status === 'running'" class="ui-card-steps__badge">
          进行中
        </div>
      </div>
      <div v-if="index < normalizedSteps.length - 1" class="ui-card-steps__connector">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 4l8 8-8 8" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UiStepItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiCardSteps',
})

const props = withDefaults(defineProps<{
  steps?: UiStepItem[]
  current?: number
  compact?: boolean
  clickable?: boolean
}>(), {
  steps: () => [],
  current: 0,
  compact: false,
  clickable: false,
})

const emit = defineEmits<{
  (e: 'change', index: number, step: UiStepItem): void
}>()

const normalizedSteps = computed(() => {
  return props.steps.map((step, index) => ({
    ...step,
    key: step.key || `step-${index}`,
    status: step.status || (index < props.current ? 'completed' : index === props.current ? 'running' : 'pending'),
  }))
})

function handleClick(step: UiStepItem, index: number) {
  if (props.clickable && step.status !== 'pending') {
    emit('change', index, step)
  }
}
</script>

<style scoped>
.ui-card-steps {
  display: flex;
  gap: 0;
  width: 100%;
}

.ui-card-steps__item {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.ui-card-steps__card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.ui-card-steps--compact .ui-card-steps__card {
  padding: 12px;
  gap: 10px;
}

.ui-card-steps__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.ui-card-steps--compact .ui-card-steps__number {
  width: 28px;
  height: 28px;
  font-size: 13px;
}

.ui-card-steps__info {
  flex: 1;
  min-width: 0;
}

.ui-card-steps__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-card-steps--compact .ui-card-steps__title {
  font-size: 13px;
}

.ui-card-steps__desc {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-card-steps__check {
  width: 20px;
  height: 20px;
  color: #22c55e;
  flex-shrink: 0;
}

.ui-card-steps__check svg {
  width: 100%;
  height: 100%;
}

.ui-card-steps__badge {
  padding: 2px 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  flex-shrink: 0;
}

.ui-card-steps__connector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  color: #cbd5e1;
  flex-shrink: 0;
}

.ui-card-steps__connector svg {
  width: 16px;
  height: 16px;
}

/* ===== 状态：进行中 ===== */
.ui-card-steps__item--running .ui-card-steps__card {
  border-color: #3b82f6;
  background: #eff6ff;
}

.ui-card-steps__item--running .ui-card-steps__number {
  background: #3b82f6;
  color: #fff;
}

.ui-card-steps__item--running .ui-card-steps__title {
  color: #1e40af;
}

/* ===== 状态：已完成 ===== */
.ui-card-steps__item--completed .ui-card-steps__card {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.ui-card-steps__item--completed .ui-card-steps__number {
  background: #22c55e;
  color: #fff;
}

.ui-card-steps__item--completed .ui-card-steps__connector {
  color: #22c55e;
}

/* ===== 状态：待处理 ===== */
.ui-card-steps__item--pending .ui-card-steps__card {
  background: #fafafa;
  border-color: #e5e5e5;
}

.ui-card-steps__item--pending .ui-card-steps__title {
  color: #a3a3a3;
}

.ui-card-steps__item--pending .ui-card-steps__number {
  background: #e5e5e5;
  color: #a3a3a3;
}

/* ===== 可点击 ===== */
.ui-card-steps__item--clickable {
  cursor: pointer;
}

.ui-card-steps__item--clickable:hover .ui-card-steps__card {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
