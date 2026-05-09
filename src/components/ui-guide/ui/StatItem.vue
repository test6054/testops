<template>
  <div class="ui-stat-item" :class="{ 'ui-stat-item--clickable': clickable }">
    <div class="ui-stat-item__label">{{ label }}</div>
    <div class="ui-stat-item__value" :class="valueClass">{{ value }}</div>
    <div v-if="showProgress" class="ui-stat-item__bar">
      <div
        class="ui-stat-item__bar-fill"
        :class="`ui-stat-item__bar-fill--${progressColor}`"
        :style="{ width: `${progress}%` }"
      />
    </div>
    <div v-if="desc" class="ui-stat-item__desc" :class="descClass">{{ desc }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({ name: 'UiStatItem' })

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  desc?: string
  progress?: number
  progressColor?: ColorType
  valueSize?: ValueSize
  valueTone?: ValueTone
  descTone?: 'default' | 'danger'
  clickable?: boolean
}>(), {
  progress: 0,
  progressColor: 'blue',
  valueSize: 'normal',
  valueTone: 'default',
  descTone: 'default',
  clickable: false,
})
type ColorType = 'gray' | 'blue' | 'orange' | 'yellow' | 'green' | 'red'
type ValueSize = 'normal' | 'large'
type ValueTone = 'default' | 'success' | 'danger' | 'warning'

const showProgress = computed(() => props.progress > 0)

const valueClass = computed(() => {
  const classes: string[] = []
  if (props.valueSize === 'large') classes.push('ui-stat-item__value--large')
  if (props.valueTone === 'success') classes.push('ui-stat-item__value--success')
  if (props.valueTone === 'danger') classes.push('ui-stat-item__value--danger')
  if (props.valueTone === 'warning') classes.push('ui-stat-item__value--warning')
  return classes
})

const descClass = computed(() => {
  if (props.descTone === 'danger') return 'ui-stat-item__desc--danger'
  return ''
})
</script>

<style lang="scss">
.ui-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  background: var(--dp-gray-50, #f8fafc);
  border-radius: var(--dp-radius-md, 4px);
  border: 1px solid var(--dp-border, #e5e7eb);
  transition: all 0.15s ease;
  min-width: 0;

  &:hover {
    border-color: var(--dp-blue-200, #bfdbfe);
    background: var(--dp-blue-50, #eff6ff);
  }

  &--clickable {
    cursor: pointer;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: var(--dp-text-secondary, #475569);
    line-height: 1.2;
  }

  &__value {
    font-size: 18px;
    font-weight: 700;
    color: var(--dp-text-primary, #0f172a);
    line-height: 1.2;

    &--large {
      font-size: 24px;
    }

    &--success {
      color: var(--dp-green-600, #16a34a);
    }

    &--danger {
      color: var(--dp-red-600, #dc2626);
    }

    &--warning {
      color: var(--dp-orange-600, #ea580c);
    }
  }

  &__desc {
    font-size: 11px;
    color: var(--dp-text-muted, #6b7280);
    line-height: 1.2;

    &--danger {
      color: var(--dp-red-600, #dc2626);
      font-weight: 500;
    }
  }

  &__bar {
    height: 4px;
    background: var(--dp-gray-200, #e5e7eb);
    border-radius: var(--dp-radius-full, 999px);
    overflow: hidden;
    margin-top: 2px;
  }

  &__bar-fill {
    height: 100%;
    border-radius: var(--dp-radius-full, 999px);
    transition: width 0.3s ease;

    &--gray {
      background: var(--dp-gray-400, #9ca3af);
    }

    &--blue {
      background: var(--dp-blue-500, #3b82f6);
    }

    &--orange {
      background: var(--dp-orange-500, #f97316);
    }

    &--yellow {
      background: var(--dp-yellow-500, #eab308);
    }

    &--green {
      background: var(--dp-green-500, #22c55e);
    }

    &--red {
      background: var(--dp-red-500, #ef4444);
    }
  }
}

@media (max-width: 1200px) {
  .ui-stat-item {
    min-width: calc(50% - 6px);
  }
}

@media (max-width: 768px) {
  .ui-stat-item {
    min-width: 100%;
  }
}
</style>
