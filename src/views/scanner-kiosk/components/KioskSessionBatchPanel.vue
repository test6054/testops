<script setup lang="ts">
/**
 * 本机会话批次列表（Setup / Scanning 共用，对标讯飞左栏批次）。
 */
import type { ExamScannerKioskSessionBatchVO } from '@/apis/mark/scanner-kiosk'
import { DeleteOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptModal } from '@/views/quality/_helpers'
import { useKioskCtx } from '../composables/kioskInjection'

const props = withDefaults(
  defineProps<{
    /** scanning 模式仅高亮当前批次，不展示删除 */
    variant?: 'setup' | 'scanning'
  }>(),
  { variant: 'setup' },
)

const emit = defineEmits<{
  'start-scan': []
}>()

const { workflow, mutex, stage } = useKioskCtx()

const batches = computed(() => workflow.kioskContext.value?.sessionBatches ?? [])
const startReason = computed(() => mutex.reasonOf('startScan'))

const highlightBatchId = computed(() => {
  const fromJob = workflow.currentJob.value?.scanBatchId
  const fromCtx = workflow.kioskContext.value?.activeBatch?.scanBatchId
  return fromJob || fromCtx || ''
})

function openBatch(row: ExamScannerKioskSessionBatchVO) {
  if (props.variant === 'scanning') {
    if (row.scanBatchId === highlightBatchId.value) return
    if (row.exceptionCount > 0) {
      stage.gotoStage('review')
      return
    }
    workflow.errorMessage.value = '当前批次扫描未结束，请先结束本批次后再查看其它批次'
    return
  }
  const activeBatchId
    = workflow.kioskContext.value?.activeBatch?.scanBatchId
      || workflow.currentJob.value?.scanBatchId
  if (row.status === 'IN_PROGRESS' || activeBatchId === row.scanBatchId) {
    stage.gotoStage('scanning')
    return
  }
  if (row.exceptionCount > 0) stage.gotoStage('review')
}

async function discardSessionBatch(row: ExamScannerKioskSessionBatchVO) {
  if (row.status === 'IN_PROGRESS' && workflow.currentJob.value) {
    workflow.errorMessage.value = '当前批次正在扫描，请先结束或暂停后再删除'
    return
  }
  const reason = await promptModal({
    title: `删除批次 ${row.batchNo || row.batchExternalNo}`,
    placeholder: '请输入删除原因（必填，1-255 字）',
    required: true,
    okText: '下一步',
    okType: 'danger',
    emptyErrorMessage: '删除原因不能为空',
  })
  if (reason === null) return
  if (reason.length > 255) {
    workflow.errorMessage.value = '删除原因长度不能超过 255'
    return
  }
  const confirmed = await confirmAsync({
    title: '确认删除批次',
    content: '将同步删除本地与云端该批次全部考卷图片，且不可恢复。',
    type: 'error',
    okText: '删除',
  })
  if (!confirmed) return
  workflow.loading.value = true
  workflow.errorMessage.value = ''
  try {
    await discardScannerKioskBatch({
      scanBatchId: row.scanBatchId,
      discardReason: reason,
    })
    workflow.successMessage.value = '已删除扫描批次'
    await workflow.refreshAll()
  } catch (error) {
    workflow.errorMessage.value
      = error instanceof Error ? error.message : '删除扫描批次失败'
  } finally {
    workflow.loading.value = false
  }
}

function onDiscardClick(row: ExamScannerKioskSessionBatchVO, event: MouseEvent) {
  event.stopPropagation()
  void discardSessionBatch(row)
}

function startScanFromEmpty() {
  if (!workflow.canStartScan.value) return
  emit('start-scan')
}
</script>

<template>
  <section class="batch-panel" :class="`batch-panel--${variant}`">
    <h3 class="batch-panel__head">本机批次</h3>
    <ul v-if="batches.length" class="batch-list">
      <li
        v-for="row in batches"
        :key="row.scanBatchId"
        class="batch-row"
        :class="{
          'batch-row--active': row.scanBatchId === highlightBatchId,
          'batch-row--warn': row.exceptionCount > 0,
        }"
      >
        <button
          type="button"
          class="batch-row__main"
          :title="
            variant === 'scanning' && row.scanBatchId !== highlightBatchId && row.exceptionCount === 0
              ? '当前批次扫描未结束'
              : undefined
          "
          @click="openBatch(row)"
        >
          <span class="batch-row__no">{{ row.batchNo || row.batchExternalNo }}</span>
          <span class="batch-row__counts">
            扫 {{ row.scannedCount }}
            <span v-if="row.exceptionCount > 0" class="batch-row__exc">异 {{ row.exceptionCount }}</span>
            传 {{ row.uploadedCount }}
          </span>
          <span class="batch-row__time">{{ workflow.formatTime(row.scanStartTime) }}</span>
        </button>
        <button
          v-if="variant === 'setup'"
          type="button"
          class="batch-row__del"
          title="删除本批次所有考卷"
          @click="onDiscardClick(row, $event)"
        >
          <DeleteOutlined />
        </button>
      </li>
    </ul>
    <div v-else class="batch-panel__empty">
      <p>尚未创建扫描批次</p>
      <small v-if="variant === 'setup'">确认扫描参数后，点击「开始扫描」送纸</small>
      <small v-else>送纸后将自动创建本机批次</small>
      <button
        v-if="variant === 'setup'"
        type="button"
        class="batch-panel__empty-btn"
        :disabled="!workflow.canStartScan.value"
        :title="startReason || workflow.scanBlockedReason.value || '开始扫描'"
        @click="startScanFromEmpty"
      >
        开始扫描
      </button>
    </div>
  </section>
</template>

<style scoped>
.batch-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.batch-panel__head {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
}

.batch-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.batch-row {
  display: flex;
  align-items: stretch;
  gap: var(--kiosk-space-1);
}

.batch-row__main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px var(--kiosk-space-2);
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}

.batch-row__main:hover {
  border-color: var(--kiosk-primary);
}

.batch-row--active .batch-row__main {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.15);
}

.batch-row--warn .batch-row__main {
  border-color: var(--kiosk-warning);
}

.batch-row--warn.batch-row--active .batch-row__main {
  box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
}

.batch-row__no {
  grid-column: 1;
  font-weight: var(--kiosk-fw-semibold);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
}

.batch-row__counts {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.batch-row__exc {
  color: var(--kiosk-warning);
  font-weight: var(--kiosk-fw-medium);
}

.batch-row__time {
  grid-column: 1;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.batch-row__del {
  width: var(--kiosk-h-icon-button);
  flex: 0 0 var(--kiosk-h-icon-button);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-tertiary);
  cursor: pointer;
}

.batch-row__del:hover {
  border-color: var(--kiosk-danger);
  color: var(--kiosk-danger);
}

.batch-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-4);
  text-align: center;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.batch-panel__empty p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
}

.batch-panel__empty-btn {
  margin-top: var(--kiosk-space-2);
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-primary-soft);
  border: 1px solid var(--kiosk-primary);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-primary);
  cursor: pointer;
}

.batch-panel__empty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-panel--scanning .batch-list {
  max-height: 100%;
}
</style>
