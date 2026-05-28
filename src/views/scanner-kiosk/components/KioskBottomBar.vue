<script setup lang="ts">
/**
 * KioskBottomBar - 仅扫描中显示的底部操作栏 88px
 *
 * 操作（左→右）：暂停 / 继续（互斥显示） · 结束本批次 · 重试上传 · 重试 commit · 取消（ghost）
 * 计数（右）：已扫 / 已上传 / 异常
 *
 * 在 KioskLayout 中以 transition+ v-show 控制显隐。
 */
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, mutex } = useKioskCtx()

const counterScanned = computed(() => {
  const job = workflow.currentJob.value
  return job ? String(job.scannedPages) : '—'
})
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

const showResumeInsteadOfPause = computed(() => workflow.currentJob.value?.status === 'PAUSED')
</script>

<template>
  <footer class="bottom-bar">
    <div class="bottom-actions">
      <button
        v-if="!showResumeInsteadOfPause"
        type="button"
        class="action-btn"
        :disabled="cantPause"
        :title="mutex.reasonOf('pauseJob') || '暂停当前任务 [Space]'"
        @click="workflow.pauseCurrentJob"
      >
        暂停
      </button>
      <button
        v-else
        type="button"
        class="action-btn"
        :disabled="cantResume"
        :title="mutex.reasonOf('resumeJob') || '继续当前任务 [Space]'"
        @click="workflow.resumeCurrentJob"
      >
        继续
      </button>
      <button
        type="button"
        class="action-btn"
        :disabled="cantEnd"
        :title="mutex.reasonOf('endBatch') || '结束本批次并提交'"
        @click="workflow.endCurrentBatch"
      >
        结束本批次
      </button>
      <button
        type="button"
        class="action-btn"
        :disabled="cantRetryUpload"
        :title="mutex.reasonOf('retryUpload') || '重试上传失败页'"
        @click="workflow.retryCurrentUpload"
      >
        重试上传
      </button>
      <button
        type="button"
        class="action-btn"
        :disabled="cantRetryCommit"
        :title="mutex.reasonOf('retryCommit') || '重试 commit'"
        @click="workflow.retryCurrentCommit"
      >
        重试 commit
      </button>
      <button
        type="button"
        class="action-btn ghost"
        :disabled="cantCancel"
        :title="mutex.reasonOf('cancelJob') || '取消当前任务'"
        @click="workflow.cancelCurrentJob"
      >
        取消
      </button>
    </div>
    <div class="bottom-counters">
      <span
        >已扫 <b>{{ counterScanned }}</b></span
      >
      <span
        >已上传 <b>{{ counterUploaded }}</b></span
      >
      <span class="warn"
        >异常 <b>{{ counterException }}</b></span
      >
    </div>
  </footer>
</template>

<style scoped>
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

.bottom-actions {
  display: flex;
  gap: var(--kiosk-space-3);
}

.action-btn {
  height: var(--kiosk-h-action-md);
  min-width: 120px;
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.action-btn:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}
.action-btn:disabled {
  background: var(--kiosk-neutral-soft);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
}
.action-btn.ghost {
  background: transparent;
  color: var(--kiosk-ink-secondary);
  border: 1px solid var(--kiosk-divider);
}
.action-btn.ghost:hover:not(:disabled) {
  background: var(--kiosk-surface-alt);
}

.bottom-counters {
  margin-left: auto;
  display: flex;
  gap: var(--kiosk-space-5);
  font-family: var(--kiosk-font-mono);
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

@media (max-width: 1280px) {
  .bottom-bar {
    right: calc(300px + var(--kiosk-space-4) * 2);
  }
}
@media (max-width: 1024px) {
  .bottom-bar {
    right: var(--kiosk-space-4);
  }
}
</style>
