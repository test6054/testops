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

const { workflow, mutex, ui, stage } = useKioskCtx()

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

const expectedPages = computed(() => contract.value?.expectedPageCount ?? null)
const scannedPages = computed(() => contract.value?.scannedPageCount ?? null)
const expectedPagesFormula = computed(() => {
  const planned = contract.value?.plannedStudentCount
  const pages = contract.value?.pagesPerSheet
  if (planned == null || planned <= 0 || pages == null || pages <= 0) return ''
  return `${planned} 人 × ${pages} 页`
})
const hasActiveScanSession = computed(() => workflow.activeBackendScanSession.value)
const attentionCount = computed(() => {
  const raw = workflow.kioskMetrics.value.attentionCount
  if (raw === '-' || raw === '—') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

const progressPercent = computed(() => {
  const expected = expectedPages.value
  const scanned = scannedPages.value
  if (expected == null || expected <= 0 || scanned == null) return 0
  return Math.min(100, Math.round((scanned / expected) * 100))
})

const scanModeLabel = computed(() => workflow.scanModeText(workflow.scanMode.value, ''))

const scanModeTone = computed(() => {
  const mode = workflow.scanMode.value
  if (mode === 'SUPPLEMENT') return 'supplement'
  if (mode === 'ARCHIVE') return 'archive'
  return 'direct'
})

const hardwareParamItems = computed(() => {
  const items: string[] = []
  if (scanConfig.value.dpi) items.push(`${scanConfig.value.dpi} DPI`)
  if (scanConfig.value.colorMode) {
    items.push(workflow.scannerColorModeLabel(scanConfig.value.colorMode))
  }
  if (scanConfig.value.duplexMode) {
    items.push(workflow.scannerDuplexModeLabel(scanConfig.value.duplexMode))
  }
  return items
})

const scanProfileReady = computed(() => hardwareParamItems.value.length > 0)

const statusDetailLine = computed(() => {
  const { tone, headline, detail, statusText } = readiness.value
  if (tone === 'success') return ''
  if (headline && headline !== statusText) return headline
  return detail || ''
})

const troubleshootingLine = computed(() => {
  const { troubleshooting, detail } = readiness.value
  if (!troubleshooting) return ''
  if (troubleshooting === detail) return ''
  return troubleshooting
})

const materialKindLabel = computed(() => contract.value?.materialKindText || '扫描材料')

const templateReviewLinkText = computed(() => {
  const mode = contract.value?.materialLayoutMode
  if (mode === 'FULL_PAPER') return '试卷核对 →'
  if (mode === 'ANSWER_SHEET') return '答卷页校验 →'
  return '制卷核对 →'
})

const scanMaterialAdvisory = computed(() => contract.value?.scanMaterialAdvisory?.trim() || '')

const scanConfigAdvisory = computed(
  () => workflow.kioskContext.value?.scanConfigOptions?.scanConfigAdvisory?.trim() || '',
)

const calibrationExamKey = computed(() => {
  const id = workflow.examId.value
  if (!id) return ''
  const mode = contract.value?.materialLayoutMode ?? 'unset'
  const pages = contract.value?.pagesPerSheet ?? 0
  return `${CALIBRATION_ACK_PREFIX}${id}:${mode}:${pages}`
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

function openTemplateReview() {
  templateExpanded.value = true
}

function buildFirstScanCalibrationDialog() {
  const mode = contract.value?.materialLayoutMode
  const paperStyle = contract.value?.paperStyleText || '未配置'
  const kind = contract.value?.materialKindText || '扫描材料'
  if (mode === 'FULL_PAPER') {
    return {
      title: '试卷首次扫描核对',
      content:
        `当前考试为整卷作答，纸型 ${paperStyle}。`
        + '首张送纸后请在「扫描中」预览整卷切分与页序是否正常；'
        + '若偏差，请暂停并在 Web 端调整试卷母版后再继续批量扫描。',
      okText: '已了解，开始扫描',
      cancelText: '先查看制卷摘要',
    }
  }
  if (mode === 'ANSWER_SHEET') {
    return {
      title: '答卷页首次扫描核对',
      content:
        `当前考试为独立答卷页，纸型 ${paperStyle}。`
        + '首张送纸后请在「扫描中」预览定位框与考号区是否正常；'
        + '若偏差，请暂停并在 Web 端调整答卷页模板后再继续批量扫描。',
      okText: '已了解，开始扫描',
      cancelText: '先查看制卷摘要',
    }
  }
  return {
    title: '首次扫描核对',
    content:
      `考试制卷形态尚未配置，已按 ${kind} 单面扫描建议参数（纸型 ${paperStyle}）。`
      + '首张送纸后请核对预览是否正常，并在 Web 端补配制卷形态与模板。',
    okText: '已了解，开始扫描',
    cancelText: '先查看制卷摘要',
  }
}

async function confirmCalibrationIfNeeded(): Promise<boolean> {
  if (workflow.scanMode.value !== 'DIRECT') return true
  if (hasCalibrationAck() || !contract.value) return true
  const dialog = buildFirstScanCalibrationDialog()
  const confirmed = await confirmAsync({
    title: dialog.title,
    content: dialog.content,
    okText: dialog.okText,
    cancelText: dialog.cancelText,
  })
  if (confirmed) {
    markCalibrationAck()
    return true
  }
  openTemplateReview()
  return false
}

async function startScan() {
  if (!workflow.canStartScan.value) return
  const ok = await confirmCalibrationIfNeeded()
  if (!ok) return
  await workflow.submitScanJob()
}

function continueActiveBatch() {
  stage.gotoStage('scanning')
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
            <span>应扫页</span>
            <strong>{{ expectedPages ?? '—' }}</strong>
            <small v-if="expectedPagesFormula" class="progress-kpi__sub">{{ expectedPagesFormula }}</small>
          </div>
          <div class="progress-kpi__item">
            <span>已扫页</span>
            <strong>{{ scannedPages ?? '—' }}</strong>
          </div>
          <div class="progress-kpi__item" :class="{ 'progress-kpi__item--warn': (attentionCount ?? 0) > 0 }">
            <span>异常</span>
            <strong>{{ attentionCount ?? '—' }}</strong>
          </div>
        </div>

        <div v-if="expectedPages != null && expectedPages > 0" class="progress-bar-wrap">
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: `${progressPercent}%` }" />
          </div>
          <span class="progress-bar__pct">{{ progressPercent }}%</span>
        </div>

        <p v-if="contract?.plannedStudentCount != null" class="sidebar__hint">
          计划人数 {{ contract.plannedStudentCount }}；可多次送纸或一次送完，多工位可并行扫描
        </p>

        <details v-if="contract" class="template-fold" :open="templateExpanded">
          <summary @click.prevent="templateExpanded = !templateExpanded">制卷摘要 · {{ materialKindLabel }}</summary>
          <dl class="template-fold__body">
            <div v-if="contract.schoolName">
              <dt>学校</dt>
              <dd>{{ contract.schoolName }}</dd>
            </div>
            <div>
              <dt>制卷形态</dt>
              <dd>{{ contract.materialLayoutModeText || '未配置' }}</dd>
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
          <button type="button" class="template-fold__link" @click="openTemplateReview">{{ templateReviewLinkText }}</button>
        </details>

        <KioskSessionBatchPanel variant="setup" class="sidebar__batches" />
      </aside>

      <div class="main">
        <div class="scan-control" :class="`scan-control--${readiness.tone}`">
          <div class="scan-control__status">
            <span class="status-led" :class="`status-led--${readiness.tone}`" />
            <div class="scan-control__copy">
              <p class="scan-control__headline">{{ readiness.statusText }}</p>
              <div
                v-if="readiness.tone === 'success' && scanProfileReady"
                class="scan-profile"
                aria-label="当前扫描配置"
              >
                <span class="scan-profile__mode" :class="`scan-profile__mode--${scanModeTone}`">
                  {{ scanModeLabel }}
                </span>
                <span
                  v-for="item in hardwareParamItems"
                  :key="item"
                  class="scan-profile__chip"
                >
                  {{ item }}
                </span>
              </div>
              <p
                v-else-if="readiness.tone === 'success'"
                class="scan-control__sub"
              >
                参数未加载，请打开扫描参数
              </p>
              <p v-else-if="statusDetailLine" class="scan-control__sub">{{ statusDetailLine }}</p>
            </div>
          </div>
          <div class="scan-control__actions">
            <button type="button" class="icon-btn" title="刷新设备状态" @click="refreshDevice">
              <ReloadOutlined :spin="workflow.loading.value" />
            </button>
            <button type="button" class="param-btn" @click="openParams">
              <SettingOutlined />
              <span>扫描参数</span>
            </button>
            <button
              v-if="hasActiveScanSession"
              type="button"
              class="continue-btn"
              title="返回当前未结束批次，使用底部暂停或结束本批次"
              @click="continueActiveBatch"
            >
              继续本批次
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

        <p class="scan-control__guide">
          扫描开始后，请用底部「暂停」或「结束本批次」手动控制；结束本批次后可再次开始新批次送纸。
        </p>

        <div v-if="troubleshootingLine" class="scan-control__trouble">
          <p>{{ troubleshootingLine }}</p>
        </div>
        <div v-if="scanMaterialAdvisory || scanConfigAdvisory" class="scan-control__advisory">
          <p v-if="scanMaterialAdvisory">{{ scanMaterialAdvisory }}</p>
          <p v-if="scanConfigAdvisory">{{ scanConfigAdvisory }}</p>
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

.progress-kpi__sub {
  font-size: 10px;
  color: var(--kiosk-ink-tertiary);
  line-height: 1.2;
  white-space: nowrap;
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
  gap: var(--kiosk-space-3);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
}

.scan-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-4);
  padding: var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
}

.scan-control--success {
  border-left: 4px solid var(--kiosk-success);
}

.scan-control--warning {
  border-left: 4px solid var(--kiosk-warning);
  background: var(--kiosk-warning-soft);
}

.scan-control--danger {
  border-left: 4px solid var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
}

.scan-control__status {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  min-width: 0;
  flex: 1;
}

.scan-control__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.scan-control__headline {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  line-height: var(--kiosk-lh-tight);
}

.scan-profile {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--kiosk-space-2);
}

.scan-profile__mode {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-semibold);
  line-height: 1;
}

.scan-profile__mode--direct {
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
}

.scan-profile__mode--supplement {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
}

.scan-profile__mode--archive {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.scan-profile__chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.scan-control__sub {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-control__actions {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  flex-shrink: 0;
}

.scan-control__trouble {
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
}

.scan-control__trouble p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-control__advisory {
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-warning-soft);
  border: 1px solid var(--kiosk-warning);
}

.scan-control__advisory p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-control__advisory p + p {
  margin-top: var(--kiosk-space-2);
}

.scan-control__guide {
  margin: var(--kiosk-space-3) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  line-height: var(--kiosk-lh-base);
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

.icon-btn {
  width: var(--kiosk-h-icon-button);
  height: var(--kiosk-h-icon-button);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  cursor: pointer;
  flex: 0 0 auto;
}

.param-btn,
.continue-btn,
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

.continue-btn {
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-primary);
  color: var(--kiosk-primary);
  font-size: var(--kiosk-fz-label);
}

.param-btn {
  height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-label);
}

.start-btn {
  height: var(--kiosk-h-cta);
  min-width: 200px;
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

@media (max-width: 1200px) {
  .scan-control {
    flex-direction: column;
    align-items: stretch;
  }

  .scan-control__actions {
    justify-content: flex-end;
  }
}

@media (max-width: 1024px) {
  .workbench__grid {
    grid-template-columns: 1fr;
  }
}
</style>
