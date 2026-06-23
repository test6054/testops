<script setup lang="ts">
/**
 * 讯飞式扫描工作台：左任务进度 + 批次列表，右设备状态条 + 主 CTA。
 */
import {
  PlayCircleFilled,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import KioskSessionBatchPanel from '../components/KioskSessionBatchPanel.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const CALIBRATION_ACK_PREFIX = 'kiosk-sheet-calibration-ack:'

const { workflow, mutex, ui } = useKioskCtx()

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const exam = computed(() => workflow.kioskContext.value?.exam)
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
  await workflow.submitScanJob()
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

        <KioskSessionBatchPanel variant="setup" class="sidebar__batches" />
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
        <p v-else class="status-ready-hint">确认扫描参数后，点击「开始扫描」送纸。</p>

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

.sidebar__batches {
  flex: 1;
  min-height: 0;
  margin-top: var(--kiosk-space-2);
  padding-top: var(--kiosk-space-3);
  border-top: 1px solid var(--kiosk-divider);
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
