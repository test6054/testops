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
    <button
      v-for="(stage, index) in stages"
      :key="stage.key"
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
        <div v-if="resolveStageMetric(stage)" class="stage-rail-panel__metric">
          {{ resolveStageMetric(stage) }}
        </div>
        <div
          v-if="stage.progress !== undefined && stage.status !== 'pending'"
          class="stage-rail-panel__progress"
        >
          <div
            class="stage-rail-panel__progress-bar"
            :style="{ width: `${Math.min(Math.max(stage.progress, 0), 100)}%` }"
          />
        </div>
      </div>
      <div v-if="index < stages.length - 1" class="stage-rail-panel__chevron" aria-hidden="true">
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path
            :fill="chevronFill(stage.status)"
            d="M0 0L16 12L0 24"
            stroke="var(--dp-border)"
            stroke-width="1"
          />
        </svg>
      </div>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { UiArrowTimelineStage } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { WORKBENCH_STAGE_TO_TIMELINE } from '@/types/workbench'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import { computed } from 'vue'
import UiArrowTimeline from '@/components/ui-guide/ui/UiArrowTimeline.vue'

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

function chevronFill(status: WorkbenchStageStatus): string {
  if (status === 'completed') return 'var(--dp-green-50)'
  if (status === 'active' || status === 'warning') return 'var(--dp-blue-50)'
  return 'var(--dp-gray-50)'
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
.stage-rail-panel {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  overflow-x: auto;
}

.stage-rail-panel--compact {
  padding: var(--dp-space-2) var(--dp-space-3);
}

.stage-rail-panel__item {
  flex: 1;
  min-width: 120px;
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dp-duration-fast) ease;
}

.stage-rail-panel__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
  border-radius: var(--dp-radius-control-inner);
}

.stage-rail-panel__item:hover:not(:disabled) {
  background: var(--dp-gray-50);
  border-radius: var(--dp-radius-control-inner);
}

.stage-rail-panel__item:disabled {
  cursor: not-allowed;
}

.stage-rail-panel__number {
  width: 24px;
  height: 24px;
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
  color: var(--ant-color-white);
  font-size: var(--dp-font-size-xxs);
}

.stage-rail-panel__item--active .stage-rail-panel__number {
  background: var(--dp-blue-500);
  color: var(--ant-color-white);
}

.stage-rail-panel__item--warning .stage-rail-panel__number {
  background: var(--dp-orange-500);
  color: var(--ant-color-white);
}

.stage-rail-panel__item--error .stage-rail-panel__number {
  background: var(--dp-red-500);
  color: var(--ant-color-white);
}

.stage-rail-panel__item--pending .stage-rail-panel__number {
  background: var(--dp-gray-200);
  color: var(--dp-text-muted);
}

.stage-rail-panel__info {
  min-width: 0;
  flex: 1;
}

.stage-rail-panel__title {
  font-size: var(--dp-font-size-sm);
  font-weight: var(--dp-font-weight-emphasis);
  color: var(--dp-text-primary);
  white-space: nowrap;
}

.stage-rail-panel__item--pending .stage-rail-panel__title {
  color: var(--dp-text-muted);
}

.stage-rail-panel__item--active .stage-rail-panel__title {
  color: var(--dp-blue-700);
  font-weight: var(--dp-font-weight-title);
}

.stage-rail-panel__metric {
  font-size: var(--dp-type-hint-size);
  line-height: var(--dp-type-hint-line-height);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.stage-rail-panel__progress {
  height: 3px;
  margin-top: var(--dp-space-1);
  background: var(--dp-gray-200);
  border-radius: var(--dp-radius-full);
  overflow: hidden;
}

.stage-rail-panel__progress-bar {
  height: 100%;
  border-radius: var(--dp-radius-full);
  background: var(--dp-blue-500);
  transition: width var(--dp-duration-slow) ease;
}

.stage-rail-panel__item--completed .stage-rail-panel__progress-bar {
  background: var(--dp-green-500);
}

.stage-rail-panel__chevron {
  position: absolute;
  right: calc(-1 * var(--dp-space-2));
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  pointer-events: none;
}
</style>
