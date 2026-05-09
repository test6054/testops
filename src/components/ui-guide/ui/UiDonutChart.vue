<template>
  <section class="ui-donut-chart" v-bind="$attrs">
    <div class="ui-donut-chart__canvas-wrap">
      <svg
        class="ui-donut-chart__svg"
        :viewBox="`0 0 ${props.size} ${props.size}`"
        role="img"
        aria-label="donut chart"
      >
        <circle
          class="ui-donut-chart__track"
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke-width="props.strokeWidth"
        />

        <circle
          v-for="item in segments"
          :key="item.key"
          class="ui-donut-chart__segment"
          :class="{ 'ui-donut-chart__segment--active': currentActiveKey === item.key }"
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke="item.color"
          :stroke-width="currentActiveKey === item.key ? props.strokeWidth + 2 : props.strokeWidth"
          :stroke-dasharray="item.dasharray"
          :stroke-dashoffset="item.dashoffset"
          @click="handleSelect(item.key)"
        />
      </svg>

      <div class="ui-donut-chart__center">
        <div v-if="props.centerLabel" class="ui-donut-chart__center-label">{{ props.centerLabel }}</div>
        <div class="ui-donut-chart__center-value">{{ centerValueText }}</div>
        <div v-if="props.centerHelper" class="ui-donut-chart__center-helper">{{ props.centerHelper }}</div>
      </div>
    </div>

    <div v-if="props.showLegend" class="ui-donut-chart__legend">
      <button
        v-for="item in segments"
        :key="item.key"
        type="button"
        class="ui-donut-chart__legend-item"
        :class="{ 'ui-donut-chart__legend-item--active': currentActiveKey === item.key }"
        @click="handleSelect(item.key)"
      >
        <span class="ui-donut-chart__legend-dot" :style="{ backgroundColor: item.color }" />
        <div class="ui-donut-chart__legend-main">
          <div class="ui-donut-chart__legend-head">
            <span class="ui-donut-chart__legend-label">{{ item.label }}</span>
            <span class="ui-donut-chart__legend-value">{{ item.value }}</span>
          </div>
          <div class="ui-donut-chart__legend-helper">
            <span>{{ item.percent }}%</span>
            <span v-if="item.helper">· {{ item.helper }}</span>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiChartSliceItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiDonutChart',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  items?: UiChartSliceItem[]
  modelValue?: string
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string | number
  centerHelper?: string
  showLegend?: boolean
}>(), {
  items: () => [],
  modelValue: '',
  size: 220,
  strokeWidth: 18,
  centerLabel: '',
  centerValue: '',
  centerHelper: '',
  showLegend: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const toneColorMap: Record<BadgeTone, string> = {
  gray: 'var(--dp-gray-400, #94a3b8)',
  blue: 'var(--ant-color-primary, #2563eb)',
  orange: 'var(--ant-color-warning, #f59e0b)',
  green: 'var(--ant-color-success, #16a34a)',
  yellow: 'var(--dp-yellow-600, #ca8a04)',
  red: 'var(--ant-color-error, #dc2626)',
  purple: 'var(--dp-purple-500, #7c3aed)',
}

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const total = computed(() => {
  return props.items.reduce((sum, item) => sum + Math.max(item.value, 0), 0)
})

const normalizedItems = computed(() => {
  return props.items.map((item, index) => ({
    ...item,
    key: item.key || `${item.label}-${index}`,
    color: item.color || toneColorMap[item.tone || 'blue'],
  }))
})

const currentActiveKey = computed(() => {
  return props.modelValue || normalizedItems.value[0]?.key || ''
})

const segments = computed(() => {
  let offset = 0
  const gap = normalizedItems.value.length > 1 ? 4 : 0

  return normalizedItems.value.map((item) => {
    const value = Math.max(item.value, 0)
    const rawLength = total.value > 0 ? (value / total.value) * circumference.value : 0
    const visibleLength = Math.max(rawLength - gap, 0)
    const dashoffset = -offset
    offset += rawLength

    return {
      ...item,
      percent: total.value > 0 ? Number(((value / total.value) * 100).toFixed(1)) : 0,
      dasharray: `${visibleLength} ${circumference.value}`,
      dashoffset,
    }
  })
})

const centerValueText = computed(() => {
  if (props.centerValue !== '' && props.centerValue !== undefined && props.centerValue !== null) {
    return props.centerValue
  }

  return total.value
})

function handleSelect(key: string) {
  emit('update:modelValue', key)
  emit('select', key)
}
</script>

<style scoped>
.ui-donut-chart {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.ui-donut-chart__canvas-wrap {
  position: relative;
  width: min(100%, 260px);
  margin: 0 auto;
}

.ui-donut-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  transform: rotate(-90deg);
}

.ui-donut-chart__track,
.ui-donut-chart__segment {
  fill: none;
}

.ui-donut-chart__track {
  stroke: #e5e7eb;
}

.ui-donut-chart__segment {
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    stroke-width 0.2s ease,
    transform 0.2s ease;
  stroke-linecap: round;
  opacity: 0.86;
  transform-origin: center;
}

.ui-donut-chart__segment:hover,
.ui-donut-chart__segment--active {
  opacity: 1;
}

.ui-donut-chart__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  pointer-events: none;
}

.ui-donut-chart__center-label {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.ui-donut-chart__center-value {
  margin-top: 4px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--dp-text-primary, #0f172a);
}

.ui-donut-chart__center-helper {
  margin-top: 6px;
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
}

.ui-donut-chart__legend {
  display: grid;
  gap: 10px;
}

.ui-donut-chart__legend-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.ui-donut-chart__legend-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.2s ease;
}

.ui-donut-chart__legend-item:hover {
  background: #f3f7ff;
}

.ui-donut-chart__legend-item--active {
  background: #f8fbff;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
  transform: translateX(2px);
}

.ui-donut-chart__legend-item--active::before {
  background: var(--ant-color-primary, #2563eb);
}

.ui-donut-chart__legend-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  flex-shrink: 0;
  border-radius: 999px;
}

.ui-donut-chart__legend-main {
  min-width: 0;
  flex: 1;
}

.ui-donut-chart__legend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-donut-chart__legend-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-donut-chart__legend-value {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-donut-chart__legend-helper {
  margin-top: 6px;
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}
</style>
