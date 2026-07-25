<template>
  <UiArrowTimeline
    v-if="variant === 'arrow'"
    :stages="timelineStages"
    :active-key="activeKey"
    :compact="compact"
    :allow-pending-select="allowPendingSelect"
    @select="handleTimelineSelect"
  />
  <div
    v-else
    class="stage-rail-panel"
    :class="{ 'stage-rail-panel--compact': compact }"
    role="navigation"
    aria-label="阶段进度"
  >
    <template v-for="(stage, index) in stages" :key="stage.key">
      <button
        type="button"
        class="stage-rail-panel__item"
        :class="[
          panelItemClass(stage),
          {
            'stage-rail-panel__item--selected': stage.key === activeKey,
          },
        ]"
        :disabled="!isSelectable(stage)"
        :aria-current="stage.key === activeKey ? 'step' : undefined"
        @click="handlePanelSelect(stage)"
      >
        <div class="stage-rail-panel__number">
          <CheckOutlined v-if="stage.status === 'completed'" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="stage-rail-panel__info">
          <div class="stage-rail-panel__title">{{ stage.title }}</div>
          <div class="stage-rail-panel__metric">
            {{ resolveStageMetric(stage) || '\u00A0' }}
          </div>
        </div>
      </button>
      <div
        v-if="index < stages.length - 1"
        class="stage-rail-panel__chevron"
        :class="`stage-rail-panel__chevron--${stage.status}`"
        aria-hidden="true"
      >
        <svg width="18" height="32" viewBox="0 0 18 32" fill="none">
          <path
            d="M3 4L14 16L3 28"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { UiArrowTimelineStage } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage } from '@/types/workbench'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import { computed } from 'vue'
import UiArrowTimeline from '@/components/ui-guide/ui/UiArrowTimeline.vue'
import { WORKBENCH_STAGE_TO_TIMELINE } from '@/types/workbench'

defineOptions({
  name: 'StageRail',
})

const props = withDefaults(
  defineProps<{
    stages?: WorkbenchStage[]
    activeKey?: string
    compact?: boolean
    /** arrow：箭头 SVG 时间轴；panel：原型白底分段旅程轨 */
    variant?: 'arrow' | 'panel'
    /** 为 true 时 pending 阶段仍可点击（六步旅程轨导航） */
    allowPendingSelect?: boolean
  }>(),
  {
    stages: () => [],
    activeKey: '',
    compact: false,
    variant: 'panel',
    allowPendingSelect: false,
  },
)

const emit = defineEmits<{
  (e: 'select', stage: WorkbenchStage): void
}>()

const timelineStages = computed<UiArrowTimelineStage[]>(() =>
  props.stages.map((stage) => ({
    key: stage.key,
    title: stage.title,
    status: WORKBENCH_STAGE_TO_TIMELINE[stage.status] ?? 'pending',
    statusText: stage.statusText,
    dateRange: stage.dateRange,
    progress: stage.progress,
    metrics: stage.metrics,
  })),
)

function panelItemClass(stage: WorkbenchStage): string {
  if (stage.status === 'completed') return 'stage-rail-panel__item--completed'
  if (stage.status === 'active') return 'stage-rail-panel__item--active'
  if (stage.status === 'warning') return 'stage-rail-panel__item--warning'
  if (stage.status === 'error' || stage.status === 'blocked') return 'stage-rail-panel__item--error'
  return 'stage-rail-panel__item--pending'
}


function resolveStageMetric(stage: WorkbenchStage): string {
  if (stage.statusText) return stage.statusText
  const firstMetric = stage.metrics?.[0]
  if (firstMetric) {
    return `${firstMetric.value}${firstMetric.label ? ` ${firstMetric.label}` : ''}`
  }
  return ''
}

function isSelectable(stage: WorkbenchStage): boolean {
  return props.allowPendingSelect || stage.status !== 'pending'
}

function handleTimelineSelect(timelineStage: UiArrowTimelineStage) {
  const source = props.stages.find((item) => item.key === timelineStage.key)
  if (source) {
    emit('select', source)
  }
}

function handlePanelSelect(stage: WorkbenchStage) {
  emit('select', stage)
}
</script>

<style scoped>
@use '@/styles/breakpoints' as bp;

.stage-rail-panel {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: var(--dp-space-component-tight);
  background: var(--dp-surface);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-control-inner);
  box-shadow: none;
  overflow-x: auto;
}

.stage-rail-panel--compact {
  padding: var(--dp-space-component-tight) var(--dp-space-component);
}

.stage-rail-panel__item {
  flex: 1 1 0;
  min-width: 108px;
  min-height: 52px;
  position: relative;
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: none;
  border-radius: var(--dp-radius-control-inner);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dp-duration-fast) var(--dp-ease-default);
}

.stage-rail-panel__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.stage-rail-panel__item:hover:not(:disabled) {
  background: var(--dp-fill-quaternary);
}

.stage-rail-panel__item--selected,
.stage-rail-panel__item--active.stage-rail-panel__item--selected {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, var(--dp-surface));
}

.stage-rail-panel__item--active:not(.stage-rail-panel__item--selected) {
  background: color-mix(in srgb, var(--dp-color-primary) 5%, transparent);
}

.stage-rail-panel__item--warning:not(.stage-rail-panel__item--selected) {
  background: color-mix(in srgb, var(--dp-warning) 8%, transparent);
}

.stage-rail-panel__item:disabled {
  cursor: not-allowed;
}

.stage-rail-panel__number {
  width: 28px;
  height: 28px;
  border-radius: var(--dp-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--dp-font-size-xs);
  font-weight: var(--dp-font-weight-title);
  flex-shrink: 0;
}

.stage-rail-panel__item--completed .stage-rail-panel__number {
  background: var(--dp-green-500);
  color: var(--dp-text-inverse);
  font-size: var(--dp-font-size-xxs);
}

.stage-rail-panel__item--active .stage-rail-panel__number {
  background: var(--dp-blue-500);
  color: var(--dp-text-inverse);
}

.stage-rail-panel__item--warning .stage-rail-panel__number {
  background: var(--dp-orange-500);
  color: var(--dp-text-inverse);
}

.stage-rail-panel__item--error .stage-rail-panel__number {
  background: var(--dp-red-500);
  color: var(--dp-text-inverse);
}

.stage-rail-panel__item--pending .stage-rail-panel__number {
  background: var(--dp-gray-200);
  color: var(--dp-text-muted);
}

.stage-rail-panel__info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-height: 34px;
}

.stage-rail-panel__title {
  font-size: var(--dp-font-size-sm);
  line-height: 18px;
  font-weight: var(--dp-font-weight-emphasis);
  color: var(--dp-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-rail-panel__item--pending .stage-rail-panel__title {
  color: var(--dp-text-muted);
}

.stage-rail-panel__item--active .stage-rail-panel__title,
.stage-rail-panel__item--selected .stage-rail-panel__title {
  color: var(--dp-blue-700);
  font-weight: var(--dp-font-weight-title);
}

.stage-rail-panel__metric {
  min-height: 16px;
  font-size: var(--dp-type-hint-size);
  line-height: 16px;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-rail-panel__progress {
  height: 3px;
  margin-top: var(--dp-space-component-xs);
  background: var(--dp-gray-200);
  border-radius: var(--dp-radius-full);
  overflow: hidden;
}

.stage-rail-panel__progress--empty {
  background: transparent;
}

.stage-rail-panel__progress-bar {
  width: 100%;
  height: 100%;
  border-radius: var(--dp-radius-full);
  background: var(--dp-blue-500);
  transform-origin: left center;
  transition: transform var(--dp-duration-slow) var(--dp-ease-default);
}

.stage-rail-panel__item--completed .stage-rail-panel__progress-bar {
  background: var(--dp-green-500);
}

/* 阶段间箭头引导：独立于 item，保持引导姿态 */
.stage-rail-panel__chevron {
  flex: 0 0 20px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dp-gray-400, var(--dp-gray-300));
  pointer-events: none;
  align-self: stretch;
  opacity: 1;
}

.stage-rail-panel__chevron--active,
.stage-rail-panel__chevron--warning {
  color: color-mix(in srgb, var(--dp-color-primary) 45%, var(--dp-gray-300));
}

.stage-rail-panel__chevron--completed {
  color: color-mix(in srgb, var(--dp-success) 40%, var(--dp-gray-300));
}

@media (max-width: bp.$layout-mobile-max) {
  .stage-rail-panel {
    flex-direction: column;
    overflow-x: visible;
    gap: 0;
    padding: var(--dp-space-component-tight);
    align-items: stretch;
  }

  .stage-rail-panel__item {
    flex: none;
    width: 100%;
    min-width: 0;
    padding: var(--dp-space-component);
    border-bottom: 1px solid var(--dp-border);
  }

  .stage-rail-panel__item:last-of-type {
    border-bottom: none;
  }

  .stage-rail-panel__chevron {
    display: none;
  }

  .stage-rail-panel__title {
    white-space: normal;
  }
}
</style>
