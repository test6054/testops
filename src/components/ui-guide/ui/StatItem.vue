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

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    desc?: string
    progress?: number
    progressColor?: ColorType
    valueSize?: ValueSize
    valueTone?: ValueTone
    descTone?: 'default' | 'danger'
    clickable?: boolean
  }>(),
  {
    progress: 0,
    progressColor: 'blue',
    valueSize: 'normal',
    valueTone: 'default',
    descTone: 'default',
    clickable: false,
  },
)
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
@use '@/styles/breakpoints' as bp;
.ui-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  background: var(--dp-gray-50);
  border-radius: var(--dp-radius-panel);
  border: 1px solid var(--dp-border);
  transition: all 0.15s ease;
  min-width: 0;

  &:hover {
    border-color: var(--dp-blue-200);
    background: var(--dp-blue-50);
  }

  &--clickable {
    cursor: pointer;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: var(--dp-text-secondary);
    line-height: 1.2;
  }

  &__value {
    font-size: 18px;
    font-weight: 700;
    color: var(--dp-text-primary);
    line-height: 1.2;

    &--large {
      font-size: 24px;
    }

    &--success {
      color: var(--dp-green-600);
    }

    &--danger {
      color: var(--dp-red-600);
    }

    &--warning {
      color: var(--dp-orange-600);
    }
  }

  &__desc {
    font-size: 11px;
    color: var(--dp-text-muted);
    line-height: 1.2;

    &--danger {
      color: var(--dp-red-600);
      font-weight: 500;
    }
  }

  &__bar {
    height: 4px;
    background: var(--dp-gray-200);
    border-radius: var(--dp-radius-full);
    overflow: hidden;
    margin-top: 2px;
  }

  &__bar-fill {
    height: 100%;
    border-radius: var(--dp-radius-full);
    transition: width 0.3s ease;

    &--gray {
      background: var(--dp-gray-400);
    }

    &--blue {
      background: var(--dp-blue-500);
    }

    &--orange {
      background: var(--dp-orange-500);
    }

    &--yellow {
      background: var(--dp-yellow-500);
    }

    &--green {
      background: var(--dp-green-500);
    }

    &--red {
      background: var(--dp-red-500);
    }
  }
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .ui-stat-item {
    min-width: calc(50% - 6px);
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-stat-item {
    min-width: 100%;
  }
}
</style>
