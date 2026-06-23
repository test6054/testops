<script setup lang="ts">
/**
 * 讯飞式扫描工作台：左任务进度 + 批次列表，右设备状态条 + 主 CTA。
 */
import type { ExamScannerKioskSessionBatchVO } from '@/apis/mark/scanner-kiosk'
import {
  DeleteOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  ScanOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptModal } from '@/views/quality/_helpers'
import { useKioskCtx } from '../composables/kioskInjection'

const CALIBRATION_ACK_PREFIX = 'kiosk-sheet-calibration-ack:'

const { workflow, mutex, stage, ui } = useKioskCtx()

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const exam = computed(() => workflow.kioskContext.value?.exam)
const batches = computed(() => workflow.kioskContext.value?.sessionBatches ?? [])
const readiness = computed(() => workflow.deviceReadiness.value)
const startReason = computed(() => mutex.reasonOf('startScan'))
const scanConfig = computed(() => workflow.scanConfig.value)

const templateExpanded = ref(false)

const breadcrumb = computed(() => {
  const name = exam.value?.examName || '未绑定考试'
  const course = exam.value?.courseName
  return course ? `${name}（${course}）` : name
})

const expectedSheets = computed(() => contract.value?.expectedSheetCount ?? null)
const scannedSheets = computed(() => contract.value?.scannedSheetCount ?? null)
const attentionCount = computed(() => {
  const raw = workflow.kioskMetrics.value.attentionCount
  if (raw === '-' || raw === '—') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

const progressPercent = computed(() => {
  const expected = expectedSheets.value
  const scanned = scannedSheets.value
  if (expected == null || expected <= 0 || scanned == null) return 0
  return Math.min(100, Math.round((scanned / expected) * 100))
})

const scanParamSummary = computed(() => {
  const parts: string[] = []
  if (scanConfig.value.dpi) parts.push(`${scanConfig.value.dpi} DPI`)
  if (scanConfig.value.colorMode) {
    parts.push(workflow.scannerColorModeLabel(scanConfig.value.colorMode))
  }
  if (scanConfig.value.duplexMode) {
    parts.push(workflow.scannerDuplexModeLabel(scanConfig.value.duplexMode))
  }
  return parts.length ? parts.join(' · ') : '参数未加载'
})

const calibrationExamKey = computed(() => {
  const id = workflow.examId.value
  return id ? `${CALIBRATION_ACK_PREFIX}${id}` : ''
})

function hasCalibrationAck(): boolean {
  const key = calibrationExamKey.value
  if (!key) return false
  return sessionStorage.getItem(key) === '1'
}

function markCalibrationAck() {
  const key = calibrationExamKey.value
  if (key) sessionStorage.setItem(key, '1')
}

function refreshDevice() {
  void workflow.refreshAll()
}

function openParams() {
  ui.openScanParams()
}

async function confirmCalibrationIfNeeded(): Promise<boolean> {
  if (hasCalibrationAck() || !contract.value) return true
  const confirmed = await confirmAsync({
    title: '答题卡校验提示',
    content:
      '首次扫描建议先核对模板与纸型：首张送纸后请在「扫描中」预览定位是否正常；'
      + '若切分框偏差，请暂停并在 Web 端调整模板后再继续批量扫描。',
    okText: '已了解，开始扫描',
    cancelText: '先检查参数',
  })
  if (confirmed) markCalibrationAck()
  return confirmed
}

async function startScan() {
  if (!workflow.canStartScan.value) return
  const ok = await confirmCalibrationIfNeeded()
  if (!ok) return
  workflow.submitScanJob()
}

function openBatch(row: ExamScannerKioskSessionBatchVO) {
  const activeBatchId =
    workflow.kioskContext.value?.activeBatch?.scanBatchId
    || workflow.currentJob.value?.scanBatchId
  if (row.status === 'IN_PROGRESS' || activeBatchId === row.scanBatchId) {
    stage.gotoStage('scanning')
    return
  }
  if (row.exceptionCount > 0) {
    stage.gotoStage('review')
  }
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
    workflow.errorMessage.value =
      error instanceof Error ? error.message : '删除扫描批次失败'
  } finally {
    workflow.loading.value = false
  }
}

function onBatchDiscardClick(row: ExamScannerKioskSessionBatchVO, event: MouseEvent) {
  event.stopPropagation()
  void discardSessionBatch(row)
}
</script>

<template>
  <section class="workbench">
    <header class="workbench__crumb">
      <span>当前位置：{{ breadcrumb }} &gt; 扫描答卷</span>
    </header>

    <div class="workbench__grid">
      <aside class="sidebar">
        <h2 class="sidebar__title">{{ exam?.examName || '—' }}</h2>
        <p v-if="contract?.gradeSubjectText" class="sidebar__sub">{{ contract.gradeSubjectText }}</p>

        <div class="progress-kpi">
          <div class="progress-kpi__item">
            <span>应扫</span>
            <strong>{{ expectedSheets ?? '—' }}</strong>
          </div>
          <div class="progress-kpi__item">
            <span>已扫</span>
            <strong>{{ scannedSheets ?? '—' }}</strong>
          </div>
          <div class="progress-kpi__item" :class="{ 'progress-kpi__item--warn': (attentionCount ?? 0) > 0 }">
            <span>异常</span>
            <strong>{{ attentionCount ?? '—' }}</strong>
          </div>
        </div>

        <div v-if="expectedSheets != null && expectedSheets > 0" class="progress-bar-wrap">
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: `${progressPercent}%` }" />
          </div>
          <span class="progress-bar__pct">{{ progressPercent }}%</span>
        </div>

        <p v-if="contract?.plannedStudentCount != null" class="sidebar__hint">
          计划人数 {{ contract.plannedStudentCount }}
        </p>

        <details v-if="contract" class="template-fold" :open="templateExpanded">
          <summary @click.prevent="templateExpanded = !templateExpanded">模板摘要</summary>
          <dl class="template-fold__body">
            <div v-if="contract.schoolName">
              <dt>学校</dt>
              <dd>{{ contract.schoolName }}</dd>
            </div>
            <div v-if="contract.templateDisplayName">
              <dt>模板</dt>
              <dd>{{ contract.templateDisplayName }}</dd>
            </div>
            <div>
              <dt>纸型</dt>
              <dd>{{ contract.paperStyleText }}</dd>
            </div>
            <div>
              <dt>考号</dt>
              <dd>{{ contract.candidateIdFormatText }}</dd>
            </div>
            <div>
              <dt>题型</dt>
              <dd>客观 {{ contract.objectiveQuestionCount }} · 主观 {{ contract.subjectiveQuestionCount }}</dd>
            </div>
          </dl>
          <button type="button" class="template-fold__link" @click="openParams">答题卡校验 / 扫描参数 →</button>
        </details>

        <section class="batches">
          <h3 class="batches__head">本机批次</h3>
          <ul v-if="batches.length" class="batch-list">
            <li
              v-for="row in batches"
              :key="row.scanBatchId"
              class="batch-row"
              :class="{ 'batch-row--warn': row.exceptionCount > 0 }"
            >
              <button type="button" class="batch-row__main" @click="openBatch(row)">
                <span class="batch-row__no">{{ row.batchNo || row.batchExternalNo }}</span>
                <span class="batch-row__counts">
                  扫 {{ row.scannedCount }}
                  <span v-if="row.exceptionCount > 0" class="batch-row__exc">异 {{ row.exceptionCount }}</span>
                  传 {{ row.uploadedCount }}
                </span>
                <span class="batch-row__time">{{ workflow.formatTime(row.scanStartTime) }}</span>
              </button>
              <button
                type="button"
                class="batch-row__del"
                title="删除本批次所有考卷"
                @click="onBatchDiscardClick(row, $event)"
              >
                <DeleteOutlined />
              </button>
            </li>
          </ul>
          <div v-else class="batches__empty">
            <ScanOutlined class="batches__empty-icon" />
            <p>尚未创建扫描批次</p>
            <small>确认扫描参数后，点击「开始扫描」送纸</small>
            <button
              type="button"
              class="batches__empty-btn"
              :disabled="!workflow.canStartScan.value"
              :title="startReason || workflow.scanBlockedReason.value || '开始扫描'"
              @click="startScan"
            >
              开始扫描
            </button>
          </div>
        </section>
      </aside>

      <div class="main">
        <div class="status-bar" :class="`status-bar--${readiness.tone}`">
          <div class="status-bar__left">
            <span class="status-led" :class="`status-led--${readiness.tone}`" />
            <div class="status-bar__text">
              <strong>{{ readiness.statusText }}</strong>
              <small>{{ scanParamSummary }}</small>
            </div>
          </div>
          <button type="button" class="icon-btn" title="刷新设备状态" @click="refreshDevice">
            <ReloadOutlined :spin="workflow.loading.value" />
          </button>
        </div>

        <div v-if="readiness.troubleshooting || readiness.tone !== 'success'" class="status-detail">
          <p>{{ readiness.troubleshooting || readiness.detail }}</p>
        </div>
        <p v-else class="status-ready-hint">{{ readiness.detail }}</p>

        <div class="actions">
          <button type="button" class="ghost-btn" @click="openParams">
            <SettingOutlined />
            <span>扫描参数</span>
          </button>
          <button
            type="button"
            class="start-btn"
            :disabled="!workflow.canStartScan.value"
            :title="startReason || workflow.scanBlockedReason.value || '开始扫描'"
            @click="startScan"
          >
            <PlayCircleFilled />
            <span>开始扫描</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
}

.workbench__crumb {
  margin-bottom: var(--kiosk-space-4);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.workbench__grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: var(--kiosk-space-5);
  flex: 1;
  min-height: 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  min-height: 0;
  overflow-y: auto;
}

.sidebar__title {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  line-height: var(--kiosk-lh-tight);
}

.sidebar__sub {
  margin: 0;
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-label);
}

.sidebar__hint {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.progress-kpi {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--kiosk-space-2);
  margin-top: var(--kiosk-space-1);
}

.progress-kpi__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--kiosk-space-2);
  background: var(--kiosk-surface-alt);
  border-radius: var(--kiosk-radius-md);
}

.progress-kpi__item span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.progress-kpi__item strong {
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}

.progress-kpi__item--warn strong {
  color: var(--kiosk-warning);
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--kiosk-neutral-soft);
  border-radius: var(--kiosk-radius-pill);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: var(--kiosk-primary);
  border-radius: var(--kiosk-radius-pill);
  transition: width var(--kiosk-dur-base) var(--kiosk-easing);
}

.progress-bar__pct {
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  min-width: 36px;
  text-align: right;
}

.template-fold {
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
}

.template-fold summary {
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  list-style: none;
}

.template-fold summary::-webkit-details-marker {
  display: none;
}

.template-fold__body {
  margin: var(--kiosk-space-2) 0 0;
  display: grid;
  gap: var(--kiosk-space-2);
}

.template-fold__body div {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: var(--kiosk-space-2);
}

.template-fold__body dt {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.template-fold__body dd {
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-primary);
}

.template-fold__link {
  margin-top: var(--kiosk-space-2);
  padding: 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-primary);
  cursor: pointer;
}

.batches {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: var(--kiosk-space-2);
  padding-top: var(--kiosk-space-3);
  border-top: 1px solid var(--kiosk-divider);
}

.batches__head {
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

.batch-row--warn .batch-row__main {
  border-color: var(--kiosk-warning);
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

.batches__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-5) var(--kiosk-space-3);
  text-align: center;
}

.batches__empty-icon {
  font-size: 32px;
  color: var(--kiosk-ink-tertiary);
}

.batches__empty p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
}

.batches__empty small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.batches__empty-btn {
  margin-top: var(--kiosk-space-2);
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-primary-soft);
  border: 1px solid var(--kiosk-primary);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-primary);
  cursor: pointer;
}

.batches__empty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-5);
  justify-content: center;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-4);
  padding: var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
}

.status-bar--success {
  border-color: var(--kiosk-success);
  background: var(--kiosk-success-soft);
}

.status-bar--danger {
  border-color: var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
}

.status-bar--warning {
  border-color: var(--kiosk-warning);
  background: var(--kiosk-warning-soft);
}

.status-bar__left {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  min-width: 0;
}

.status-led {
  width: var(--kiosk-led-size);
  height: var(--kiosk-led-size);
  border-radius: 50%;
  flex: 0 0 auto;
  background: var(--kiosk-neutral);
}

.status-led--success {
  background: var(--kiosk-success);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-success-soft);
}

.status-led--danger {
  background: var(--kiosk-danger);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-danger-soft);
}

.status-led--warning {
  background: var(--kiosk-warning);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-warning-soft);
}

.status-bar__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.status-bar__text strong {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}

.status-bar__text small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.icon-btn {
  width: var(--kiosk-h-icon-button);
  height: var(--kiosk-h-icon-button);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  cursor: pointer;
  flex: 0 0 auto;
}

.status-detail {
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
}

.status-detail p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.status-ready-hint {
  margin: 0;
  text-align: center;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-tertiary);
}

.actions {
  display: flex;
  gap: var(--kiosk-space-3);
  justify-content: center;
  align-items: stretch;
}

.ghost-btn,
.start-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  font-family: inherit;
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
  border-radius: var(--kiosk-radius-md);
}

.ghost-btn {
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-h3);
}

.start-btn {
  height: var(--kiosk-h-cta);
  min-width: 240px;
  padding: 0 var(--kiosk-space-6);
  background: var(--kiosk-primary);
  border: none;
  color: #fff;
  font-size: var(--kiosk-fz-h2);
}

.start-btn:disabled {
  background: var(--kiosk-neutral);
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .workbench__grid {
    grid-template-columns: 1fr;
  }
}
</style>
