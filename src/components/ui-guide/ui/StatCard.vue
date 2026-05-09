<template>
  <div class="dp-statcard" :class="[`dp-statcard--${size}`]">
    <div class="dp-statcard__content">
      <p class="dp-statcard__label">{{ label }}</p>
      <p class="dp-statcard__value">
        <span>{{ value }}</span>
        <span v-if="unit" class="dp-statcard__unit">{{ unit }}</span>
      </p>
      <p v-if="subValue" class="dp-statcard__sub">{{ subValue }}</p>
    </div>
    <div class="dp-statcard__icon">
      <slot name="icon">
        <span class="dp-statcard__dot" />
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

type Tone = 'blue' | 'cyan' | 'orange' | 'pink' | 'green' | 'purple'

interface ToneColors {
  color: string
  bg: string
  dot: string
}

type Size = 'default' | 'compact'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  unit?: string
  subValue?: string
  tone?: Tone
  size?: Size
}>(), {
  tone: 'blue',
  size: 'default',
})

/** 色调配置映射 */
const TONE_MAP: Record<Tone, ToneColors> = {
  blue: { color: 'var(--ant-color-primary)', bg: 'var(--ant-color-primary-bg)', dot: 'var(--ant-color-primary-hover)' },
  cyan: { color: 'var(--ant-color-primary-hover)', bg: 'var(--ant-color-primary-bg-hover)', dot: 'var(--ant-color-primary-border-hover)' },
  orange: { color: 'var(--ant-color-warning)', bg: 'var(--ant-color-warning-bg)', dot: 'var(--ant-color-warning-hover)' },
  pink: { color: 'var(--ant-color-error)', bg: 'var(--ant-color-error-bg)', dot: 'var(--ant-color-error-hover)' },
  green: { color: 'var(--ant-color-success)', bg: 'var(--ant-color-success-bg)', dot: 'var(--ant-color-success-hover)' },
  purple: { color: 'var(--ant-color-primary-hover)', bg: 'var(--ant-color-primary-bg)', dot: 'var(--ant-color-primary-border-hover)' },
}

const toneColor = computed(() => TONE_MAP[props.tone].color)
const toneBg = computed(() => TONE_MAP[props.tone].bg)
const toneDot = computed(() => TONE_MAP[props.tone].dot)
</script>

<style scoped>
.dp-statcard {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border: 1px solid var(--ant-color-border);
  border-radius: var(--dp-radius-lg);
  padding: 14px 16px;
  background: var(--ant-color-bg-container);
  box-shadow: var(--dp-shadow-card);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.dp-statcard--compact {
  padding: 10px 14px;
  border-radius: var(--dp-radius-md, 8px);
}

.dp-statcard--compact .dp-statcard__label {
  font-size: 11px;
  margin-bottom: 2px;
}

.dp-statcard--compact .dp-statcard__value {
  font-size: 18px;
}

.dp-statcard--compact .dp-statcard__unit {
  font-size: 12px;
}

.dp-statcard--compact .dp-statcard__sub {
  font-size: 11px;
}

.dp-statcard--compact .dp-statcard__icon {
  width: 32px;
  height: 32px;
}

.dp-statcard--compact .dp-statcard__dot {
  width: 12px;
  height: 12px;
}

.dp-statcard:hover {
  transform: translateY(-2px);
  border-color: var(--ant-color-primary-border);
  box-shadow: var(--dp-shadow-sm);
}

.dp-statcard__content {
  flex: 1;
}

.dp-statcard__label {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  margin-bottom: 4px;
}

.dp-statcard__value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 22px;
  font-weight: 800;
  color: var(--ant-color-text);
}

.dp-statcard__unit {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text-tertiary);
}

.dp-statcard__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.dp-statcard__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--dp-radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: v-bind(toneColor);
  background: v-bind(toneBg);
}

.dp-statcard__dot {
  width: 14px;
  height: 14px;
  border-radius: var(--dp-radius-full);
  display: inline-block;
  background: v-bind(toneDot);
}
</style>
