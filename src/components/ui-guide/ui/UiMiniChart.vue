<template>
  <div class="ui-mini-chart" :class="[`ui-mini-chart--${variant}`]">
    <svg
      class="ui-mini-chart__svg"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
    >
      <defs v-if="variant === 'area'">
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        v-if="variant === 'area'"
        class="ui-mini-chart__area"
        :d="areaPath"
        :fill="`url(#${gradientId})`"
      />
      <path
        class="ui-mini-chart__line"
        :d="linePath"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-if="showDot && points.length"
        class="ui-mini-chart__dot"
        :cx="points[points.length - 1].x"
        :cy="points[points.length - 1].y"
        :r="dotSize"
        :fill="color"
      />
    </svg>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({
  name: 'UiMiniChart',
})

const props = withDefaults(defineProps<{
  data?: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  variant?: 'line' | 'area'
  showDot?: boolean
  dotSize?: number
  smooth?: boolean
}>(), {
  data: () => [],
  width: 120,
  height: 40,
  color: '#3b82f6',
  strokeWidth: 2,
  variant: 'line',
  showDot: true,
  dotSize: 3,
  smooth: true,
})

const gradientId = `mini-chart-gradient-${Math.random().toString(36).slice(2, 9)}`

const points = computed(() => {
  if (!props.data.length) return []
  
  const padding = props.dotSize + 2
  const maxValue = Math.max(...props.data)
  const minValue = Math.min(...props.data)
  const range = maxValue - minValue || 1
  
  const chartWidth = props.width - padding * 2
  const chartHeight = props.height - padding * 2
  
  return props.data.map((value, index) => ({
    x: padding + (index / (props.data.length - 1 || 1)) * chartWidth,
    y: padding + (1 - (value - minValue) / range) * chartHeight,
  }))
})

const linePath = computed(() => {
  if (points.value.length < 2) return ''
  
  if (props.smooth) {
    return smoothPath(points.value)
  }
  
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
})

const areaPath = computed(() => {
  if (points.value.length < 2) return ''
  
  const padding = props.dotSize + 2
  const baseY = props.height - padding
  
  let path = linePath.value
  path += ` L ${points.value[points.value.length - 1].x} ${baseY}`
  path += ` L ${points.value[0].x} ${baseY}`
  path += ' Z'
  
  return path
})

function smoothPath(pts: Array<{ x: number, y: number }>) {
  if (pts.length < 2) return ''
  
  let path = `M ${pts[0].x} ${pts[0].y}`
  
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const midX = (p0.x + p1.x) / 2
    
    path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
  }
  
  return path
}
</script>

<style scoped>
.ui-mini-chart {
  display: inline-block;
  line-height: 0;
}

.ui-mini-chart__svg {
  display: block;
}

.ui-mini-chart__line {
  vector-effect: non-scaling-stroke;
}

.ui-mini-chart__dot {
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
}
</style>
