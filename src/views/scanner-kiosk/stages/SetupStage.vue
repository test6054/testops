<script setup lang="ts">
/**
 * 讯飞式扫描工作台：设备状态 + 双 CTA（首次扫描/补扫）+ 只读参数信息带。
 */
import {
  ArrowRightOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  RetweetOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ExamMaterialLayoutModeCode } from '@/types/enums/exam-material-layout-mode-enum'
import { ScannerKioskBlockReasonCode } from '@/types/enums/scanner-kiosk-block-reason-enum'
import { ScannerKioskResumeActionCode } from '@/types/enums/scanner-kiosk-resume-action-enum'
import { formatExamSubMeta, formatExamTimeRange } from '@/utils/exam-display-meta'
import KioskScanProfilePanel from '../components/KioskScanProfilePanel.vue'
import KioskSessionBatchPanel from '../components/KioskSessionBatchPanel.vue'
import KioskSupplementLaunchModal from '../components/KioskSupplementLaunchModal.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const CALIBRATION_ACK_PREFIX = 'kiosk-sheet-calibration-ack:'

const { workflow, mutex, stage } = useKioskCtx()
const router = useRouter()

const contract = computed(() => workflow.kioskContext.value?.taskContract)
const exam = computed(() => workflow.kioskContext.value?.exam)
const readiness = computed(() => workflow.deviceReadiness.value)
const directStartReason = computed(() => mutex.reasonOf('startDirectScan'))
const supplementOpenReason = computed(() => mutex.reasonOf('openSupplementLaunch'))

const templateExpanded = ref(false)
const supplementModalOpen = ref(false)

const breadcrumb = computed(() => {
  const name
    = exam.value?.examName
      || (workflow.examId.value ? `考试 ${workflow.examId.value}` : '')
      || '未绑定考试'
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

const statusDetailLine = computed(() => {
  const { tone, detail, headline, statusText } = readiness.value
  if (tone === 'success') return ''
  if (detail) return detail
  if (headline && headline !== statusText) return headline
  return ''
})

const troubleshootingLine = computed(() => {
  const { troubleshooting, detail } = readiness.value
  if (!troubleshooting) return ''
  if (troubleshooting === detail) return ''
  return troubleshooting
})

const materialKindLabel = computed(() => workflow.materialKindLabel.value)

const templateReviewLinkText = computed(() => {
  const mode = contract.value?.materialLayoutMode
  if (mode === ExamMaterialLayoutModeCode.FULL_PAPER) return '试卷核对 →'
  if (mode === ExamMaterialLayoutModeCode.ANSWER_SHEET) return '答卷页校验 →'
  return '制卷核对 →'
})

const prepHardBlockingReasons = computed(
  () => workflow.kioskContext.value?.prepHardBlockingReasons ?? [],
)
const prepAdvisoryReasons = computed(() => workflow.kioskContext.value?.prepAdvisoryReasons ?? [])
const declaredClassChips = computed(() => workflow.declaredClassChips.value)
const examSubMeta = computed(() =>
  formatExamSubMeta(exam.value?.examNo, exam.value?.departmentName),
)
const examTimeRange = computed(() =>
  formatExamTimeRange(exam.value?.examStartTime, exam.value?.examEndTime),
)
const activeSessionReason = computed(
  () => workflow.kioskContext.value?.activeScanSessionReason?.trim() || '',
)
const resumeAction = computed(() => workflow.kioskContext.value?.resumeAction ?? null)
const pageRegisterPending = computed(
  () => workflow.kioskContext.value?.pageRegisterPending === true,
)
const latestBatchRegisterState = computed(
  () => workflow.kioskContext.value?.latestBatch?.pageRegisterState ?? null,
)
const showRegisterStateSkeleton = computed(
  () => workflow.kioskContext.value?.latestBatch != null && latestBatchRegisterState.value === null,
)
const blockReasonCode = computed(() => workflow.kioskContext.value?.blockReasonCode ?? null)
const latestBatchPageCount = computed(
  () => workflow.kioskContext.value?.latestBatch?.pageCount ?? 0,
)
const scanDerivedTemplateActive = computed(() => contract.value?.scanDerivedTemplateActive === true)
const primaryCtaDisabled = computed(
  () =>
    showRegisterStateSkeleton.value
    || (resumeAction.value === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER
      && (!workflow.canRetryPageRegister.value || workflow.pageRegisterRetryLoading.value))
    || (resumeAction.value !== ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER
      && resumeAction.value !== ScannerKioskResumeActionCode.RESUME_SCANNING
      && resumeAction.value !== ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION
      && !workflow.canStartDirectScan.value),
)
const scanStats = computed(() => workflow.kioskMetrics.value)

function openLayoutDesigner() {
  const id = workflow.examId.value
  if (!id) return
  const target = router.resolve({
    name: 'TeacherExamWorkspaceLayoutDesigner',
    params: { examId: id },
  })
  window.open(target.href, '_blank')
}

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

function openTemplateReview() {
  templateExpanded.value = true
}

function buildFirstScanCalibrationDialog() {
  const mode = contract.value?.materialLayoutMode
  const paperStyle = contract.value?.paperStyleText || '未配置'
  if (mode === ExamMaterialLayoutModeCode.FULL_PAPER) {
    return {
      title: '试卷首次扫描核对',
      content:
        `当前考试为整卷作答，纸型 ${paperStyle}。`
        + '首张送纸后请在「扫描中」预览整卷切分与页序是否正常；'
        + '若偏差，请暂停并在 Web 端调整制卷设计后再继续批量扫描。',
      okText: '已了解，开始扫描',
      cancelText: '先查看制卷摘要',
    }
  }
  if (mode === ExamMaterialLayoutModeCode.ANSWER_SHEET) {
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
    content: `纸型 ${paperStyle}。首张送纸后请在「扫描中」预览页序与识别是否正常。`,
    okText: '已了解，开始扫描',
    cancelText: '先查看制卷摘要',
  }
}

async function confirmCalibrationIfNeeded(): Promise<boolean> {
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

async function startDirectScan() {
  if (!workflow.canStartDirectScan.value) return
  const ok = await confirmCalibrationIfNeeded()
  if (!ok) return
  const started = await workflow.startDirectScan()
  if (started) {
    stage.gotoStage('scanning')
  }
}

async function openSupplementModal() {
  if (!mutex.canDo('openSupplementLaunch')) return
  supplementModalOpen.value = true
}

function continueActiveBatch() {
  void workflow.ensureScanningWorkspaceReady().then((ready) => {
    if (ready) {
      stage.gotoStage('scanning')
    }
  })
}

onMounted(() => {
  void workflow.ensureScannerInventoryReady()
})
</script>

<template>
  <section class="workbench">
    <header class="workbench__crumb">
      <span>当前位置：{{ breadcrumb }} &gt; 扫描答卷</span>
    </header>

    <div class="workbench__grid">
      <aside class="sidebar">
        <h2 class="sidebar__title">{{ exam?.examName || '—' }}</h2>
        <p v-if="exam?.courseName" class="sidebar__sub">{{ exam.courseName }}</p>
        <p v-if="examSubMeta" class="sidebar__sub sidebar__sub--mono">{{ examSubMeta }}</p>
        <p v-if="examTimeRange" class="sidebar__hint">考试时间 {{ examTimeRange }}</p>
        <p v-if="exam?.statusMessage" class="sidebar__hint">考试状态 {{ exam.statusMessage }}</p>

        <div v-if="declaredClassChips.length" class="class-chips">
          <span
            v-for="chip in declaredClassChips"
            :key="chip.key"
            class="class-chip"
            :class="{ 'class-chip--missing': chip.missing }"
          >{{ chip.label }}</span>
        </div>
        <p v-else-if="contract?.gradeSubjectText" class="sidebar__sub">
          {{ contract.gradeSubjectText }}
        </p>

        <div class="progress-kpi progress-kpi--wide">
          <div class="progress-kpi__item">
            <span>应扫页</span>
            <strong>{{ expectedPages ?? '—' }}</strong>
            <small v-if="expectedPagesFormula" class="progress-kpi__sub">{{
              expectedPagesFormula
            }}</small>
          </div>
          <div class="progress-kpi__item">
            <span>已扫页</span>
            <strong>{{ scannedPages ?? '—' }}</strong>
          </div>
          <div
            class="progress-kpi__item"
            :class="{ 'progress-kpi__item--warn': (attentionCount ?? 0) > 0 }"
          >
            <span>异常</span>
            <strong>{{ attentionCount ?? '—' }}</strong>
          </div>
          <div class="progress-kpi__item">
            <span>已绑定卷</span>
            <strong>{{ scanStats.boundPaperInstances }}</strong>
          </div>
          <div class="progress-kpi__item">
            <span>本机批次</span>
            <strong>{{ scanStats.scanBatchCount }}</strong>
          </div>
        </div>

        <div v-if="expectedPages != null && expectedPages > 0" class="progress-bar-wrap">
          <div class="progress-bar">
            <div
              class="progress-bar__fill"
              :style="{ transform: `scaleX(${Math.max(0, Math.min(progressPercent, 100)) / 100})` }"
            />
          </div>
          <span class="progress-bar__pct">{{ progressPercent }}%</span>
        </div>

        <p v-if="contract?.plannedStudentCount != null" class="sidebar__hint">
          计划人数 {{ contract.plannedStudentCount }}；可多次送纸或一次送完，多工位可并行扫描
        </p>

        <details v-if="contract" class="template-fold" :open="templateExpanded">
          <summary @click.prevent="templateExpanded = !templateExpanded">
            制卷摘要 · {{ materialKindLabel }}
          </summary>
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
              <dd>
                {{ contract.templateDisplayName }}
                <span v-if="scanDerivedTemplateActive" class="template-fold__derived-tag">扫描推导</span>
              </dd>
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
              <dd>
                客观 {{ contract.objectiveQuestionCount }} · 主观
                {{ contract.subjectiveQuestionCount }}
              </dd>
            </div>
          </dl>
          <button type="button" class="template-fold__link" @click="openTemplateReview">
            {{ templateReviewLinkText }}
          </button>
        </details>

        <KioskSessionBatchPanel variant="setup" class="sidebar__batches" />
      </aside>

      <div class="main">
        <div class="scan-control" :class="`scan-control--${readiness.tone}`">
          <div class="scan-control__status">
            <span class="status-led" :class="`status-led--${readiness.tone}`" />
            <div class="scan-control__copy">
              <p class="scan-control__headline">{{ readiness.statusText }}</p>
              <p v-if="statusDetailLine" class="scan-control__sub">{{ statusDetailLine }}</p>
            </div>
          </div>
          <button type="button" class="icon-btn" title="刷新设备状态" @click="refreshDevice">
            <ReloadOutlined :spin="workflow.isDeviceRefreshing.value" />
          </button>
        </div>

        <div v-if="showRegisterStateSkeleton" class="setup-signal setup-signal--skeleton">
          <a-skeleton-button active block size="large" />
          <a-skeleton-input active block size="small" style="margin-top: 8px" />
          <p class="setup-signal__hint">登记状态计算中…</p>
        </div>
        <UiAlertStrip
          v-else-if="blockReasonCode === ScannerKioskBlockReasonCode.E_KOS_004"
          tone="info"
          dense
          :closable="false"
          title="答题卡模式尚未完成制卷"
          description="请先在 Web 端完成答卷页 layout 设计后再开始扫描。"
          class="setup-signal"
        >
          <template #actions>
            <button type="button" class="setup-signal__link" @click="openLayoutDesigner">
              去制卷 →
            </button>
          </template>
        </UiAlertStrip>
        <UiAlertStrip
          v-else-if="resumeAction === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER"
          tone="warning"
          dense
          :closable="false"
          title="页登记待重试"
          :description="`本批 ${latestBatchPageCount} 页已提交，登记遇阻。已自动推导模板，点击重试即刻落库。`"
          class="setup-signal setup-signal--warning"
        />
        <UiAlertStrip
          v-else-if="resumeAction === ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION"
          tone="error"
          dense
          :closable="false"
          title="页登记不可恢复"
          :description="
            workflow.kioskContext.value?.pageRegisterDiagnostic
              || '文件不可读或批次已封存 (BLOCKED)，请联系管理员。'
          "
          class="setup-signal setup-signal--fatal"
        >
          <template #meta>
            <span class="setup-signal__pulse" aria-hidden="true" />
          </template>
        </UiAlertStrip>
        <UiAlertStrip
          v-else-if="pageRegisterPending"
          tone="warning"
          dense
          :closable="false"
          title="上一批次页登记待重试"
          :description="
            workflow.kioskContext.value?.pageRegisterDiagnostic || '请先完成登记后再开新扫'
          "
          class="setup-signal"
        />

        <div class="scan-cta-row">
          <template v-if="showRegisterStateSkeleton">
            <a-skeleton-button active block size="large" class="scan-cta-skeleton" />
            <button
              type="button"
              class="scan-cta scan-cta--supplement"
              :disabled="!mutex.canDo('openSupplementLaunch')"
              :title="supplementOpenReason || '补扫'"
              @click="openSupplementModal"
            >
              <RetweetOutlined />
              <span>补扫</span>
            </button>
          </template>
          <template v-else>
            <button
              v-if="resumeAction === ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER"
              type="button"
              class="scan-cta scan-cta--direct scan-cta--warning"
              :disabled="primaryCtaDisabled"
              :title="mutex.reasonOf('retryPageRegister') || '重试页登记'"
              @click="workflow.retryPageRegister()"
            >
              <ReloadOutlined :spin="workflow.pageRegisterRetryLoading.value" />
              <span>重试页登记</span>
            </button>
            <button
              v-else-if="resumeAction === ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION"
              type="button"
              class="scan-cta scan-cta--direct scan-cta--fatal"
              disabled
              :title="workflow.kioskContext.value?.pageRegisterDiagnostic || '登记不可恢复'"
            >
              <StopOutlined />
              <span>查看登记异常</span>
            </button>
            <button
              v-else-if="resumeAction === ScannerKioskResumeActionCode.RESUME_SCANNING"
              type="button"
              class="scan-cta scan-cta--direct"
              :title="activeSessionReason || '继续扫描'"
              @click="continueActiveBatch"
            >
              <ArrowRightOutlined />
              <span>继续扫描</span>
            </button>
            <button
              v-else
              type="button"
              class="scan-cta scan-cta--direct"
              :disabled="primaryCtaDisabled"
              :title="directStartReason || '首次扫描'"
              @click="startDirectScan"
            >
              <PlayCircleFilled />
              <span>首次扫描</span>
            </button>
            <button
              type="button"
              class="scan-cta scan-cta--supplement"
              :disabled="!mutex.canDo('openSupplementLaunch')"
              :title="supplementOpenReason || '补扫'"
              @click="openSupplementModal"
            >
              <RetweetOutlined />
              <span>补扫</span>
            </button>
          </template>
        </div>

        <p
          v-if="
            !showRegisterStateSkeleton
              && !resumeAction
              && workflow.canStartDirectScan.value
              && contract?.firstScanTemplateHint
          "
          class="scan-control__guide scan-control__guide--first-scan"
        >
          {{ contract.firstScanTemplateHint }}
        </p>

        <button
          v-if="hasActiveScanSession"
          type="button"
          class="continue-btn"
          :title="activeSessionReason || '返回当前未结束批次'"
          @click="continueActiveBatch"
        >
          继续本批次
        </button>
        <p v-if="hasActiveScanSession && activeSessionReason" class="scan-control__guide">
          {{ activeSessionReason }}
        </p>

        <p class="scan-control__guide">
          扫描开始后，请用底部「暂停」或「结束本批次」手动控制；结束本批次后可再次开始新批次送纸。
        </p>

        <KioskScanProfilePanel />

        <div v-if="troubleshootingLine" class="scan-control__trouble">
          <p>{{ troubleshootingLine }}</p>
        </div>
        <div v-if="prepAdvisoryReasons.length" class="scan-control__advisory">
          <p v-for="reason in prepAdvisoryReasons" :key="reason">{{ reason }}</p>
        </div>
        <div v-if="prepHardBlockingReasons.length" class="scan-control__hard-block">
          <p v-for="reason in prepHardBlockingReasons" :key="reason">{{ reason }}</p>
        </div>
      </div>
    </div>

    <KioskSupplementLaunchModal v-model:open="supplementModalOpen" />
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
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

.progress-kpi--wide {
  grid-template-columns: repeat(3, 1fr);
}

.class-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-2);
}

.class-chip {
  padding: 2px var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-neutral-soft);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.class-chip--missing {
  border: 1px dashed var(--kiosk-divider);
  color: var(--kiosk-ink-tertiary);
}

.sidebar__sub--mono {
  font-family: var(--kiosk-font-mono);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
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
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--kiosk-primary);
  border-radius: var(--kiosk-radius-pill);
  transition: transform var(--kiosk-dur-base) var(--kiosk-easing);
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
  min-height: var(--kiosk-h-icon-button);
  display: flex;
  align-items: center;
  padding: var(--kiosk-space-1) 0;
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
  border-color: var(--kiosk-success);
  background: color-mix(in srgb, var(--kiosk-success) 12%, var(--kiosk-surface-alt));
}

.scan-control--warning {
  border-color: var(--kiosk-warning);
  background: var(--kiosk-warning-soft);
}

.scan-control--danger {
  border-color: var(--kiosk-danger);
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

.scan-control__sub {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.scan-cta-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kiosk-space-4);
}

.scan-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-3);
  min-height: var(--kiosk-h-cta);
  padding: 0 var(--kiosk-space-5);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.scan-cta--direct {
  background: var(--kiosk-primary);
  border: none;
  color: var(--ant-color-white);
}

.scan-cta--warning {
  background: var(--kiosk-warning);
  border: none;
  color: var(--ant-color-white);
}

.scan-cta--fatal {
  background: var(--kiosk-danger);
  border: none;
  color: var(--ant-color-white);
}

.scan-cta--supplement {
  background: var(--kiosk-surface);
  border: 2px solid var(--kiosk-warning);
  color: var(--kiosk-warning);
}

.scan-cta:disabled {
  background: var(--kiosk-neutral-soft);
  border-color: var(--kiosk-divider);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
}

.continue-btn {
  align-self: flex-start;
  min-height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-primary);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-primary);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
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

.scan-control__hard-block {
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-danger-soft);
  border: 1px solid var(--kiosk-danger);
}

.scan-control__hard-block p {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-danger);
  line-height: var(--kiosk-lh-base);
}

.scan-control__hard-block p + p {
  margin-top: var(--kiosk-space-2);
}

.scan-control__guide--first-scan {
  color: var(--kiosk-ink-tertiary);
  margin-top: -4px;
}

.setup-signal--warning :deep(.ui-alert-strip) {
  background: var(--ant-color-warning-bg);
  border-color: var(--ant-color-warning-border);
}

.setup-signal--fatal :deep(.ui-alert-strip) {
  background: var(--ant-color-error-bg);
  border-color: var(--ant-color-error-border);
}

.setup-signal {
  margin-bottom: var(--kiosk-space-2);
}

.setup-signal--skeleton {
  padding: var(--kiosk-space-3);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
}

.setup-signal__hint {
  margin: var(--kiosk-space-2) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.setup-signal__link {
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-primary);
  cursor: pointer;
}

.setup-signal__pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--kiosk-danger);
  animation: setup-signal-pulse 300ms ease-in-out infinite;
}

@keyframes setup-signal-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.template-fold__derived-tag {
  margin-left: var(--kiosk-space-2);
  padding: 0 var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary-active);
  font-size: 10px;
}

.scan-cta-skeleton {
  min-height: var(--kiosk-h-cta);
}

.scan-control__guide {
  margin: 0;
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

@media (max-width: bp.$shell-tablet-max) {
  .workbench__grid {
    grid-template-columns: 1fr;
  }

  .scan-cta-row {
    grid-template-columns: 1fr;
  }
}
</style>
