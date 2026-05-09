<template>
  <div class="ui-ring-progress" :class="[`ui-ring-progress--${size}`]">
    <svg class="ui-ring-progress__svg" :viewBox="`0 0 ${viewSize} ${viewSize}`">
      <circle
        class="ui-ring-progress__track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="trackColor"
        :stroke-width="strokeWidth"
      />
      <circle
        class="ui-ring-progress__fill"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
      />
    </svg>
    <div class="ui-ring-progress__content">
      <slot>
        <span class="ui-ring-progress__value">{{ displayValue }}</span>
        <span v-if="label" class="ui-ring-progress__label">{{ label }}</span>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({
  name: 'UiRingProgress',
})

const props = withDefaults(defineProps<{
  percent?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  format?: (percent: number) => string
}>(), {
  percent: 0,
  size: 'md',
  strokeWidth: 6,
  color: '#3b82f6',
  trackColor: '#e2e8f0',
  label: '',
})

const sizeMap = {
  sm: 60,
  md: 100,
  lg: 140,
  xl: 180,
}

const viewSize = computed(() => sizeMap[props.size])
const center = computed(() => viewSize.value / 2)
const radius = computed(() => (viewSize.value - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - Math.min(props.percent, 100) / 100))
const strokeColor = computed(() => props.color)

const displayValue = computed(() => {
  if (props.format) {
    return props.format(props.percent)
  }
  return `${Math.round(props.percent)}%`
})
</script>

<style scoped>
.ui-ring-progress {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ui-ring-progress--sm {
  width: 60px;
  height: 60px;
}

.ui-ring-progress--md {
  width: 100px;
  height: 100px;
}

.ui-ring-progress--lg {
  width: 140px;
  height: 140px;
}

.ui-ring-progress--xl {
  width: 180px;
  height: 180px;
}

.ui-ring-progress__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ui-ring-progress__fill {
  transition: stroke-dashoffset 0.6s ease;
}

.ui-ring-progress__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 1;
}

.ui-ring-progress__value {
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
  line-height: 1.2;
}

.ui-ring-progress--sm .ui-ring-progress__value {
  font-size: 14px;
}

.ui-ring-progress--md .ui-ring-progress__value {
  font-size: 22px;
}

.ui-ring-progress--lg .ui-ring-progress__value {
  font-size: 28px;
}

.ui-ring-progress--xl .ui-ring-progress__value {
  font-size: 36px;
}

.ui-ring-progress__label {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
  margin-top: 2px;
}

.ui-ring-progress--lg .ui-ring-progress__label,
.ui-ring-progress--xl .ui-ring-progress__label {
  font-size: 13px;
  margin-top: 4px;
}
</style>
