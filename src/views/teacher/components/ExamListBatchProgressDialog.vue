<template>
  <UiDialog
    :open="open"
    :title="title"
    :width="560"
    :closable="!running"
    :mask-closable="!running"
    @cancel="emit('close')"
  >
    <div class="exam-batch-progress">
      <UiProgressBar
        :percent="progressPercent"
        size="sm"
        :label="progressLabel"
        :format="formatProgress"
      />

      <ul class="exam-batch-progress__list" role="list" aria-live="polite">
        <li
          v-for="item in items"
          :key="item.examId"
          class="exam-batch-progress__item"
          :class="`exam-batch-progress__item--${item.status}`"
        >
          <span class="exam-batch-progress__mark" aria-hidden="true">{{ statusMark(item.status) }}</span>
          <div class="exam-batch-progress__body">
            <div class="exam-batch-progress__name">{{ item.examName }}</div>
            <div class="exam-batch-progress__meta">
              <span>{{ statusText(item) }}</span>
              <span v-if="item.message && item.status === 'failed'" class="exam-batch-progress__reason">
                （原因：{{ item.message }}）
              </span>
            </div>
            <div v-if="item.status === 'failed' && !running" class="exam-batch-progress__actions">
              <UiButton size="sm" variant="outline" :disabled="!!retryingExamId" @click="emit('retry', item.examId)">
                重试
              </UiButton>
              <UiButton size="sm" variant="outline" :disabled="!!retryingExamId" @click="emit('skip', item.examId)">
                跳过
              </UiButton>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="!running && finishedSummary" class="exam-batch-progress__summary">
        {{ finishedSummary }}
      </p>
    </div>

    <template #footer>
      <UiButton v-if="!running" size="sm" variant="primary" @click="emit('close')">
        完成
      </UiButton>
      <span v-else class="exam-batch-progress__running-hint">处理中，请勿关闭…</span>
    </template>
  </UiDialog>
</template>

<script lang="ts" setup>
import type { ExamBatchProgressItem, ExamBatchItemStatus } from '@/composables/useExamListBatchLifecycle'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'

defineOptions({ name: 'ExamListBatchProgressDialog' })

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    actionLabel: string
    items: ExamBatchProgressItem[]
    running: boolean
    retryingExamId?: string | null
  }>(),
  {
    retryingExamId: null,
  },
)

const emit = defineEmits<{
  close: []
  retry: [examId: string]
  skip: [examId: string]
}>()

const settledCount = computed(() =>
  props.items.filter((item) =>
    item.status === 'success' || item.status === 'failed' || item.status === 'skipped',
  ).length,
)

const successCount = computed(() => props.items.filter((item) => item.status === 'success').length)
const failedCount = computed(() => props.items.filter((item) => item.status === 'failed').length)
const skippedCount = computed(() => props.items.filter((item) => item.status === 'skipped').length)

const progressPercent = computed(() => {
  if (props.items.length === 0) {
    return 0
  }
  return Math.round((settledCount.value / props.items.length) * 100)
})

const progressLabel = computed(() => `${props.actionLabel}中`)

function formatProgress(_percent: number): string {
  return `${settledCount.value}/${props.items.length}`
}

function statusMark(status: ExamBatchItemStatus): string {
  if (status === 'success') return '✓'
  if (status === 'failed') return '⚠'
  if (status === 'running') return '●'
  if (status === 'skipped') return '–'
  return '○'
}

function statusText(item: ExamBatchProgressItem): string {
  if (item.status === 'success') return '已完成'
  if (item.status === 'failed') return '失败'
  if (item.status === 'running') return '处理中...'
  if (item.status === 'skipped') return '已跳过'
  return '等待中'
}

const finishedSummary = computed(() => {
  if (props.running || props.items.length === 0) {
    return ''
  }
  return `${props.actionLabel}结束：成功 ${successCount.value} · 失败 ${failedCount.value} · 跳过 ${skippedCount.value}（共 ${props.items.length}）`
})
</script>

<style lang="scss" scoped>
.exam-batch-progress {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.exam-batch-progress__list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.exam-batch-progress__item {
  display: flex;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border-bottom: 1px solid var(--dp-border-subtle);

  &:last-child {
    border-bottom: 0;
  }

  &--running {
    background: color-mix(in srgb, var(--dp-color-primary) 6%, transparent);
  }

  &--failed {
    background: color-mix(in srgb, var(--dp-warning) 8%, transparent);
  }

  &--success .exam-batch-progress__mark {
    color: var(--dp-success);
  }

  &--failed .exam-batch-progress__mark {
    color: var(--dp-warning);
  }

  &--running .exam-batch-progress__mark {
    color: var(--dp-color-primary);
  }

  &--waiting .exam-batch-progress__mark,
  &--skipped .exam-batch-progress__mark {
    color: var(--dp-text-muted);
  }
}

.exam-batch-progress__mark {
  flex-shrink: 0;
  width: 1.25em;
  font-weight: 600;
  line-height: 1.5;
}

.exam-batch-progress__body {
  min-width: 0;
  flex: 1;
}

.exam-batch-progress__name {
  font-size: var(--dp-font-size-sm);
  font-weight: 500;
  color: var(--dp-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-batch-progress__meta {
  margin-top: 2px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  line-height: 1.4;
}

.exam-batch-progress__reason {
  color: var(--dp-text-secondary);
}

.exam-batch-progress__actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-xs);
}

.exam-batch-progress__summary {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.exam-batch-progress__running-hint {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
}
</style>
