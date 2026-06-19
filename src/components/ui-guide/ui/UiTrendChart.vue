<template>
  <section class="ui-trend-chart" v-bind="$attrs">
    <div class="ui-trend-chart__frame">
      <div class="ui-trend-chart__scale">
        <div
          v-for="row in gridRows"
          :key="row.value"
          class="ui-trend-chart__scale-label"
          :style="{ top: `${(row.y / viewHeight) * 100}%` }"
        >
          {{ row.value }}
        </div>
      </div>

      <div class="ui-trend-chart__canvas">
        <svg
          class="ui-trend-chart__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          role="img"
          aria-label="trend chart"
        >
          <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="props.areaColor || resolvedColor" />
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          <line
            v-for="row in gridRows"
            :key="`grid-${row.value}`"
            :x1="paddingX"
            :y1="row.y"
            :x2="viewWidth - paddingX"
            :y2="row.y"
            class="ui-trend-chart__grid"
          />

          <rect
            v-if="props.highlightBand && activeBand"
            class="ui-trend-chart__active-band"
            :x="activeBand.x"
            :y="paddingTop"
            :width="activeBand.width"
            :height="viewHeight - paddingTop - paddingBottom"
            rx="16"
          />

          <path
            v-if="props.area && areaPath"
            class="ui-trend-chart__area"
            :d="areaPath"
            :fill="`url(#${gradientId})`"
          />

          <path
            v-if="linePath"
            class="ui-trend-chart__line"
            :d="linePath"
            :stroke="resolvedColor"
            :stroke-width="props.lineWidth"
          />

          <g v-for="hit in hitAreas" :key="`${hit.key}-hit`">
            <rect
              class="ui-trend-chart__hit-area"
              :x="hit.x"
              :y="paddingTop"
              :width="hit.width"
              :height="viewHeight - paddingTop - paddingBottom"
              @click="handleSelect(hit.key)"
            />
          </g>

          <g
            v-for="point in pointNodes"
            :key="point.key"
            class="ui-trend-chart__point"
            :class="{ 'ui-trend-chart__point--active': currentActiveKey === point.key }"
          >
            <circle
              v-if="props.showActiveHalo && currentActiveKey === point.key"
              class="ui-trend-chart__dot-halo"
              :cx="point.x"
              :cy="point.y"
              r="7"
              :fill="resolvedColor"
            />
            <circle
              class="ui-trend-chart__dot"
              :cx="point.x"
              :cy="point.y"
              :fill="resolvedColor"
              :r="currentActiveKey === point.key ? 3.6 : 3"
            />
          </g>
        </svg>

        <div
          v-if="props.showBubble && activePoint"
          class="ui-trend-chart__bubble"
          :style="activeBubbleStyle"
        >
          <div class="ui-trend-chart__bubble-label">{{ activePoint.label }}</div>
          <div class="ui-trend-chart__bubble-value">{{ activePoint.value }}</div>
          <div class="ui-trend-chart__bubble-helper">{{ activePointDeltaText }}</div>
        </div>
      </div>
    </div>

    <div class="ui-trend-chart__labels" :style="labelGridStyle">
      <button
        v-for="point in pointNodes"
        :key="`${point.key}-label`"
        type="button"
        class="ui-trend-chart__label"
        :class="{ 'ui-trend-chart__label--active': currentActiveKey === point.key }"
        @click="handleSelect(point.key)"
      >
        <span class="ui-trend-chart__label-text">{{ point.label }}</span>
        <span class="ui-trend-chart__label-value">{{ point.value }}</span>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiTrendPoint } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiTrendChart',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  items?: UiTrendPoint[]
  modelValue?: string
  color?: string
  area?: boolean
  areaColor?: string
  lineWidth?: number
  showBubble?: boolean
  highlightBand?: boolean
  smooth?: boolean
  showActiveHalo?: boolean
}>(), {
  items: () => [],
  modelValue: '',
  color: 'var(--ant-color-primary, #2563eb)',
  area: false,
  areaColor: 'rgba(37, 99, 235, 0.18)',
  lineWidth: 1.6,
  showBubble: false,
  highlightBand: false,
  smooth: false,
  showActiveHalo: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const viewWidth = 620
const viewHeight = 260
const paddingX = 18
const paddingTop = 24
const paddingBottom = 18
const gradientId = `ui-trend-chart-gradient-${Math.random().toString(36).slice(2, 8)}`

const resolvedColor = computed(() => props.color || 'var(--ant-color-primary, #2563eb)')

const normalizedItems = computed(() => {
  return props.items.map((item, index) => ({
    ...item,
    key: item.key || `${item.label}-${index}`,
  }))
})

const currentActiveKey = computed(() => {
  return props.modelValue || normalizedItems.value.at(-1)?.key || normalizedItems.value[0]?.key || ''
})

const rawMinValue = computed(() => {
  return normalizedItems.value.length
    ? Math.min(...normalizedItems.value.map(item => item.value))
    : 0
})

const rawMaxValue = computed(() => {
  return normalizedItems.value.length
    ? Math.max(...normalizedItems.value.map(item => item.value))
    : 0
})

const valuePadding = computed(() => {
  const baseRange = Math.max(rawMaxValue.value - rawMinValue.value, rawMaxValue.value || 0, 10)
  return Math.max(baseRange * 0.18, 6)
})

const axisMin = computed(() => {
  if (rawMinValue.value >= 0) {
    return Math.max(0, rawMinValue.value - valuePadding.value)
  }

  return rawMinValue.value - valuePadding.value
})

const axisMax = computed(() => {
  return rawMaxValue.value + valuePadding.value
})

const gridRows = computed(() => {
  const count = 4
  const plotHeight = viewHeight - paddingTop - paddingBottom

  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1)
    const value = axisMax.value - ((axisMax.value - axisMin.value) * ratio)
    return {
      value: Math.round(value),
      y: paddingTop + plotHeight * ratio,
    }
  })
})

const pointNodes = computed(() => {
  if (!normalizedItems.value.length) {
    return []
  }

  const availableWidth = viewWidth - paddingX * 2
  const availableHeight = viewHeight - paddingTop - paddingBottom
  const range = Math.max(axisMax.value - axisMin.value, 1)

  return normalizedItems.value.map((item, index) => {
    const x = normalizedItems.value.length === 1
      ? viewWidth / 2
      : paddingX + (availableWidth / (normalizedItems.value.length - 1)) * index
    const y = paddingTop + availableHeight - ((item.value - axisMin.value) / range) * availableHeight

    return {
      ...item,
      index,
      x,
      y,
    }
  })
})

const hitAreas = computed(() => {
  if (!pointNodes.value.length) {
    return []
  }

  return pointNodes.value.map((point, index) => {
    const prev = pointNodes.value[index - 1]
    const next = pointNodes.value[index + 1]
    const left = prev ? (prev.x + point.x) / 2 : paddingX
    const right = next ? (point.x + next.x) / 2 : viewWidth - paddingX

    return {
      key: point.key,
      x: left,
      width: Math.max(right - left, 36),
    }
  })
})

const activePoint = computed(() => {
  return pointNodes.value.find(point => point.key === currentActiveKey.value) || pointNodes.value.at(-1)
})

const activeBand = computed(() => {
  if (!activePoint.value) {
    return null
  }

  const area = hitAreas.value.find(item => item.key === activePoint.value?.key)
  if (!area) {
    return null
  }

  return {
    x: area.x,
    width: area.width,
  }
})

const activeBubbleStyle = computed(() => {
  if (!activePoint.value) {
    return undefined
  }

  const leftRatio = activePoint.value.x / viewWidth
  const top = Math.max(((activePoint.value.y - 68) / viewHeight) * 100, 2)
  const translateX = leftRatio < 0.16 ? '0%' : leftRatio > 0.84 ? '-100%' : '-50%'

  return {
    left: `${leftRatio * 100}%`,
    top: `${top}%`,
    transform: `translateX(${translateX})`,
  }
})

const activePointDeltaText = computed(() => {
  if (!activePoint.value) {
    return ''
  }

  if (activePoint.value.index === 0) {
    return '起始节点'
  }

  const prevValue = pointNodes.value[activePoint.value.index - 1]?.value ?? 0
  const delta = activePoint.value.value - prevValue

  if (delta === 0) {
    return '与上一个节点持平'
  }

  return delta > 0 ? `较上一个节点 +${delta}` : `较上一个节点 ${delta}`
})

const linePath = computed(() => {
  return props.smooth ? buildSmoothPath(pointNodes.value) : buildLinearPath(pointNodes.value)
})

const areaPath = computed(() => {
  if (!pointNodes.value.length || !linePath.value) {
    return ''
  }

  const firstPoint = pointNodes.value[0]
  const lastPoint = pointNodes.value[pointNodes.value.length - 1]
  const bottom = viewHeight - paddingBottom

  return `${linePath.value} L ${lastPoint.x} ${bottom} L ${firstPoint.x} ${bottom} Z`
})

const labelGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(pointNodes.value.length, 1)}, minmax(0, 1fr))`,
}))

function buildSmoothPath(points: Array<{ x: number, y: number }>) {
  if (!points.length) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  const tension = 0.2
  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

function buildLinearPath(points: Array<{ x: number, y: number }>) {
  if (!points.length) {
    return ''
  }

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length; index += 1) {
    path += ` L ${points[index].x} ${points[index].y}`
  }

  return path
}

function handleSelect(key: string) {
  emit('update:modelValue', key)
  emit('select', key)
}
</script>

<style scoped>
.ui-trend-chart {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.ui-trend-chart__frame {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  min-width: 0;
}

.ui-trend-chart__scale {
  position: relative;
  height: 100%;
}

.ui-trend-chart__scale-label {
  position: absolute;
  left: 0;
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  transform: translateY(-50%);
}

.ui-trend-chart__canvas {
  position: relative;
  min-width: 0;
  min-height: 260px;
  padding: 10px 12px 6px;
  aspect-ratio: 620 / 260;
  border-radius: var(--dp-radius-panel, 8px);
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
}

.ui-trend-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ui-trend-chart__grid {
  stroke: #e2e8f0;
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.ui-trend-chart__active-band {
  fill: rgba(148, 163, 184, 0.08);
}

.ui-trend-chart__area {
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.ui-trend-chart__line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ui-trend-chart__hit-area {
  fill: transparent;
  cursor: pointer;
}

.ui-trend-chart__dot-halo {
  opacity: 0.08;
}

.ui-trend-chart__dot {
  stroke: #fff;
  stroke-width: 1.25;
}

.ui-trend-chart__bubble {
  position: absolute;
  min-width: 82px;
  padding: 7px 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: var(--dp-radius-panel, 8px);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  text-align: center;
  pointer-events: none;
}

.ui-trend-chart__bubble-label {
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
}

.ui-trend-chart__bubble-value {
  margin-top: 2px;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-trend-chart__bubble-helper {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.ui-trend-chart__labels {
  display: grid;
  gap: 8px;
}

.ui-trend-chart__label {
  display: grid;
  gap: 4px;
  padding: 6px 6px 8px;
  border: none;
  border-radius: var(--dp-radius-panel, 8px);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-trend-chart__label:hover {
  background: transparent;
}

.ui-trend-chart__label--active {
  background: transparent;
  box-shadow: inset 0 -1px 0 0 rgba(59, 130, 246, 0.22);
}

.ui-trend-chart__label-text {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  text-align: center;
}

.ui-trend-chart__label-value {
  font-size: 13px;
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-secondary, #475569);
  text-align: center;
}

.ui-trend-chart__label--active .ui-trend-chart__label-text,
.ui-trend-chart__label--active .ui-trend-chart__label-value {
  color: var(--dp-text-primary, #0f172a);
}

.ui-trend-chart__label--active .ui-trend-chart__label-text,
.ui-trend-chart__label--active .ui-trend-chart__label-value {
  color: var(--ant-color-primary, #2563eb);
}

@media (max-width: 768px) {
  .ui-trend-chart__frame {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 8px;
  }

  .ui-trend-chart__canvas {
    padding: 8px 8px 4px;
  }

  .ui-trend-chart__bubble {
    min-width: 76px;
    padding: 6px 8px;
  }
}
</style>
