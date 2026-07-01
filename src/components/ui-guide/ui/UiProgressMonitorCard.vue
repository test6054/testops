<template>
  <section class="ui-progress-monitor-card" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template #meta>
        <UiBadge v-if="props.statusLabel" :tone="props.statusTone" variant="soft" size="sm">
          {{ props.statusLabel }}
        </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div class="ui-progress-monitor-card__body">
      <div class="ui-progress-monitor-card__summary">
        <div class="ui-progress-monitor-card__status-row">
          <span
            class="ui-progress-monitor-card__dot"
            :class="`ui-progress-monitor-card__dot--${props.statusTone}`"
          />
          <span v-if="props.timeText" class="ui-progress-monitor-card__time">{{
            props.timeText
          }}</span>
          <span v-if="props.helper" class="ui-progress-monitor-card__helper">{{
            props.helper
          }}</span>
        </div>

        <div class="ui-progress-monitor-card__value-row">
          <div class="ui-progress-monitor-card__percent">{{ normalizedPercent }}<span>%</span></div>
          <div v-if="props.sideValue" class="ui-progress-monitor-card__side-value">
            {{ props.sideValue }}
          </div>
        </div>

        <UiProgressBar
          :percent="normalizedPercent"
          size="small"
          :show-text="false"
          :color="progressColor"
        />
      </div>

      <div v-if="props.metrics.length || $slots.footer" class="ui-progress-monitor-card__extra">
        <div v-if="props.metrics.length" class="ui-progress-monitor-card__metrics">
          <article
            v-for="item in props.metrics"
            :key="item.key || item.label"
            class="ui-progress-monitor-card__metric"
          >
            <div class="ui-progress-monitor-card__metric-label">{{ item.label }}</div>
            <div class="ui-progress-monitor-card__metric-value">
              {{ item.value }}<span v-if="item.unit">{{ item.unit }}</span>
            </div>
          </article>
        </div>

        <footer v-if="$slots.footer" class="ui-progress-monitor-card__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiProgressMonitorMetric } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiProgressBar from './ProgressBar.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiProgressMonitorCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    statusLabel?: string
    statusTone?: BadgeTone
    percent?: number
    timeText?: string
    helper?: string
    sideValue?: string
    metrics?: UiProgressMonitorMetric[]
    compact?: boolean
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    statusLabel: '',
    statusTone: 'blue',
    percent: 0,
    timeText: '',
    helper: '',
    sideValue: '',
    metrics: () => [],
    compact: false,
    divided: true,
  },
)

const slots = useSlots()

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

const normalizedPercent = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.percent || 0)))
})

const progressColor = computed(() => {
  switch (props.statusTone) {
    case 'green':
      return '#16a34a'
    case 'orange':
      return '#ea580c'
    case 'red':
      return '#dc2626'
    case 'purple':
      return 'var(--dp-purple-500, #722ed1)'
    case 'yellow':
      return '#ca8a04'
    case 'gray':
      return '#64748b'
    case 'blue':
    default:
      return '#2563eb'
  }
})
</script>

<style scoped>
.ui-progress-monitor-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-progress-monitor-card__body,
.ui-progress-monitor-card__summary,
.ui-progress-monitor-card__extra {
  display: grid;
  gap: 12px;
}

.ui-progress-monitor-card__status-row,
.ui-progress-monitor-card__value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-progress-monitor-card__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.ui-progress-monitor-card__dot--gray {
  background: #64748b;
}

.ui-progress-monitor-card__dot--blue {
  background: #2563eb;
}

.ui-progress-monitor-card__dot--green {
  background: #16a34a;
}

.ui-progress-monitor-card__dot--orange {
  background: #ea580c;
}

.ui-progress-monitor-card__dot--red {
  background: #dc2626;
}

.ui-progress-monitor-card__dot--yellow {
  background: #ca8a04;
}

.ui-progress-monitor-card__dot--purple {
  background: var(--dp-purple-500, #722ed1);
}

.ui-progress-monitor-card__time,
.ui-progress-monitor-card__helper {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-progress-monitor-card__status-row {
  justify-content: flex-start;
}

.ui-progress-monitor-card__percent {
  font-size: 30px;
  line-height: 1;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-progress-monitor-card__percent span {
  font-size: 14px;
  margin-left: 2px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-progress-monitor-card__side-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-progress-monitor-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ui-progress-monitor-card__metric {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-progress-monitor-card__metric-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-progress-monitor-card__metric-value {
  font-size: 18px;
  line-height: 1.2;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-progress-monitor-card__metric-value span {
  margin-left: 4px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-progress-monitor-card__footer {
  padding-top: 12px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 900px) {
  .ui-progress-monitor-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
