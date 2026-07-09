<template>
  <section
    class="ui-statistic-chart-card"
    :class="{ 'ui-statistic-chart-card--compact': props.compact }"
    v-bind="$attrs"
  >
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template v-if="showMeta" #meta>
        <UiBadge v-if="props.statusLabel" :tone="props.statusTone" variant="soft" size="sm">
          {{ props.statusLabel }}
        </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%">
      <div
        v-if="hasContent"
        class="ui-statistic-chart-card__content"
        :class="{ 'ui-statistic-chart-card__content--with-side': hasSide }"
      >
        <div class="ui-statistic-chart-card__main" :style="mainStyle">
          <slot name="chart">
            <slot />
          </slot>
        </div>

        <aside v-if="hasSide" class="ui-statistic-chart-card__side" :style="sideStyle">
          <div v-if="props.stats.length" class="ui-statistic-chart-card__stats">
            <article
              v-for="item in props.stats"
              :key="item.key || item.label"
              class="ui-statistic-chart-card__stat"
            >
              <div class="ui-statistic-chart-card__stat-head">
                <span
                  class="ui-statistic-chart-card__stat-dot"
                  :class="`ui-statistic-chart-card__stat-dot--${item.tone || 'blue'}`"
                />
                <span class="ui-statistic-chart-card__stat-label">{{ item.label }}</span>
              </div>

              <div class="ui-statistic-chart-card__stat-value-row">
                <span class="ui-statistic-chart-card__stat-value">
                  {{ item.valueText ?? item.value ?? '--' }}
                </span>
                <span v-if="item.unit" class="ui-statistic-chart-card__stat-unit">
                  {{ item.unit }}
                </span>
              </div>

              <p v-if="item.helper" class="ui-statistic-chart-card__stat-helper">
                {{ item.helper }}
              </p>
            </article>
          </div>

          <slot name="side" />
        </aside>
      </div>

      <UiEmpty size="sm" title="暂无图表内容" :description="props.emptyText" />
    </a-spin>

    <footer v-if="props.summary || $slots.footer" class="ui-statistic-chart-card__footer">
      <slot name="footer">
        <p class="ui-statistic-chart-card__summary">{{ props.summary }}</p>
      </slot>
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiStatisticChartMetric } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiStatisticChartCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    summary?: string
    statusLabel?: string
    statusTone?: BadgeTone
    stats?: UiStatisticChartMetric[]
    loading?: boolean
    emptyText?: string
    compact?: boolean
    divided?: boolean
    chartMinHeight?: string | number
    sideWidth?: string | number
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    summary: '',
    statusLabel: '',
    statusTone: 'blue',
    stats: () => [],
    loading: false,
    emptyText: '请通过 `chart` 插槽传入图表主体',
    compact: false,
    divided: true,
    chartMinHeight: 260,
    sideWidth: 260,
  },
)

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return (
    !!props.title
    || !!props.description
    || !!props.eyebrow
    || !!props.statusLabel
    || !!slots.meta
    || !!slots.actions
  )
})

const showMeta = computed(() => {
  return !!props.statusLabel || !!slots.meta
})

const hasSide = computed(() => {
  return props.stats.length > 0 || !!slots.side
})

const hasContent = computed(() => {
  return !!slots.chart || !!slots.default || hasSide.value
})

const mainStyle = computed(() => ({
  minHeight: normalizeCssSize(props.chartMinHeight),
}))

const sideStyle = computed(() => ({
  width: normalizeCssSize(props.sideWidth),
}))
</script>

<style scoped>
.ui-statistic-chart-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-card);
}

.ui-statistic-chart-card--compact {
  gap: 14px;
  padding: 16px;
}

.ui-statistic-chart-card__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.ui-statistic-chart-card__content--with-side {
  grid-template-columns: minmax(0, 1fr) 260px;
}

.ui-statistic-chart-card__main {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.ui-statistic-chart-card__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.ui-statistic-chart-card__stats {
  display: grid;
  gap: 10px;
}

.ui-statistic-chart-card__stat {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-statistic-chart-card__stat-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-statistic-chart-card__stat-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
}

.ui-statistic-chart-card__stat-dot--gray {
  background: #64748b;
}

.ui-statistic-chart-card__stat-dot--blue {
  background: #2563eb;
}

.ui-statistic-chart-card__stat-dot--green {
  background: #16a34a;
}

.ui-statistic-chart-card__stat-dot--orange {
  background: #ea580c;
}

.ui-statistic-chart-card__stat-dot--red {
  background: #dc2626;
}

.ui-statistic-chart-card__stat-dot--yellow {
  background: #ca8a04;
}

.ui-statistic-chart-card__stat-dot--purple {
  background: var(--dp-purple-500);
}

.ui-statistic-chart-card__stat-label {
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary);
}

.ui-statistic-chart-card__stat-value-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.ui-statistic-chart-card__stat-value {
  font-size: 26px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-statistic-chart-card__stat-unit {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-muted);
}

.ui-statistic-chart-card__stat-helper,
.ui-statistic-chart-card__summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-statistic-chart-card__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border);
}

@media (max-width: 1080px) {
  .ui-statistic-chart-card__content--with-side {
    grid-template-columns: minmax(0, 1fr);
  }

  .ui-statistic-chart-card__side {
    width: 100% !important;
  }
}
</style>
