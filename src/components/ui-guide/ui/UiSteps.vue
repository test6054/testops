<template>
  <div
    class="ui-steps"
    :class="[`ui-steps--${direction}`, `ui-steps--${size}`, { 'ui-steps--dot': dot }]"
  >
    <div
      v-for="(step, index) in normalizedSteps"
      :key="step.key"
      class="ui-steps__item"
      :class="[
        `ui-steps__item--${step.status}`,
        { 'ui-steps__item--clickable': clickable && step.status !== 'pending' },
      ]"
      @click="handleClick(step, index)"
    >
      <div class="ui-steps__icon-wrap">
        <div class="ui-steps__icon">
          <template v-if="step.status === 'completed'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M5 12l5 5L19 7" />
            </svg>
          </template>
          <template v-else-if="step.status === 'error'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </template>
          <template v-else>
            {{ index + 1 }}
          </template>
        </div>
        <div v-if="index < normalizedSteps.length - 1" class="ui-steps__line" />
      </div>
      <div class="ui-steps__content">
        <div class="ui-steps__title">{{ step.title }}</div>
        <div v-if="step.description" class="ui-steps__desc">{{ step.description }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UiStepItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiSteps',
})

const props = withDefaults(
  defineProps<{
    steps?: UiStepItem[]
    current?: number
    direction?: 'horizontal' | 'vertical'
    size?: 'default' | 'small'
    dot?: boolean
    clickable?: boolean
  }>(),
  {
    steps: () => [],
    current: 0,
    direction: 'horizontal',
    size: 'default',
    dot: false,
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

function handleClick(step: UiStepItem, index: number) {
  if (props.clickable && step.status !== 'pending') {
    emit('change', index, step)
  }
}
</script>

<style scoped>
.ui-steps {
  display: flex;
  width: 100%;
}

.ui-steps--horizontal {
  flex-direction: row;
}

.ui-steps--vertical {
  flex-direction: column;
}

/* ===== 水平布局 ===== */
.ui-steps--horizontal .ui-steps__item {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.ui-steps--horizontal .ui-steps__item:last-child {
  flex: none;
}

.ui-steps--horizontal .ui-steps__icon-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.ui-steps--horizontal .ui-steps__line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
  margin: 0 8px;
  margin-top: 16px;
}

.ui-steps--horizontal.ui-steps--small .ui-steps__line {
  margin-top: 12px;
}

.ui-steps--horizontal .ui-steps__content {
  position: absolute;
  top: 40px;
  left: 0;
  width: 140px;
  margin-left: -54px;
  text-align: center;
}

.ui-steps--horizontal.ui-steps--small .ui-steps__content {
  top: 32px;
  margin-left: -58px;
}

.ui-steps--horizontal .ui-steps__item:first-child .ui-steps__content {
  margin-left: 0;
  text-align: left;
}

.ui-steps--horizontal .ui-steps__item:last-child .ui-steps__content {
  margin-left: -108px;
  text-align: right;
}

/* ===== 垂直布局 ===== */
.ui-steps--vertical .ui-steps__item {
  display: flex;
  flex-direction: row;
  padding-bottom: 24px;
}

.ui-steps--vertical .ui-steps__item:last-child {
  padding-bottom: 0;
}

.ui-steps--vertical .ui-steps__icon-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 12px;
}

.ui-steps--vertical .ui-steps__line {
  flex: 1;
  width: 1px;
  background: #e2e8f0;
  margin: 8px 0;
}

.ui-steps--vertical .ui-steps__content {
  padding-top: 4px;
}

/* ===== 圆点图标 ===== */
.ui-steps__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  background: #f1f5f9;
  color: #94a3b8;
  border: 2px solid #e2e8f0;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.ui-steps--small .ui-steps__icon {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.ui-steps__icon svg {
  width: 14px;
  height: 14px;
}

.ui-steps--small .ui-steps__icon svg {
  width: 12px;
  height: 12px;
}

.ui-steps__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.4;
}

.ui-steps--small .ui-steps__title {
  font-size: 13px;
}

.ui-steps__desc {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  margin-top: 2px;
  line-height: 1.4;
}

/* ===== 状态：进行中 ===== */
.ui-steps__item--running .ui-steps__icon {
  background: #eff6ff;
  color: #2563eb;
  border-color: #3b82f6;
}

.ui-steps__item--running .ui-steps__title {
  color: #2563eb;
}

/* ===== 状态：已完成 ===== */
.ui-steps__item--completed .ui-steps__icon {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.ui-steps__item--completed .ui-steps__line {
  background: #3b82f6;
}

/* ===== 状态：错误 ===== */
.ui-steps__item--error .ui-steps__icon {
  background: #fef2f2;
  color: #ef4444;
  border-color: #ef4444;
}

.ui-steps__item--error .ui-steps__title {
  color: #ef4444;
}

/* ===== 状态：待处理 ===== */
.ui-steps__item--pending .ui-steps__title {
  color: #94a3b8;
}

/* ===== 可点击 ===== */
.ui-steps__item--clickable {
  cursor: pointer;
}

.ui-steps__item--clickable:hover .ui-steps__icon {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

/* ===== 圆点模式 ===== */
.ui-steps--dot .ui-steps__icon {
  width: 10px;
  height: 10px;
  font-size: 0;
  border-width: 0;
}

.ui-steps--dot .ui-steps__icon svg {
  display: none;
}

.ui-steps--dot .ui-steps__item--running .ui-steps__icon {
  background: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.ui-steps--dot .ui-steps__item--completed .ui-steps__icon {
  background: #3b82f6;
}

.ui-steps--dot .ui-steps__item--pending .ui-steps__icon {
  background: #cbd5e1;
}

.ui-steps--dot.ui-steps--vertical .ui-steps__line {
  left: 4px;
  top: 10px;
}

.ui-steps--dot .ui-steps__line {
  margin: 0 4px;
}
</style>
