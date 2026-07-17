<template>
  <div class="ui-arrow-timeline" :class="{ 'ui-arrow-timeline--compact': compact }">
    <button
      v-for="(stage, index) in normalizedStages"
      :key="stage.key"
      type="button"
      class="ui-arrow-timeline__stage"
      :class="[
        `ui-arrow-timeline__stage--${stage.status}`,
        { 'ui-arrow-timeline__stage--active': stage.key === activeKey },
        { 'ui-arrow-timeline__stage--first': index === 0 },
        { 'ui-arrow-timeline__stage--last': index === normalizedStages.length - 1 },
        { 'ui-arrow-timeline__stage--disabled': !allowPendingSelect && stage.status === 'pending' },
      ]"
      :disabled="!allowPendingSelect && stage.status === 'pending'"
      @click="handleStageClick(stage)"
    >
      <div class="ui-arrow-timeline__chevron">
        <svg class="ui-arrow-timeline__shape" viewBox="0 0 200 80" preserveAspectRatio="none">
          <!-- 第一个元素：左边平头 -->
          <path
            v-if="index === 0 && index === normalizedStages.length - 1"
            class="ui-arrow-timeline__shape-bg"
            d="M 4 4 L 196 4 L 196 76 L 4 76 Z"
          />
          <path
            v-else-if="index === 0"
            class="ui-arrow-timeline__shape-bg"
            d="M 4 4 L 180 4 L 196 40 L 180 76 L 4 76 Z"
          />
          <!-- 最后一个元素：右边平尾 -->
          <path
            v-else-if="index === normalizedStages.length - 1"
            class="ui-arrow-timeline__shape-bg"
            d="M 4 4 L 196 4 L 196 76 L 4 76 L 20 40 Z"
          />
          <!-- 中间元素：两边都是箭头 -->
          <path
            v-else
            class="ui-arrow-timeline__shape-bg"
            d="M 4 4 L 180 4 L 196 40 L 180 76 L 4 76 L 20 40 Z"
          />
        </svg>

        <div class="ui-arrow-timeline__body">
          <div class="ui-arrow-timeline__content">
            <div class="ui-arrow-timeline__header">
              <span class="ui-arrow-timeline__index">{{ index + 1 }}</span>
              <span class="ui-arrow-timeline__title">{{ stage.title }}</span>
            </div>
            <div v-if="stage.dateRange" class="ui-arrow-timeline__date">
              {{ stage.dateRange }}
            </div>
            <div v-if="stage.statusText" class="ui-arrow-timeline__status">
              <span
                class="ui-arrow-timeline__status-dot"
                :class="`ui-arrow-timeline__status-dot--${stage.status}`"
              />
              <span class="ui-arrow-timeline__status-text">{{ stage.statusText }}</span>
            </div>
            <div v-if="stage.progress !== undefined" class="ui-arrow-timeline__progress">
              <div class="ui-arrow-timeline__progress-bar">
                <div
                  class="ui-arrow-timeline__progress-fill"
                  :style="{ width: `${Math.min(stage.progress, 100)}%` }"
                />
              </div>
              <span class="ui-arrow-timeline__progress-text">{{ stage.progress }}%</span>
            </div>
            <div v-if="stage.metrics && stage.metrics.length" class="ui-arrow-timeline__metrics">
              <div
                v-for="metric in stage.metrics"
                :key="metric.label"
                class="ui-arrow-timeline__metric"
              >
                <span class="ui-arrow-timeline__metric-value">{{ metric.value }}</span>
                <span class="ui-arrow-timeline__metric-label">{{ metric.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { UiArrowTimelineStage } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiArrowTimeline',
})

const props = withDefaults(
  defineProps<{
    stages?: UiArrowTimelineStage[]
    activeKey?: string
    compact?: boolean
    /** 为 true 时 pending 阶段仍可点击（六步旅程轨导航） */
    allowPendingSelect?: boolean
  }>(),
  {
    stages: () => [],
    activeKey: '',
    compact: false,
    allowPendingSelect: false,
  },
)

const emit = defineEmits<{
  (e: 'select', stage: UiArrowTimelineStage): void
}>()

const normalizedStages = computed(() => {
  return props.stages.map((stage, index) => ({
    ...stage,
    key: stage.key || `stage-${index}`,
    status: stage.status || 'pending',
  }))
})

function handleStageClick(stage: UiArrowTimelineStage) {
  if (!props.allowPendingSelect && stage.status === 'pending') return
  emit('select', stage)
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-arrow-timeline {
  display: flex;
  gap: 0;
  width: 100%;
  overflow-x: auto;
}

.ui-arrow-timeline__stage {
  flex: 1;
  min-width: 120px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
  transition: transform var(--dp-duration-fast) ease;
}

.ui-arrow-timeline__stage:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
  z-index: 2;
  position: relative;
}

.ui-arrow-timeline__stage:hover:not(.ui-arrow-timeline__stage--disabled) {
  filter: brightness(0.97);
}

.ui-arrow-timeline__stage--disabled {
  cursor: not-allowed;
}

.ui-arrow-timeline__chevron {
  position: relative;
  min-height: 88px;
  height: 100%;
}

.ui-arrow-timeline__shape {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ui-arrow-timeline__shape-bg {
  fill: var(--dp-surface-subtle);
  stroke: var(--dp-border);
  stroke-width: 1;
  transition: all 0.2s ease;
}

.ui-arrow-timeline__body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 100%;
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px) var(--dp-space-3, 12px) 28px;
}

/* 第一个元素内容区左侧 padding 调整 */
.ui-arrow-timeline__stage--first .ui-arrow-timeline__body {
  padding-left: var(--dp-space-3, 12px);
}

/* 最后一个元素内容区右侧 padding 调整 */
.ui-arrow-timeline__stage--last .ui-arrow-timeline__body {
  padding-right: var(--dp-space-3, 12px);
}

/* ===== 状态：待处理（浅灰色，禁用） ===== */
.ui-arrow-timeline__stage--pending .ui-arrow-timeline__shape-bg {
  fill: var(--dp-surface-subtle);
  stroke: var(--dp-border);
}

.ui-arrow-timeline__stage--pending .ui-arrow-timeline__title,
.ui-arrow-timeline__stage--pending .ui-arrow-timeline__date,
.ui-arrow-timeline__stage--pending .ui-arrow-timeline__status-text {
  color: var(--dp-text-muted);
}

.ui-arrow-timeline__stage--pending .ui-arrow-timeline__index {
  background: var(--dp-border);
  color: var(--dp-text-muted);
}

.ui-arrow-timeline__stage--pending .ui-arrow-timeline__status-dot {
  background: var(--dp-border-strong);
}

/* ===== 状态：进行中（淡蓝色背景 + 深蓝色边框） ===== */
.ui-arrow-timeline__stage--running .ui-arrow-timeline__shape-bg,
.ui-arrow-timeline__stage--active .ui-arrow-timeline__shape-bg {
  fill: var(--dp-blue-50);
  stroke: var(--dp-blue-500);
}

.ui-arrow-timeline__stage--running .ui-arrow-timeline__title,
.ui-arrow-timeline__stage--active .ui-arrow-timeline__title {
  color: var(--dp-blue-700);
}

.ui-arrow-timeline__stage--running .ui-arrow-timeline__index,
.ui-arrow-timeline__stage--active .ui-arrow-timeline__index {
  background: var(--dp-blue-500);
  color: var(--dp-text-inverse);
}

.ui-arrow-timeline__stage--running .ui-arrow-timeline__status-dot,
.ui-arrow-timeline__stage--active .ui-arrow-timeline__status-dot {
  background: var(--dp-blue-500);
}

.ui-arrow-timeline__stage--running .ui-arrow-timeline__progress-fill,
.ui-arrow-timeline__stage--active .ui-arrow-timeline__progress-fill {
  background: var(--dp-blue-500);
}

/* ===== 状态：已完成（灰色背景 + 深灰色边框） ===== */
.ui-arrow-timeline__stage--completed .ui-arrow-timeline__shape-bg,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__shape-bg {
  fill: var(--dp-surface-muted);
  stroke: var(--dp-text-muted);
}

.ui-arrow-timeline__stage--completed .ui-arrow-timeline__title,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__title {
  color: var(--dp-text-secondary);
}

.ui-arrow-timeline__stage--completed .ui-arrow-timeline__index,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__index {
  background: var(--dp-text-muted);
  color: var(--dp-text-inverse);
}

.ui-arrow-timeline__stage--completed .ui-arrow-timeline__status-dot,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__status-dot {
  background: var(--dp-text-muted);
}

.ui-arrow-timeline__stage--completed .ui-arrow-timeline__progress-bar,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__progress-bar {
  background: color-mix(in srgb, var(--dp-text-muted) 20%, transparent);
}

.ui-arrow-timeline__stage--completed .ui-arrow-timeline__progress-fill,
.ui-arrow-timeline__stage--done .ui-arrow-timeline__progress-fill {
  background: var(--dp-text-muted);
}

/* ===== 状态：警告 ===== */
.ui-arrow-timeline__stage--warning .ui-arrow-timeline__shape-bg {
  fill: var(--dp-orange-50);
  stroke: var(--dp-orange-500);
}

.ui-arrow-timeline__stage--warning .ui-arrow-timeline__index {
  background: var(--dp-orange-500);
  color: var(--dp-text-inverse);
}

.ui-arrow-timeline__stage--warning .ui-arrow-timeline__status-dot {
  background: var(--dp-orange-500);
}

/* ===== 状态：错误 ===== */
.ui-arrow-timeline__stage--error .ui-arrow-timeline__shape-bg {
  fill: var(--dp-red-50);
  stroke: var(--dp-red-500);
}

.ui-arrow-timeline__stage--error .ui-arrow-timeline__index {
  background: var(--dp-red-500);
  color: var(--dp-text-inverse);
}

.ui-arrow-timeline__stage--error .ui-arrow-timeline__status-dot {
  background: var(--dp-red-500);
}

/* ===== 内容区 ===== */
.ui-arrow-timeline__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  align-items: center;
  text-align: center;
}

.ui-arrow-timeline__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ui-arrow-timeline__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dp-text-muted);
  background: color-mix(in srgb, var(--dp-text-muted) 15%, transparent);
  border-radius: 50%;
  flex-shrink: 0;
}

.ui-arrow-timeline__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
  line-height: 1.4;
}

.ui-arrow-timeline__date {
  font-size: 12px;
  color: var(--dp-text-muted);
  line-height: 1.3;
}

.ui-arrow-timeline__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.ui-arrow-timeline__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dp-text-muted);
}

.ui-arrow-timeline__status-text {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

/* ===== 进度条 ===== */
.ui-arrow-timeline__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.ui-arrow-timeline__progress-bar {
  flex: 1;
  height: 4px;
  background: color-mix(in srgb, var(--dp-text-muted) 25%, transparent);
  border-radius: 2px;
  overflow: hidden;
}

.ui-arrow-timeline__progress-fill {
  height: 100%;
  background: var(--dp-color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.ui-arrow-timeline__progress-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--dp-text-secondary);
  min-width: 32px;
  text-align: right;
}

/* ===== 指标区 ===== */
.ui-arrow-timeline__metrics {
  display: flex;
  gap: var(--dp-space-3, 12px);
  margin-top: 6px;
}

.ui-arrow-timeline__metric {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ui-arrow-timeline__metric-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--dp-text-primary);
  line-height: 1.2;
}

.ui-arrow-timeline__metric-label {
  font-size: 11px;
  color: var(--dp-text-muted);
}

/* ===== 紧凑模式 ===== */
.ui-arrow-timeline--compact .ui-arrow-timeline__chevron {
  min-height: 64px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__body {
  padding: var(--dp-space-2, 8px) var(--dp-space-4, 16px) var(--dp-space-2, 8px) var(--dp-space-3, 12px);
}

.ui-arrow-timeline--compact .ui-arrow-timeline__stage--first .ui-arrow-timeline__body {
  padding-left: 12px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__stage--last .ui-arrow-timeline__body {
  padding-right: 12px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__stage {
  min-width: 110px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__title {
  font-size: 12px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__date {
  font-size: 11px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__metrics {
  display: none;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__progress {
  display: none;
}

/* ===== 响应式 ===== */
@media (max-width: bp.$layout-mobile-max) {
  .ui-arrow-timeline {
    flex-direction: column;
    gap: 6px;
  }

  .ui-arrow-timeline__stage {
    min-width: auto;
  }

  .ui-arrow-timeline__shape-bg {
    d: path('M 4 4 L 196 4 L 196 76 L 4 76 Z');
  }

  .ui-arrow-timeline__body {
    padding: 12px 16px !important;
  }
}
</style>
