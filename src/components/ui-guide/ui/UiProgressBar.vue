<template>
  <div class="ui-progress-bar" :class="[`ui-progress-bar--${size}`, `ui-progress-bar--${variant}`]">
    <div v-if="showLabel && labelPosition === 'top'" class="ui-progress-bar__header">
      <span v-if="label" class="ui-progress-bar__label">{{ label }}</span>
      <span class="ui-progress-bar__percent">{{ displayValue }}</span>
    </div>
    <div class="ui-progress-bar__track" :style="{ backgroundColor: trackColor }">
      <div
        class="ui-progress-bar__fill"
        :style="{ width: `${Math.min(percent, 100)}%`, backgroundColor: fillColor }"
      />
    </div>
    <div v-if="showLabel && labelPosition === 'right'" class="ui-progress-bar__right">
      <span class="ui-progress-bar__percent">{{ displayValue }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({
  name: 'UiProgressBar',
})

const props = withDefaults(
  defineProps<{
    percent?: number
    size?: 'xs' | 'sm' | 'md' | 'lg'
    variant?: 'default' | 'striped' | 'gradient'
    color?: string
    trackColor?: string
    label?: string
    showLabel?: boolean
    labelPosition?: 'top' | 'right'
    format?: (percent: number) => string
  }>(),
  {
    percent: 0,
    size: 'md',
    variant: 'default',
    color: '#3b82f6',
    trackColor: '#e2e8f0',
    label: '',
    showLabel: true,
    labelPosition: 'top',
  },
)

const fillColor = computed(() => {
  if (props.variant === 'gradient') {
    return `linear-gradient(90deg, ${props.color}, ${lightenColor(props.color, 20)})`
  }
  return props.color
})

const displayValue = computed(() => {
  if (props.format) {
    return props.format(props.percent)
  }
  return `${Math.round(props.percent)}%`
})

function lightenColor(hex: string, percent: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt)
  const B = Math.min(255, (num & 0x0000ff) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
</script>

<style scoped>
.ui-progress-bar {
  width: 100%;
}

.ui-progress-bar--xs .ui-progress-bar__track {
  height: 4px;
}

.ui-progress-bar--sm .ui-progress-bar__track {
  height: 6px;
}

.ui-progress-bar--md .ui-progress-bar__track {
  height: 8px;
}

.ui-progress-bar--lg .ui-progress-bar__track {
  height: 12px;
}

.ui-progress-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ui-progress-bar__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-primary);
}

.ui-progress-bar__percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.ui-progress-bar__track {
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
}

.ui-progress-bar__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.ui-progress-bar--striped .ui-progress-bar__fill {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-stripes 1s linear infinite;
}

@keyframes progress-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

.ui-progress-bar__right {
  display: flex;
  align-items: center;
}

.ui-progress-bar:has(.ui-progress-bar__right) {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-progress-bar:has(.ui-progress-bar__right) .ui-progress-bar__track {
  flex: 1;
}
</style>
