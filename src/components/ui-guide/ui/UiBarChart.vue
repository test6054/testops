<template>
  <section class="ui-bar-chart" :class="`ui-bar-chart--${props.orientation}`" v-bind="$attrs">
    <div v-if="props.orientation === 'horizontal'" class="ui-bar-chart__horizontal">
      <button
        v-for="item in normalizedItems"
        :key="item.key"
        type="button"
        class="ui-bar-chart__row"
        :class="{ 'ui-bar-chart__row--active': currentActiveKey === item.key }"
        @click="handleSelect(item.key)"
      >
        <div class="ui-bar-chart__row-label">
          <div class="ui-bar-chart__label">{{ item.label }}</div>
          <div
            v-if="item.helper && currentActiveKey === item.key"
            class="ui-bar-chart__helper"
          >
            {{ item.helper }}
          </div>
        </div>

        <div class="ui-bar-chart__track">
          <div
            class="ui-bar-chart__fill"
            :style="{ width: `${item.percent}%`, backgroundColor: item.color }"
          />
        </div>

        <div class="ui-bar-chart__value">{{ item.value }}</div>
      </button>
    </div>

    <div v-else class="ui-bar-chart__vertical">
      <button
        v-for="item in normalizedItems"
        :key="item.key"
        type="button"
        class="ui-bar-chart__column"
        :class="{ 'ui-bar-chart__column--active': currentActiveKey === item.key }"
        @click="handleSelect(item.key)"
      >
        <div class="ui-bar-chart__column-value">{{ item.value }}</div>

        <div class="ui-bar-chart__column-plot">
          <div class="ui-bar-chart__column-axis" />
          <div class="ui-bar-chart__column-bar-wrap">
            <div
              class="ui-bar-chart__column-fill"
              :style="{ height: `${item.percent}%`, backgroundColor: item.color }"
            />
          </div>
        </div>

        <div class="ui-bar-chart__column-meta">
          <div class="ui-bar-chart__column-label">{{ item.label }}</div>
          <div
            v-if="item.helper && currentActiveKey === item.key"
            class="ui-bar-chart__column-helper"
          >
            {{ item.helper }}
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiBarChartItem } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'UiBarChart',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  items?: UiBarChartItem[]
  modelValue?: string
  orientation?: 'horizontal' | 'vertical'
  maxValue?: number
}>(), {
  items: () => [],
  modelValue: '',
  orientation: 'horizontal',
  maxValue: 0,
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

const computedMaxValue = computed(() => {
  if (props.maxValue > 0) {
    return props.maxValue
  }

  return Math.max(...props.items.map(item => item.value), 0)
})

const normalizedItems = computed(() => {
  return props.items.map((item, index) => ({
    ...item,
    key: item.key || `${item.label}-${index}`,
    color: item.color || toneColorMap[item.tone || 'blue'],
    percent: computedMaxValue.value > 0
      ? Number(((item.value / computedMaxValue.value) * 100).toFixed(1))
      : 0,
  }))
})

const currentActiveKey = computed(() => {
  return props.modelValue || normalizedItems.value[0]?.key || ''
})

function handleSelect(key: string) {
  emit('update:modelValue', key)
  emit('select', key)
}
</script>

<style scoped>
.ui-bar-chart {
  min-width: 0;
}

.ui-bar-chart__horizontal {
  display: grid;
  gap: 10px;
}

.ui-bar-chart__row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--dp-radius-panel, 8px);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-bar-chart__row:hover {
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-bar-chart__row--active {
  background: #f8fbff;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.ui-bar-chart__row-label {
  min-width: 0;
}

.ui-bar-chart__label,
.ui-bar-chart__column-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-bar-chart__helper,
.ui-bar-chart__column-helper {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dp-text-muted, #64748b);
}

.ui-bar-chart__track,
.ui-bar-chart__column-axis {
  position: relative;
  background: #e2e8f0;
}

.ui-bar-chart__track {
  height: 10px;
  border-radius: 8px;
}

.ui-bar-chart__fill {
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  transition: width 0.25s ease;
}

.ui-bar-chart__value,
.ui-bar-chart__column-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-bar-chart__vertical {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 18px;
  align-items: stretch;
}

.ui-bar-chart__column {
  display: grid;
  grid-template-rows: auto 220px auto;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: center;
}

.ui-bar-chart__column-plot {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 0;
  padding-bottom: 1px;
}

.ui-bar-chart__column-axis {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
}

.ui-bar-chart__column-bar-wrap {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-items: center;
  justify-content: center;
  width: 22px;
  height: 188px;
}

.ui-bar-chart__column-fill {
  width: 100%;
  min-height: 16px;
  border-radius: 4px 4px 0 0;
  transition: height 0.25s ease;
}

.ui-bar-chart__column--active .ui-bar-chart__column-value,
.ui-bar-chart__column--active .ui-bar-chart__column-label {
  color: var(--ant-color-primary, #2563eb);
}

.ui-bar-chart__column-meta {
  min-width: 0;
}

.ui-bar-chart__column-label,
.ui-bar-chart__column-helper {
  text-align: center;
}

@media (max-width: 720px) {
  .ui-bar-chart__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .ui-bar-chart__value {
    justify-self: start;
  }

  .ui-bar-chart__vertical {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
