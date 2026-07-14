<script setup lang="ts">
/**
 * KioskBottomBar - 仅扫描中显示的底部操作栏 88px
 *
 * 操作（左→右）：暂停 / 继续（互斥显示） · 结束本批次 · 重试上传 · 重试提交 · 取消（ghost）
 * 计数（右）：已上传 / 异常（已扫与应扫见「结束本批次」旁摘要）
 *
 * 在 KioskLayout 中以 transition+ v-show 控制显隐。
 */
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { LocalScanJobStatusCode } from '@/apis/mark/scanner-agent-local'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, mutex } = useKioskCtx()

const hasOrphanBackendSession = computed(() => workflow.hasOrphanBackendScanSession.value)

const counterUploaded = computed(() => {
  const job = workflow.currentJob.value
  return job ? String(job.uploadedPages) : '—'
})
const counterException = computed(() => String(workflow.exceptionPages.value.length || 0))

const cantPause = computed(() => Boolean(mutex.reasonOf('pauseJob')))
const cantResume = computed(() => Boolean(mutex.reasonOf('resumeJob')))
const cantEnd = computed(() => Boolean(mutex.reasonOf('endBatch')))
const cantRetryUpload = computed(() => Boolean(mutex.reasonOf('retryUpload')))
const cantRetryCommit = computed(() => Boolean(mutex.reasonOf('retryCommit')))
const cantCancel = computed(() => Boolean(mutex.reasonOf('cancelJob')))
const showRemoveInsteadOfCancel = computed(() => {
  const job = workflow.currentJob.value
  return Boolean(job && !workflow.canCancelJob.value && workflow.canRemoveCurrentJob.value)
})
const cantExit = computed(() =>
  showRemoveInsteadOfCancel.value ? Boolean(mutex.reasonOf('removeJob')) : cantCancel.value,
)
const exitLabel = computed(() => {
  if (hasOrphanBackendSession.value) {
    return '结束未完成进程'
  }
  if (showRemoveInsteadOfCancel.value) {
    return workflow.currentJob.value?.reported ? '废弃批次' : '删除任务'
  }
  return workflow.isPreUploadScanFailure.value ? '取消并清理' : '取消'
})
const exitTitle = computed(() => {
  if (hasOrphanBackendSession.value) {
    return (
      mutex.reasonOf('cancelJob')
      || workflow.removeCurrentJobTitle.value
      || '结束后端未完成扫描进程并返回准备扫描'
    )
  }
  if (showRemoveInsteadOfCancel.value) {
    return mutex.reasonOf('removeJob') || workflow.removeCurrentJobTitle.value
  }
  return (
    mutex.reasonOf('cancelJob')
    || (workflow.isPreUploadScanFailure.value ? '清理失败的扫描任务并返回准备扫描' : '取消当前任务')
  )
})

const showResumeInsteadOfPause = computed(
  () => workflow.currentJob.value?.status === LocalScanJobStatusCode.PAUSED,
)

const endBatchMetrics = computed(() => {
  const job = workflow.currentJob.value
  const contract = workflow.kioskContext.value?.taskContract
  const expected = contract?.expectedPageCount
  if (!job) return []
  const scanned = job.scannedPages ?? 0
  const pending = Math.max(0, scanned - (job.uploadedPages ?? 0))
  return [
    { label: '已扫', value: String(scanned), tone: 'default' },
    {
      label: '应扫页',
      value: expected != null && expected > 0 ? String(expected) : '—',
      tone: 'muted',
    },
    { label: '待上传', value: String(pending), tone: pending > 0 ? 'warn' : 'default' },
  ]
})

const exitVariant = computed(() => {
  if (hasOrphanBackendSession.value) {
    return 'danger'
  }
  if (showRemoveInsteadOfCancel.value || workflow.isPreUploadScanFailure.value) {
    return 'danger'
  }
  return 'ghost'
})

function handleExitAction() {
  if (showRemoveInsteadOfCancel.value) {
    workflow.removeCurrentScanJob()
    return
  }
  workflow.cancelCurrentJob()
}
</script>

<template>
  <footer class="bottom-bar" :class="{ 'bottom-bar--orphan': hasOrphanBackendSession }">
    <p v-if="hasOrphanBackendSession" class="orphan-hint">
      服务端仍有未完成扫描批次，本机任务未恢复。请等待 Agent 自动续扫，或结束进程后重新开批。
    </p>
    <div class="bottom-actions">
      <template v-if="!hasOrphanBackendSession">
        <button
          v-if="!showResumeInsteadOfPause"
          type="button"
          class="action-btn action-btn--secondary"
          :disabled="cantPause"
          :title="mutex.reasonOf('pauseJob') || '暂停当前任务 [Space]'"
          @click="workflow.pauseCurrentJob"
        >
          <PauseCircleOutlined class="action-btn__icon" />
          暂停
        </button>
        <button
          v-else
          type="button"
          class="action-btn action-btn--secondary"
          :disabled="cantResume"
          :title="mutex.reasonOf('resumeJob') || '继续当前任务 [Space]'"
          @click="workflow.resumeCurrentJob"
        >
          <PlayCircleOutlined class="action-btn__icon" />
          继续
        </button>
        <div class="end-batch-group">
          <button
            type="button"
            class="action-btn action-btn--primary"
            :disabled="cantEnd"
            :title="mutex.reasonOf('endBatch') || '结束本批次并提交'"
            @click="workflow.endCurrentBatch"
          >
            <CheckCircleOutlined class="action-btn__icon" />
            结束本批次
          </button>
          <div v-if="endBatchMetrics.length" class="end-batch-summary" aria-label="批次摘要">
            <span
              v-for="metric in endBatchMetrics"
              :key="metric.label"
              class="summary-metric"
              :class="`summary-metric--${metric.tone}`"
            >
              <small>{{ metric.label }}</small>
              <b>{{ metric.value }}</b>
            </span>
          </div>
        </div>
        <button
          type="button"
          class="action-btn action-btn--secondary"
          :disabled="cantRetryUpload"
          :title="mutex.reasonOf('retryUpload') || '重试上传失败页'"
          @click="workflow.retryCurrentUpload"
        >
          <UploadOutlined class="action-btn__icon" />
          重试上传
        </button>
        <button
          type="button"
          class="action-btn action-btn--secondary"
          :disabled="cantRetryCommit"
          :title="mutex.reasonOf('retryCommit') || '重试提交'"
          @click="workflow.retryCurrentCommit"
        >
          <RedoOutlined class="action-btn__icon" />
          重试提交
        </button>
      </template>
      <button
        type="button"
        class="action-btn"
        :class="[
          `action-btn--${exitVariant}`,
          { 'action-btn--orphan-exit': hasOrphanBackendSession },
        ]"
        :disabled="cantExit"
        :title="exitTitle"
        @click="handleExitAction"
      >
        <DeleteOutlined v-if="showRemoveInsteadOfCancel" class="action-btn__icon" />
        <StopOutlined v-else class="action-btn__icon" />
        {{ exitLabel }}
      </button>
    </div>
    <div class="bottom-counters">
      <span>已上传 <b>{{ counterUploaded }}</b></span>
      <span class="warn">异常 <b>{{ counterException }}</b></span>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.bottom-bar {
  position: fixed;
  left: var(--kiosk-space-4);
  right: calc(var(--kiosk-w-side-rail) + var(--kiosk-space-4) * 2);
  bottom: var(--kiosk-space-4);
  height: var(--kiosk-h-bottom-bar);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  box-shadow: var(--kiosk-shadow-3);
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-5);
  padding: 0 var(--kiosk-space-5);
  z-index: var(--kiosk-z-bottom);
}
.bottom-bar--orphan {
  border-color: color-mix(in srgb, var(--kiosk-danger) 40%, var(--kiosk-divider));
  background: var(--kiosk-danger-soft);
}
.orphan-hint {
  position: absolute;
  left: var(--kiosk-space-5);
  top: -28px;
  margin: 0;
  padding: 4px 10px;
  max-width: min(720px, calc(100% - var(--kiosk-space-5) * 2));
  font-size: var(--kiosk-fz-caption);
  line-height: 1.4;
  color: var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
  border: 1px solid color-mix(in srgb, var(--kiosk-danger) 40%, var(--kiosk-divider));
  border-radius: var(--kiosk-radius-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-btn--orphan-exit {
  min-width: 148px;
}

.bottom-actions {
  display: flex;
  gap: var(--kiosk-space-3);
  align-items: center;
  min-width: 0;
}

.end-batch-group {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  min-width: 0;
}

.end-batch-summary {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: 0 var(--kiosk-space-3);
  height: 40px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.action-btn {
  height: var(--kiosk-h-action-md);
  min-width: 110px;
  padding: 0 var(--kiosk-space-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  background: var(--kiosk-surface-alt);
  color: var(--kiosk-ink-primary);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: 15px;
  font-weight: var(--kiosk-fw-semibold);
  line-height: 1;
  cursor: pointer;
  transition:
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    color var(--kiosk-dur-fast) var(--kiosk-easing),
    box-shadow var(--kiosk-dur-fast) var(--kiosk-easing),
    transform var(--kiosk-dur-fast) var(--kiosk-easing);
}
.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--kiosk-shadow-1);
}
.action-btn:disabled {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-disabled);
  border-color: var(--kiosk-divider);
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}
.action-btn__icon {
  font-size: 18px;
}
.action-btn--secondary:hover:not(:disabled) {
  background: var(--kiosk-primary-soft);
  border-color: color-mix(in srgb, var(--kiosk-primary) 45%, var(--kiosk-divider));
}
.action-btn--primary {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border-color: var(--kiosk-primary);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--kiosk-primary) 22%, transparent);
}
.action-btn--primary:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
  border-color: var(--kiosk-primary-pressed);
  box-shadow: 0 10px 20px color-mix(in srgb, var(--kiosk-primary-pressed) 28%, transparent);
}
.action-btn--ghost {
  background: transparent;
  color: var(--kiosk-ink-secondary);
  border: 1px solid var(--kiosk-divider);
}
.action-btn--ghost:hover:not(:disabled) {
  background: var(--kiosk-surface-alt);
}
.action-btn--danger {
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
  border-color: color-mix(in srgb, var(--kiosk-danger) 40%, var(--kiosk-divider));
}
.action-btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kiosk-danger) 14%, var(--kiosk-surface));
  border-color: color-mix(in srgb, var(--kiosk-danger) 55%, var(--kiosk-divider));
}

.summary-metric {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: var(--kiosk-ink-secondary);
}
.summary-metric small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.summary-metric b {
  font-size: 15px;
  color: var(--kiosk-ink-primary);
  font-weight: var(--kiosk-fw-bold);
}
.summary-metric--warn b {
  color: var(--kiosk-warning);
}

.bottom-counters {
  margin-left: auto;
  display: flex;
  gap: var(--kiosk-space-5);
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-h3);
  color: var(--kiosk-ink-secondary);
}
.bottom-counters b {
  margin-left: var(--kiosk-space-1);
  color: var(--kiosk-ink-primary);
  font-weight: var(--kiosk-fw-bold);
}
.bottom-counters .warn b {
  color: var(--kiosk-warning);
}

@media (max-width: bp.$shell-laptop-max) {
  .bottom-bar {
    right: calc(300px + var(--kiosk-space-4) * 2);
  }
  .end-batch-summary {
    display: none;
  }
}
@media (max-width: bp.$shell-tablet-max) {
  .bottom-bar {
    right: var(--kiosk-space-4);
  }
  .bottom-actions {
    gap: var(--kiosk-space-2);
  }
  .action-btn {
    min-width: 96px;
    padding: 0 14px;
  }
}
</style>
