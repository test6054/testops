<script setup lang="ts">
/**
 * 本机会话批次列表（Setup / Scanning 共用，对标讯飞左栏批次）。
 */
import type { ExamScannerKioskSessionBatchVO } from '@/apis/mark/scanner-kiosk'
import { DeleteOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import {
  ScanBatchStatusCode,
  ScanBatchStatusDescription,
} from '@/types/enums/scan-batch-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import { useKioskCtx } from '../composables/kioskInjection'

const props = withDefaults(
  defineProps<{
    /** scanning 模式仅高亮当前批次，不展示删除 */
    variant?: 'setup' | 'scanning'
  }>(),
  { variant: 'setup' },
)

const { workflow, stage } = useKioskCtx()

const batches = computed(() => {
  const rows = workflow.kioskContext.value?.sessionBatches ?? []
  const active = workflow.activeBackendBatch.value
  if (!active) return rows
  if (rows.some((row) => row.scanBatchId === active.scanBatchId)) {
    return rows
  }
  const activeRow: ExamScannerKioskSessionBatchVO = {
    scanBatchId: active.scanBatchId,
    batchNo: active.batchNo,
    batchExternalNo: active.batchExternalNo,
    scanMode: active.scanMode,
    status: active.status,
    scannedCount: active.pageCount ?? 0,
    exceptionCount: active.attentionItemCount ?? 0,
    uploadedCount: active.receivedPageCount ?? 0,
    scanStartTime: active.scanStartTime,
    scanEndTime: active.scanEndTime,
  }
  return [activeRow, ...rows]
})

const hasSessionBatchRows = computed(
  () => batches.value.length > 0 || workflow.activeBackendScanSession.value,
)
const expectedPageCount = computed(
  () => workflow.kioskContext.value?.taskContract?.expectedPageCount ?? null,
)

const setupEmptyHint = computed(() => {
  const expected = expectedPageCount.value
  const contract = workflow.kioskContext.value?.taskContract
  const planned = contract?.plannedStudentCount
  const pages = contract?.pagesPerSheet
  if (expected != null && expected > 0 && planned != null && pages != null && pages > 0) {
    return `应扫页 ${expected}（${planned} 人 × ${pages} 页）为考试总量；可多次送纸，送纸后将在此列出本机批次。`
  }
  if (expected != null && expected > 0) {
    return `应扫页 ${expected} 为考试总量；可多次送纸，送纸后将在此列出本机批次。`
  }
  return '可多次送纸或一次送完；送纸后将在此列出本机批次。'
})

const scanningEmptyHint = computed(() => {
  if (workflow.activeBackendScanSession.value) {
    const batch = workflow.activeBackendBatch.value
    const batchLabel = batch?.batchNo || batch?.batchExternalNo
    if (batchLabel) {
      return `当前批次 ${batchLabel} 扫描未结束；请继续送纸，或使用底部「取消并清理」结束本批次。`
    }
    return (
      workflow.activeBackendScanSessionReason.value || '扫描进程仍在恢复中，请先刷新当前扫描状态。'
    )
  }
  return '请先回到“准备扫描”点击“开始扫描”，单纯放纸不会自动创建本机批次。'
})

const highlightBatchId = computed(() => {
  const fromJob = workflow.currentJob.value?.scanBatchId
  const fromCtx = workflow.activeBackendBatch.value?.scanBatchId
  return fromJob || fromCtx || ''
})

function batchStatusLabel(status: ExamScannerKioskSessionBatchVO['status']): string {
  return strictEnumLabel(ScanBatchStatusDescription, status, '扫描批次状态')
}

function batchModeLabel(row: ExamScannerKioskSessionBatchVO): string {
  return workflow.scanModeText(row.scanMode, '')
}

function formatBatchPeriod(row: ExamScannerKioskSessionBatchVO): string {
  const start = workflow.formatTime(row.scanStartTime)
  if (start === '-') return '—'
  const end = workflow.formatTime(row.scanEndTime)
  if (end === '-') return start
  return `${start} → ${end}`
}

function openBatch(row: ExamScannerKioskSessionBatchVO) {
  if (props.variant === 'scanning') {
    if (row.scanBatchId === highlightBatchId.value) return
    workflow.errorMessage.value = '当前批次扫描未结束，请先结束本批次后再查看其它批次'
    return
  }
  const activeBatchId
    = workflow.activeBackendBatch.value?.scanBatchId || workflow.currentJob.value?.scanBatchId
  if (row.status === ScanBatchStatusCode.IN_PROGRESS || activeBatchId === row.scanBatchId) {
    stage.gotoStage('scanning')
  }
}

async function discardSessionBatch(row: ExamScannerKioskSessionBatchVO) {
  if (row.status === ScanBatchStatusCode.IN_PROGRESS && workflow.currentJob.value) {
    workflow.errorMessage.value = '当前批次正在扫描，请先结束或暂停后再删除'
    return
  }
  const reason = await promptInputAsync({
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
    workflow.errorMessage.value = error instanceof Error ? error.message : '删除扫描批次失败'
  } finally {
    workflow.loading.value = false
  }
}

function onDiscardClick(row: ExamScannerKioskSessionBatchVO, event: MouseEvent) {
  event.stopPropagation()
  void discardSessionBatch(row)
}
</script>

<template>
  <section class="batch-panel" :class="`batch-panel--${variant}`">
    <h3 class="batch-panel__head">本机批次</h3>
    <p v-if="variant === 'scanning'" class="batch-panel__note">
      以下为历史批次；本次扫描页数见顶部「已扫描」计数。
    </p>
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
            variant === 'scanning'
              && row.scanBatchId !== highlightBatchId
              && row.exceptionCount === 0
              ? '当前批次扫描未结束'
              : undefined
          "
          @click="openBatch(row)"
        >
          <span class="batch-row__no">{{ row.batchNo || row.batchExternalNo }}</span>
          <span class="batch-row__meta">{{ batchModeLabel(row) }} · {{ batchStatusLabel(row.status) }}</span>
          <span class="batch-row__counts">
            扫 {{ row.scannedCount }}
            <span v-if="row.exceptionCount > 0" class="batch-row__exc">异 {{ row.exceptionCount }}</span>
            传 {{ row.uploadedCount }}
          </span>
          <span class="batch-row__time">{{ formatBatchPeriod(row) }}</span>
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
      <p>{{ hasSessionBatchRows ? '批次列表同步中' : '尚未创建本机批次' }}</p>
      <small v-if="variant === 'setup'">{{ setupEmptyHint }}</small>
      <small v-else>{{ scanningEmptyHint }}</small>
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

.batch-panel__note {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  line-height: var(--kiosk-lh-base);
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
  grid-template-rows: auto auto auto;
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
  box-shadow: 0 0 0 2px var(--dp-focus-ring);
}

.batch-row--warn .batch-row__main {
  border-color: var(--kiosk-warning);
}

.batch-row--warn.batch-row--active .batch-row__main {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dp-orange-600) 20%, transparent);
}

.batch-row__no {
  grid-column: 1;
  grid-row: 1;
  font-weight: var(--kiosk-fw-semibold);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
}

.batch-row__meta {
  grid-column: 1;
  grid-row: 2;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.batch-row__counts {
  grid-column: 2;
  grid-row: 1 / 4;
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
  grid-row: 3;
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

.batch-panel__empty small {
  line-height: var(--kiosk-lh-base);
}

.batch-panel--scanning .batch-list {
  max-height: 100%;
}
</style>
