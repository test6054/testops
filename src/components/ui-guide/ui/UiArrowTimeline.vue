<template>
  <div
    class="ui-arrow-timeline"
    :class="{ 'ui-arrow-timeline--compact': compact }"
    :style="{ '--node-count': normalizedStages.length }"
    role="navigation"
    aria-label="考试旅程进度"
  >
    <!-- 轨道线 -->
    <div class="ui-arrow-timeline__track" aria-hidden="true">
      <div class="ui-arrow-timeline__track-fill" :style="{ width: `${progressPercent}%` }" />
    </div>

    <!-- 节点列表 -->
    <div class="ui-arrow-timeline__nodes">
      <button
        v-for="(stage, index) in normalizedStages"
        :key="stage.key"
        type="button"
        class="ui-arrow-timeline__node"
        :class="[
          `ui-arrow-timeline__node--${stage.status}`,
          { 'ui-arrow-timeline__node--selected': stage.key === activeKey },
          { 'ui-arrow-timeline__node--disabled': !allowPendingSelect && stage.status === 'pending' },
        ]"
        :disabled="!allowPendingSelect && stage.status === 'pending'"
        :aria-current="stage.key === activeKey ? 'step' : undefined"
        :aria-label="`${stage.title}${stage.statusText ? `，${stage.statusText}` : ''}`"
        @click="handleStageClick(stage)"
      >
        <!-- 圆形节点 -->
        <span class="ui-arrow-timeline__dot">
          <svg
            v-if="stage.status === 'completed' || stage.status === 'done'"
            class="ui-arrow-timeline__check"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else-if="stage.status === 'warning'"
            class="ui-arrow-timeline__warn-icon"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M6 3.5V6.5M6 8.5V8.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else-if="stage.status === 'error'"
            class="ui-arrow-timeline__error-icon"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <span v-else class="ui-arrow-timeline__dot-num">{{ index + 1 }}</span>
        </span>

        <!-- 标签区 -->
        <span class="ui-arrow-timeline__label">
          <span class="ui-arrow-timeline__title">{{ stage.title }}</span>
          <span v-if="stage.statusText || stage.dateRange" class="ui-arrow-timeline__sub">
            {{ stage.statusText || stage.dateRange }}
          </span>
          <span
            v-else-if="stage.progress !== undefined"
            class="ui-arrow-timeline__sub ui-arrow-timeline__sub--progress"
          >
            {{ stage.progress }}%
          </span>
        </span>

        <!-- 指标区（非 compact 时显示） -->
        <span v-if="stage.metrics && stage.metrics.length" class="ui-arrow-timeline__metrics">
          <span
            v-for="metric in stage.metrics"
            :key="metric.label"
            class="ui-arrow-timeline__metric"
          >
            <span class="ui-arrow-timeline__metric-value">{{ metric.value }}</span>
            <span class="ui-arrow-timeline__metric-label">{{ metric.label }}</span>
          </span>
        </span>
      </button>
    </div>
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

/** 全局进度百分比：基于已完成 + 当前活跃节点位置 */
const progressPercent = computed(() => {
  const total = normalizedStages.value.length
  if (total <= 1) return 0
  // 找到最远的"已触达"节点（completed/done/active/running/warning/error）
  let reachedIndex = -1
  normalizedStages.value.forEach((s, i) => {
    if (s.status !== 'pending') {
      reachedIndex = i
    }
  })
  if (reachedIndex < 0) return 0
  return (reachedIndex / (total - 1)) * 100
})

function handleStageClick(stage: UiArrowTimelineStage) {
  if (!props.allowPendingSelect && stage.status === 'pending') return
  emit('select', stage)
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;

.ui-arrow-timeline {
  position: relative;
  width: 100%;
  padding: var(--dp-space-block) var(--dp-space-component-tight) var(--dp-space-component);
  overflow-x: auto;
}

/* ===== 轨道线 ===== */
.ui-arrow-timeline__track {
  position: absolute;
  top: calc(var(--dp-space-block) + 13px);
  left: calc(100% / var(--node-count, 6) / 2 + var(--dp-space-component-tight));
  right: calc(100% / var(--node-count, 6) / 2 + var(--dp-space-component-tight));
  height: 3px;
  background: var(--dp-gray-200, #e2e8f0);
  border-radius: 2px;
  overflow: hidden;
}

.ui-arrow-timeline__track-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--dp-green-500), var(--dp-blue-500));
  border-radius: 2px;
  transition: width var(--dp-duration-emphasis) cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== 节点容器 ===== */
.ui-arrow-timeline__nodes {
  position: relative;
  display: flex;
  justify-content: space-between;
  z-index: 1;
}

/* ===== 单个节点按钮 ===== */
.ui-arrow-timeline__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 72px;
  max-width: 130px;
  flex: 1;
  padding: 0 var(--dp-space-component-xs);
  border: none;
  background: transparent;
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: transform var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-arrow-timeline__node:focus-visible {
  outline: none;
  border-radius: var(--dp-radius-control, 6px);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-arrow-timeline__node:hover:not(.ui-arrow-timeline__node--disabled) {
  transform: var(--dp-lift-sm);
}

.ui-arrow-timeline__node--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

/* ===== 圆形节点 ===== */
.ui-arrow-timeline__dot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--dp-gray-300, #cbd5e1);
  background: var(--dp-surface, #fff);
  color: var(--dp-text-muted, #94a3b8);
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
  transition:
    background var(--dp-duration-fast) var(--dp-ease-default),
    border-color var(--dp-duration-fast) var(--dp-ease-default),
    box-shadow var(--dp-duration-fast) var(--dp-ease-default),
    transform var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-arrow-timeline__dot-num {
  font-size: var(--dp-font-size-xs);
  font-weight: 700;
  line-height: 1;
}

.ui-arrow-timeline__check,
.ui-arrow-timeline__warn-icon,
.ui-arrow-timeline__error-icon {
  width: 12px;
  height: 12px;
}

/* ===== 状态：已完成 ===== */
.ui-arrow-timeline__node--completed .ui-arrow-timeline__dot,
.ui-arrow-timeline__node--done .ui-arrow-timeline__dot {
  background: var(--dp-green-500);
  border-color: var(--dp-green-500);
  color: var(--dp-text-inverse, #fff);
}

/* ===== 状态：进行中 / 活跃 ===== */
.ui-arrow-timeline__node--running .ui-arrow-timeline__dot,
.ui-arrow-timeline__node--active .ui-arrow-timeline__dot {
  background: var(--dp-blue-500);
  border-color: var(--dp-blue-500);
  color: var(--dp-text-inverse, #fff);
  transform: scale(1.15);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-blue-500) 18%, transparent);
}

/* ===== 状态：警告 ===== */
.ui-arrow-timeline__node--warning .ui-arrow-timeline__dot {
  background: var(--dp-orange-500, #f97316);
  border-color: var(--dp-orange-500, #f97316);
  color: var(--dp-text-inverse, #fff);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-orange-500, #f97316) 15%, transparent);
}

/* ===== 状态：错误 ===== */
.ui-arrow-timeline__node--error .ui-arrow-timeline__dot {
  background: var(--dp-red-500, #ef4444);
  border-color: var(--dp-red-500, #ef4444);
  color: var(--dp-text-inverse, #fff);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-red-500, #ef4444) 15%, transparent);
}

/* ===== 状态：待处理 ===== */
.ui-arrow-timeline__node--pending .ui-arrow-timeline__dot {
  border-color: var(--dp-gray-300, #cbd5e1);
  background: var(--dp-surface, #fff);
  color: var(--dp-text-muted, #94a3b8);
}

/* ===== 选中标记 ===== */
.ui-arrow-timeline__node--selected .ui-arrow-timeline__dot {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-blue-500) 22%, transparent);
}

.ui-arrow-timeline__node--selected.ui-arrow-timeline__node--pending .ui-arrow-timeline__dot {
  border-color: var(--dp-blue-500, #60a5fa);
  color: var(--dp-blue-500);
}

/* ===== 标签区 ===== */
.ui-arrow-timeline__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.ui-arrow-timeline__title {
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  color: var(--dp-text-primary, #1e293b);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: color var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-arrow-timeline__node--pending .ui-arrow-timeline__title {
  color: var(--dp-text-muted, #94a3b8);
}

.ui-arrow-timeline__node--running .ui-arrow-timeline__title,
.ui-arrow-timeline__node--active .ui-arrow-timeline__title,
.ui-arrow-timeline__node--selected .ui-arrow-timeline__title {
  color: var(--dp-blue-700, #1d4ed8);
}

.ui-arrow-timeline__node--warning .ui-arrow-timeline__title {
  color: var(--dp-orange-600, #ea580c);
}

.ui-arrow-timeline__node--error .ui-arrow-timeline__title {
  color: var(--dp-red-600, #dc2626);
}

.ui-arrow-timeline__sub {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted, #94a3b8);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.ui-arrow-timeline__sub--progress {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-blue-600);
}

/* ===== 指标区 ===== */
.ui-arrow-timeline__metrics {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-top: 2px;
}

.ui-arrow-timeline__metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.ui-arrow-timeline__metric-value {
  font-size: var(--dp-font-size-sm);
  font-weight: 700;
  color: var(--dp-text-primary, #1e293b);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.ui-arrow-timeline__metric-label {
  font-size: 10px;
  color: var(--dp-text-muted, #94a3b8);
}

/* ===== 紧凑模式 ===== */
.ui-arrow-timeline--compact {
  padding: var(--dp-space-component) var(--dp-space-component-tight);
}

.ui-arrow-timeline--compact .ui-arrow-timeline__track {
  top: calc(var(--dp-space-component) + 11px);
}

.ui-arrow-timeline--compact .ui-arrow-timeline__dot {
  width: 24px;
  height: 24px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__dot-num {
  font-size: 10px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__check,
.ui-arrow-timeline--compact .ui-arrow-timeline__warn-icon,
.ui-arrow-timeline--compact .ui-arrow-timeline__error-icon {
  width: 10px;
  height: 10px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__node {
  gap: var(--dp-space-component-tight);
  min-width: 60px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__title {
  font-size: var(--dp-font-size-xs);
}

.ui-arrow-timeline--compact .ui-arrow-timeline__sub {
  font-size: 10px;
}

.ui-arrow-timeline--compact .ui-arrow-timeline__metrics {
  display: none;
}

/* ===== Active 节点脉冲动画 ===== */
@keyframes node-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--dp-blue-500) 18%, transparent);
  }
  50% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--dp-blue-500) 8%, transparent);
  }
}

.ui-arrow-timeline__node--running .ui-arrow-timeline__dot,
.ui-arrow-timeline__node--active .ui-arrow-timeline__dot {
  animation: node-pulse 2.4s ease-in-out infinite;
}

/* ===== 响应式：移动端转垂直 ===== */
@media (max-width: bp.$layout-mobile-max) {
  .ui-arrow-timeline {
    padding: var(--dp-space-component);
    overflow-x: visible;
  }

  .ui-arrow-timeline__track {
    left: calc(var(--dp-space-component) + 11px);
    right: auto;
    top: calc(var(--dp-space-component) + 24px);
    width: 3px;
    height: calc(100% - 48px);
  }

  .ui-arrow-timeline__track-fill {
    width: 100% !important;
    height: 50%;
  }

  .ui-arrow-timeline__nodes {
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  .ui-arrow-timeline__node {
    flex-direction: row;
    align-items: center;
    gap: var(--dp-space-component);
    min-width: auto;
    max-width: none;
    text-align: left;
    padding: var(--dp-space-component-xs) 0;
  }

  .ui-arrow-timeline__label {
    align-items: flex-start;
  }

  .ui-arrow-timeline__metrics {
    margin-top: 0;
    margin-left: auto;
  }
}

/* ===== 无障碍：减少动效 ===== */
@media (prefers-reduced-motion: reduce) {
  .ui-arrow-timeline__dot,
  .ui-arrow-timeline__node,
  .ui-arrow-timeline__track-fill,
  .ui-arrow-timeline__title {
    transition: none;
    animation: none;
  }

  .ui-arrow-timeline__node:hover:not(.ui-arrow-timeline__node--disabled) {
    transform: none;
  }

  .ui-arrow-timeline__node--running .ui-arrow-timeline__dot,
  .ui-arrow-timeline__node--active .ui-arrow-timeline__dot {
    transform: scale(1.15);
    animation: none;
  }
}
</style>
