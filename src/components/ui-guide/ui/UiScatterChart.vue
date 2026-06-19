<template>
  <section class="ui-scatter-chart" v-bind="$attrs">
    <div v-if="props.series.length" class="ui-scatter-chart__legend">
      <button
        v-for="item in props.series"
        :key="item.key"
        type="button"
        class="ui-scatter-chart__legend-item"
        :class="{ 'ui-scatter-chart__legend-item--hidden': hiddenKeys.has(item.key) }"
        @click="toggleSeries(item.key)"
      >
        <span class="ui-scatter-chart__legend-dot" :style="{ backgroundColor: item.color }" />
        {{ item.name }}
        <span class="ui-scatter-chart__legend-count">{{ item.points.length }}</span>
      </button>
    </div>

    <div class="ui-scatter-chart__frame">
      <div class="ui-scatter-chart__y-label">{{ props.yLabel }}</div>
      <div class="ui-scatter-chart__canvas">
        <svg
          class="ui-scatter-chart__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          role="img"
          :aria-label="props.ariaLabel"
        >
          <line
            v-for="row in gridRows"
            :key="`grid-y-${row.value}`"
            :x1="paddingLeft"
            :y1="row.y"
            :x2="viewWidth - paddingRight"
            :y2="row.y"
            class="ui-scatter-chart__grid"
          />
          <line
            v-for="col in gridColumns"
            :key="`grid-x-${col.value}`"
            :x1="col.x"
            :y1="paddingTop"
            :x2="col.x"
            :y2="viewHeight - paddingBottom"
            class="ui-scatter-chart__grid"
          />

          <rect
            v-if="props.showIdealZone && idealZoneRect"
            class="ui-scatter-chart__ideal-zone"
            v-bind="idealZoneRect"
            rx="4"
          />

          <line
            :x1="paddingLeft"
            :y1="viewHeight - paddingBottom"
            :x2="viewWidth - paddingRight"
            :y2="viewHeight - paddingBottom"
            class="ui-scatter-chart__axis"
          />
          <line
            :x1="paddingLeft"
            :y1="paddingTop"
            :x2="paddingLeft"
            :y2="viewHeight - paddingBottom"
            class="ui-scatter-chart__axis"
          />

          <text
            v-for="row in gridRows"
            :key="`label-y-${row.value}`"
            :x="paddingLeft - 8"
            :y="row.y + 4"
            class="ui-scatter-chart__tick"
            text-anchor="end"
          >
            {{ row.label }}
          </text>
          <text
            v-for="col in gridColumns"
            :key="`label-x-${col.value}`"
            :x="col.x"
            :y="viewHeight - paddingBottom + 18"
            class="ui-scatter-chart__tick"
            text-anchor="middle"
          >
            {{ col.label }}
          </text>

          <g v-for="node in pointNodes" :key="node.key">
            <circle
              class="ui-scatter-chart__dot-hit"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius + 4"
              @click="handleSelect(node.key)"
            />
            <circle
              class="ui-scatter-chart__dot"
              :class="{ 'ui-scatter-chart__dot--active': activeKey === node.key }"
              :cx="node.x"
              :cy="node.y"
              :r="node.radius"
              :fill="node.color"
              @click="handleSelect(node.key)"
            />
          </g>
        </svg>

        <div
          v-if="activePoint"
          class="ui-scatter-chart__bubble"
          :style="activeBubbleStyle"
        >
          <div class="ui-scatter-chart__bubble-label">{{ activePoint.label }}</div>
          <div v-if="activePoint.helper" class="ui-scatter-chart__bubble-helper">
            {{ activePoint.helper }}
          </div>
        </div>
      </div>
    </div>

    <div class="ui-scatter-chart__x-label">{{ props.xLabel }}</div>
  </section>
</template>

<script lang="ts" setup>
import type { UiScatterPoint, UiScatterSeries } from './types'
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiScatterChart',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  series?: UiScatterSeries[]
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  xLabel?: string
  yLabel?: string
  showIdealZone?: boolean
  ariaLabel?: string
}>(), {
  series: () => [],
  xMin: 0,
  xMax: 1,
  yMin: -0.2,
  yMax: 1,
  xLabel: '横轴',
  yLabel: '纵轴',
  showIdealZone: false,
  ariaLabel: 'scatter chart',
})

const viewWidth = 640
const viewHeight = 320
const paddingLeft = 56
const paddingRight = 16
const paddingTop = 40
const paddingBottom = 44

const hiddenKeys = ref<Set<string>>(new Set())
const activeKey = ref('')

const plotWidth = viewWidth - paddingLeft - paddingRight
const plotHeight = viewHeight - paddingTop - paddingBottom

function toPlotX(value: number): number {
  const span = props.xMax - props.xMin
  if (span <= 0) return paddingLeft
  return paddingLeft + ((value - props.xMin) / span) * plotWidth
}

function toPlotY(value: number): number {
  const span = props.yMax - props.yMin
  if (span <= 0) return paddingTop
  return paddingTop + plotHeight - ((value - props.yMin) / span) * plotHeight
}

function resolveRadius(weight: number | undefined): number {
  const total = weight ?? 1
  return Math.min(20, 5 + Math.sqrt(total) * 1.2)
}

function formatAxisLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const gridRows = computed(() => {
  const steps = 5
  const span = props.yMax - props.yMin
  return Array.from({ length: steps + 1 }, (_, index) => {
    const value = props.yMin + (span / steps) * index
    return {
      value,
      label: formatAxisLabel(value),
      y: toPlotY(value),
    }
  })
})

const gridColumns = computed(() => {
  const steps = 5
  const span = props.xMax - props.xMin
  return Array.from({ length: steps + 1 }, (_, index) => {
    const value = props.xMin + (span / steps) * index
    return {
      value,
      label: formatAxisLabel(value),
      x: toPlotX(value),
    }
  })
})

const idealZoneRect = computed(() => {
  if (!props.showIdealZone) return null
  const x = toPlotX(0.3)
  const y = toPlotY(1)
  const width = toPlotX(0.8) - x
  const height = toPlotY(0.4) - y
  return { x, y, width, height }
})

const visiblePoints = computed(() => {
  const points: Array<UiScatterPoint & { color: string }> = []
  for (const series of props.series) {
    if (hiddenKeys.value.has(series.key)) continue
    for (const point of series.points) {
      points.push({
        ...point,
        color: point.color || series.color,
      })
    }
  }
  return points
})

const pointNodes = computed(() => {
  return visiblePoints.value.map((point) => ({
    key: point.key,
    x: toPlotX(point.x),
    y: toPlotY(point.y),
    radius: resolveRadius(point.weight),
    color: point.color || '#2563eb',
    label: point.label,
    helper: point.helper,
  }))
})

const activePoint = computed(() => pointNodes.value.find((point) => point.key === activeKey.value))

const activeBubbleStyle = computed(() => {
  if (!activePoint.value) return {}
  const leftPercent = (activePoint.value.x / viewWidth) * 100
  const topPercent = (activePoint.value.y / viewHeight) * 100
  return {
    left: `${Math.min(88, Math.max(8, leftPercent))}%`,
    top: `${Math.max(6, topPercent - 14)}%`,
  }
})

function toggleSeries(key: string): void {
  const next = new Set(hiddenKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  hiddenKeys.value = next
  if (activeKey.value && !visiblePoints.value.some((point) => point.key === activeKey.value)) {
    activeKey.value = ''
  }
}

function handleSelect(key: string): void {
  activeKey.value = activeKey.value === key ? '' : key
}
</script>

<style scoped>
.ui-scatter-chart {
  min-width: 0;
}

.ui-scatter-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.ui-scatter-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: var(--dp-radius-sm, 4px);
  background: transparent;
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
  cursor: pointer;
}

.ui-scatter-chart__legend-item:hover {
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-scatter-chart__legend-item--hidden {
  opacity: 0.45;
  text-decoration: line-through;
}

.ui-scatter-chart__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ui-scatter-chart__legend-count {
  color: var(--dp-text-muted, #64748b);
}

.ui-scatter-chart__frame {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.ui-scatter-chart__y-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.ui-scatter-chart__canvas {
  position: relative;
  min-width: 0;
}

.ui-scatter-chart__svg {
  display: block;
  width: 100%;
  height: auto;
}

.ui-scatter-chart__grid {
  stroke: var(--dp-border, #e2e8f0);
  stroke-width: 1;
}

.ui-scatter-chart__axis {
  stroke: var(--dp-gray-400, #94a3b8);
  stroke-width: 1;
}

.ui-scatter-chart__tick {
  fill: var(--dp-text-muted, #64748b);
  font-size: 10px;
}

.ui-scatter-chart__ideal-zone {
  fill: rgba(22, 163, 74, 0.08);
  stroke: rgba(22, 163, 74, 0.25);
  stroke-width: 1;
}

.ui-scatter-chart__dot {
  stroke: #fff;
  stroke-width: 1;
  opacity: 0.85;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.ui-scatter-chart__dot--active {
  opacity: 1;
  stroke-width: 2;
}

.ui-scatter-chart__dot-hit {
  fill: transparent;
  cursor: pointer;
}

.ui-scatter-chart__bubble {
  position: absolute;
  z-index: 1;
  max-width: 220px;
  padding: 8px 10px;
  border-radius: var(--dp-radius-sm, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  pointer-events: none;
  transform: translate(-50%, -100%);
}

.ui-scatter-chart__bubble-label {
  font-size: 12px;
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-primary, #0f172a);
}

.ui-scatter-chart__bubble-helper {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-muted, #64748b);
}

.ui-scatter-chart__x-label {
  margin-top: 4px;
  text-align: center;
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}
</style>
