<template>
  <div
    v-if="progress"
    class="grading-session-progress"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel"
  >
    <div class="grading-session-progress__head">
      <div class="grading-session-progress__title-row">
        <span class="grading-session-progress__title">本批进度</span>
        <UiTag :tone="progressTone" size="sm">
          已完成 {{ progress.completed }} / {{ progress.total }}
        </UiTag>
        <UiTag tone="blue" size="sm">
          当前第 {{ progress.current }} 份
        </UiTag>
      </div>
      <div class="grading-session-progress__metrics">
        <span class="grading-session-progress__metric">
          <span class="grading-session-progress__metric-label">剩余</span>
          <strong class="grading-session-progress__metric-value">{{ progress.remaining }}</strong>
          <span class="grading-session-progress__metric-unit">份</span>
        </span>
        <span class="grading-session-progress__metric">
          <span class="grading-session-progress__metric-label">完成率</span>
          <strong class="grading-session-progress__metric-value">{{ progress.percent }}</strong>
          <span class="grading-session-progress__metric-unit">%</span>
        </span>
        <span class="grading-session-progress__metric grading-session-progress__metric--eta">
          <span class="grading-session-progress__metric-label">预计剩余</span>
          <strong class="grading-session-progress__metric-value">{{ etaLabel }}</strong>
        </span>
      </div>
    </div>

    <div
      class="grading-session-progress__bar"
      role="progressbar"
      :aria-valuenow="progress.percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="grading-session-progress__bar-fill"
        :class="barFillClass"
        :style="{ width: `${progress.percent}%` }"
      />
    </div>

    <div class="grading-session-progress__foot">
      <span class="grading-session-progress__hint">{{ footHint }}</span>
      <span v-if="paceLabel" class="grading-session-progress__pace">{{ paceLabel }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { BatchProgress } from '@/composables/useMarkingTaskNavigation'
import type { MarkingRecentSubmitEntry } from '@/composables/useMarkingRecentSubmit'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  estimateGradingRemainingMs,
  formatGradingDurationZh,
  formatGradingPaceZh,
} from '@/utils/grading-session-pace'

defineOptions({ name: 'GradingSessionProgressBand' })

const props = withDefaults(
  defineProps<{
    progress: BatchProgress | null
    /** 本会话最近提交，用于 ETA；不足 2 条不估算 */
    recentSubmits?: MarkingRecentSubmitEntry[]
    /** 整卷 / 单题文案差异 */
    unitLabel?: string
  }>(),
  {
    recentSubmits: () => [],
    unitLabel: '份',
  },
)

const paceEstimate = computed(() => {
  if (!props.progress) {
    return null
  }
  const submittedAts = props.recentSubmits.map((entry) => entry.submittedAt)
  return estimateGradingRemainingMs(submittedAts, props.progress.remaining)
})

const etaLabel = computed(() => {
  if (!props.progress) {
    return '—'
  }
  if (props.progress.remaining <= 0) {
    return '本批已完成'
  }
  const estimate = paceEstimate.value
  if (!estimate) {
    return '继续批阅以估算'
  }
  return formatGradingDurationZh(estimate.remainingMs)
})

const paceLabel = computed(() => {
  const estimate = paceEstimate.value
  if (!estimate || estimate.avgMsPerItem <= 0 || props.progress?.remaining === 0) {
    return ''
  }
  return formatGradingPaceZh(estimate.avgMsPerItem)
})

const progressTone = computed(() => {
  if (!props.progress) {
    return 'gray' as const
  }
  if (props.progress.remaining <= 0) {
    return 'green' as const
  }
  if (props.progress.percent >= 70) {
    return 'blue' as const
  }
  if (props.progress.percent >= 35) {
    return 'orange' as const
  }
  return 'gray' as const
})

const barFillClass = computed(() => {
  if (!props.progress) {
    return ''
  }
  if (props.progress.remaining <= 0) {
    return 'grading-session-progress__bar-fill--done'
  }
  if (props.progress.percent >= 70) {
    return 'grading-session-progress__bar-fill--high'
  }
  if (props.progress.percent >= 35) {
    return 'grading-session-progress__bar-fill--mid'
  }
  return 'grading-session-progress__bar-fill--low'
})

const footHint = computed(() => {
  if (!props.progress) {
    return ''
  }
  if (props.progress.remaining <= 0) {
    return '本批任务已全部提交/定稿，可返回任务池领取下一批'
  }
  if (!paceEstimate.value) {
    return `已完成 ${props.progress.completed} ${props.unitLabel}，剩余 ${props.progress.remaining} ${props.unitLabel}；提交 2 份后显示预计剩余时间`
  }
  return `已完成 ${props.progress.completed} ${props.unitLabel}，剩余 ${props.progress.remaining} ${props.unitLabel}（按本会话节奏估算）`
})

const ariaLabel = computed(() => {
  if (!props.progress) {
    return '本批进度'
  }
  return `本批进度：已完成 ${props.progress.completed}，总量 ${props.progress.total}，剩余 ${props.progress.remaining}，预计剩余 ${etaLabel.value}`
})
</script>

<style lang="scss" scoped>
.grading-session-progress {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-fill-secondary);
}

.grading-session-progress__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
}

.grading-session-progress__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}

.grading-session-progress__title {
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
  line-height: 1.4;
}

.grading-session-progress__metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--dp-space-component) var(--dp-space-block);
}

.grading-session-progress__metric {
  display: inline-flex;
  align-items: baseline;
  gap: var(--dp-space-component-xs);
  white-space: nowrap;
}

.grading-session-progress__metric-label {
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

.grading-session-progress__metric-value {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-primary);
  line-height: 1.2;
}

.grading-session-progress__metric-unit {
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-secondary);
}

.grading-session-progress__metric--eta .grading-session-progress__metric-value {
  color: var(--dp-color-primary);
}

.grading-session-progress__bar {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dp-fill-tertiary);
}

.grading-session-progress__bar-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  transition: width var(--dp-duration-normal) var(--dp-ease-default);
  background: var(--dp-color-primary);

  &--low {
    background: var(--dp-text-quaternary);
  }

  &--mid {
    background: var(--dp-warning);
  }

  &--high {
    background: var(--dp-color-primary);
  }

  &--done {
    background: var(--dp-success);
  }
}

.grading-session-progress__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight) var(--dp-space-component);
}

.grading-session-progress__hint,
.grading-session-progress__pace {
  font-size: var(--dp-type-hint-size);
  line-height: 1.4;
  color: var(--dp-text-secondary);
}

.grading-session-progress__pace {
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-muted);
}
</style>