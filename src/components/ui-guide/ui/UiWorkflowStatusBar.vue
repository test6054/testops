<template>
  <section class="ui-workflow-status-bar" v-bind="$attrs">
    <div class="ui-workflow-status-bar__head">
      <div class="ui-workflow-status-bar__title-wrap">
        <div v-if="props.title" class="ui-workflow-status-bar__title">{{ props.title }}</div>
        <div v-if="props.detail" class="ui-workflow-status-bar__detail">{{ props.detail }}</div>
      </div>

      <div class="ui-workflow-status-bar__meta">
        <UiBadge
          :tone="statusTone"
          variant="soft"
          size="sm"
        >
          {{ props.statusLabel || statusText }}
        </UiBadge>
        <span v-if="props.showPercent" class="ui-workflow-status-bar__percent">{{ normalizedPercent }}%</span>
        <slot name="actions" />
      </div>
    </div>

    <UiProgressBar
      :percent="normalizedPercent"
      size="small"
      :show-text="false"
      :color="progressColor"
    />

    <div v-if="props.steps.length" class="ui-workflow-status-bar__steps">
      <div
        v-for="item in props.steps"
        :key="item.key"
        class="ui-workflow-status-bar__step"
      >
        <span
          class="ui-workflow-status-bar__step-dot"
          :class="`ui-workflow-status-bar__step-dot--${item.status}`"
        />
        <span class="ui-workflow-status-bar__step-label">{{ item.label }}</span>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiWorkflowStepItem } from './types'
import { computed } from 'vue'
import UiBadge from './Badge.vue'
import UiProgressBar from './ProgressBar.vue'

defineOptions({
  name: 'UiWorkflowStatusBar',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  detail?: string
  status?: UiWorkflowStepItem['status']
  statusLabel?: string
  progress?: number
  steps?: UiWorkflowStepItem[]
  showPercent?: boolean
}>(), {
  title: '',
  detail: '',
  status: 'pending',
  statusLabel: '',
  progress: 0,
  steps: () => [],
  showPercent: true,
})

const normalizedPercent = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.progress || 0)))
})

const statusTone = computed<BadgeTone>(() => {
  switch (props.status) {
    case 'running':
      return 'blue'
    case 'completed':
      return 'green'
    case 'failed':
      return 'red'
    case 'pending':
    default:
      return 'gray'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'running':
      return '运行中'
    case 'completed':
      return '已完成'
    case 'failed':
      return '失败'
    case 'pending':
    default:
      return '待启动'
  }
})

const progressColor = computed(() => {
  switch (props.status) {
    case 'completed':
      return '#16a34a'
    case 'failed':
      return '#dc2626'
    case 'running':
      return '#2563eb'
    case 'pending':
    default:
      return '#94a3b8'
  }
})
</script>

<style scoped>
.ui-workflow-status-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
}

.ui-workflow-status-bar__head,
.ui-workflow-status-bar__meta,
.ui-workflow-status-bar__steps,
.ui-workflow-status-bar__step {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ui-workflow-status-bar__head {
  justify-content: space-between;
}

.ui-workflow-status-bar__title-wrap {
  min-width: 0;
  flex: 1;
}

.ui-workflow-status-bar__title {
  font-size: 15px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-workflow-status-bar__detail {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.ui-workflow-status-bar__percent {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-workflow-status-bar__steps {
  flex-wrap: wrap;
}

.ui-workflow-status-bar__step {
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-workflow-status-bar__step-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.ui-workflow-status-bar__step-dot--pending {
  background: #cbd5e1;
}

.ui-workflow-status-bar__step-dot--running {
  background: #2563eb;
}

.ui-workflow-status-bar__step-dot--completed {
  background: #16a34a;
}

.ui-workflow-status-bar__step-dot--failed {
  background: #dc2626;
}

.ui-workflow-status-bar__step-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

@media (max-width: 767px) {
  .ui-workflow-status-bar__head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
