<template>
  <div class="ui-simple-pie" :class="[`ui-simple-pie--${size}`]">
    <svg class="ui-simple-pie__svg" :viewBox="`0 0 ${viewSize} ${viewSize}`">
      <g :transform="`translate(${center}, ${center})`">
        <path
          v-for="(slice, index) in slices"
          :key="index"
          class="ui-simple-pie__slice"
          :d="slice.path"
          :fill="slice.color"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = -1"
          @click="emit('select', slice.item, index)"
        />
      </g>
    </svg>
    <div v-if="showLegend" class="ui-simple-pie__legend">
      <div
        v-for="(slice, index) in slices"
        :key="index"
        class="ui-simple-pie__legend-item"
        :class="{ 'ui-simple-pie__legend-item--active': hoveredIndex === index }"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = -1"
      >
        <span class="ui-simple-pie__legend-dot" :style="{ backgroundColor: slice.color }" />
        <span class="ui-simple-pie__legend-label">{{ slice.item.label }}</span>
        <span class="ui-simple-pie__legend-value">{{ slice.item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiSimplePie',
})

const props = withDefaults(
  defineProps<{
    items?: PieItem[]
    size?: 'sm' | 'md' | 'lg'
    colors?: string[]
    showLegend?: boolean
  }>(),
  {
    items: () => [],
    size: 'md',
    colors: () => [
      '#3b82f6',
      '#22c55e',
      '#f59e0b',
      '#ef4444',
      'var(--dp-purple-500)',
      '#06b6d4',
      '#ec4899',
    ],
    showLegend: true,
  },
)

const emit = defineEmits<{
  (e: 'select', item: PieItem, index: number): void
}>()

interface PieItem {
  label: string
  value: number
  color?: string
}

const hoveredIndex = ref(-1)

const sizeMap = {
  sm: 80,
  md: 120,
  lg: 160,
}

const viewSize = computed(() => sizeMap[props.size])
const center = computed(() => viewSize.value / 2)
const radius = computed(() => center.value - 4)

const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0))

const slices = computed(() => {
  if (!props.items.length || total.value === 0) return []

  let startAngle = -Math.PI / 2

  return props.items.map((item, index) => {
    const angle = (item.value / total.value) * Math.PI * 2
    const endAngle = startAngle + angle

    const x1 = Math.cos(startAngle) * radius.value
    const y1 = Math.sin(startAngle) * radius.value
    const x2 = Math.cos(endAngle) * radius.value
    const y2 = Math.sin(endAngle) * radius.value

    const largeArc = angle > Math.PI ? 1 : 0

    const path = [
      `M 0 0`,
      `L ${x1} ${y1}`,
      `A ${radius.value} ${radius.value} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ')

    startAngle = endAngle

    return {
      item,
      path,
      color: item.color || props.colors[index % props.colors.length],
    }
  })
})
</script>

<style scoped>
.ui-simple-pie {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.ui-simple-pie--sm .ui-simple-pie__svg {
  width: 80px;
  height: 80px;
}

.ui-simple-pie--md .ui-simple-pie__svg {
  width: 120px;
  height: 120px;
}

.ui-simple-pie--lg .ui-simple-pie__svg {
  width: 160px;
  height: 160px;
}

.ui-simple-pie__slice {
  cursor: pointer;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
  transform-origin: center;
}

.ui-simple-pie__slice:hover {
  transform: scale(1.03);
}

.ui-simple-pie__legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ui-simple-pie__legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ui-simple-pie__legend-item:hover,
.ui-simple-pie__legend-item--active {
  background: #f1f5f9;
}

.ui-simple-pie__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ui-simple-pie__legend-label {
  font-size: 13px;
  color: var(--dp-text-primary);
}

.ui-simple-pie__legend-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-secondary);
  margin-left: auto;
}
</style>
