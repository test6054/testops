<script setup lang="ts">
/**
 * Stage 2 - 扫描中
 *
 * 顶部 status ribbon + 大画布预览 + 右侧缩略图 strip + 浮动工具栏。
 * 操作类按钮（暂停/继续/结束/重试）由 KioskLayout 的 BottomBar 处理。
 */
import {
  ArrowLeftOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  ExpandOutlined,
  FilterFilled,
  FilterOutlined,
  MinusOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  ScanOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UndoOutlined,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  KioskSyntheticScanPageStatusCode,
  KioskSyntheticScanPageStatusDescription,
  LocalScanJobStatusCode,
  LocalScanPageStatusCode,
  LocalScanPageStatusDescription,
} from '@/apis/mark/scanner-agent-local'
import { strictEnumLabel } from '@/utils/strict-enum'
import KioskBoundStudentsPanel from '../components/KioskBoundStudentsPanel.vue'
import KioskScanExceptionPanel from '../components/KioskScanExceptionPanel.vue'
import KioskScanSessionStrip from '../components/KioskScanSessionStrip.vue'
import KioskSessionBatchPanel from '../components/KioskSessionBatchPanel.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, stage } = useKioskCtx()

const hasJob = computed(() => Boolean(workflow.currentJob.value))
const job = computed(() => workflow.currentJob.value)
const pages = computed(() => workflow.displayPages.value)
const canvasEmptyTitle = computed(() => {
  if (workflow.isWaitingForPaperFeed.value) {
    return '等待扫描仪放纸…'
  }
  if (job.value?.status === LocalScanJobStatusCode.SCANNING) {
    return job.value.scannedPages > 0
      ? `正在扫描（${job.value.scannedPages} 页）…`
      : '正在连接扫描仪…'
  }
  if (
    job.value?.status === LocalScanJobStatusCode.UPLOADING
    || job.value?.status === LocalScanJobStatusCode.RETRYING
  ) {
    return '扫描页上传中…'
  }
  if (job.value?.status === LocalScanJobStatusCode.FAILED) {
    return '扫描失败'
  }
  return '等待扫描仪送纸…'
})
const canvasEmptyHint = computed(() => {
  if (workflow.isWaitingForPaperFeed.value) {
    return '请将试卷放入进纸器（ADF），放纸后系统会自动开始扫描，无需再次点击开始。'
  }
  if (job.value?.status === LocalScanJobStatusCode.SCANNING) {
    return '扫描仪正在采集影像，首张完成后将自动显示预览。'
  }
  if (
    job.value?.status === LocalScanJobStatusCode.UPLOADING
    || job.value?.status === LocalScanJobStatusCode.RETRYING
  ) {
    return job.value.message || '上传完成后可在右侧缩略图查看各页。'
  }
  if (job.value?.status === LocalScanJobStatusCode.FAILED) {
    if (workflow.isPreUploadScanFailure.value) {
      return '扫描未采集到页面，请点击底部「取消并清理」后重新开始'
    }
    return job.value.message || '请检查扫描仪连接与进纸器状态后重试。'
  }
  return '送纸后将自动显示首张影像，请勿关闭工作台。'
})
const emptyScanTitle = computed(() =>
  workflow.activeBackendScanSession.value ? '存在未结束扫描进程' : '暂无扫描批次',
)
const emptyScanHint = computed(() =>
  workflow.activeBackendScanSession.value
    ? workflow.activeBackendScanSessionReason.value
    : '请返回“准备扫描”点击“开始扫描”，单纯放纸不会自动创建扫描任务。',
)
const previewPageNo = computed({
  get: () => workflow.previewPageNo.value,
  set: (v: number) => {
    workflow.previewPageNo.value = v
  },
})
const effectiveEmptyScanHint = computed(() => {
  if (workflow.scanWorkspaceBootstrapping.value) {
    return '正在恢复本机扫描批次与扫描任务，请稍候…'
  }
  if (workflow.activeBackendScanSession.value) {
    return (
      workflow.activeBackendScanSessionReason.value || '扫描进程仍在恢复中，请先刷新当前扫描状态。'
    )
  }
  return '本机尚未建立扫描任务。请返回「准备扫描」点击「开始扫描」，或点击下方「重新开始扫描」自动创建批次。'
})
const hasRecoverableBackendSession = computed(() => workflow.activeBackendScanSession.value)

// 视图状态：缩放 / 旋转 / 灰度（不进 workflow，仅 stage 内部）
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25
const zoomLevel = ref(1)
const rotation = ref<0 | 90 | 180 | 270>(0)
const grayscale = ref(false)
const exceptionPanelOpen = ref(false)

const zoomPercent = computed(() => `${Math.round(zoomLevel.value * 100)}%`)
const imageTransform = computed(
  () => `translate(-50%, -50%) scale(${zoomLevel.value}) rotate(${rotation.value}deg)`,
)
const imageFilter = computed(() => (grayscale.value ? 'grayscale(1)' : 'none'))

const isPageException = (page: { status: string, diagnostic?: string }) =>
  page.status === LocalScanPageStatusCode.FAILED || Boolean(page.diagnostic)

const currentIndex = computed(() => {
  if (!previewPageNo.value) return -1
  return pages.value.findIndex((p) => p.pageNo === previewPageNo.value)
})
const currentPreviewPage = computed(() => pages.value.find((p) => p.pageNo === previewPageNo.value))
const currentPreviewTitle = computed(() =>
  currentPreviewPage.value ? workflow.scanPageDisplayTitle(currentPreviewPage.value) : '',
)

const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(
  () => currentIndex.value >= 0 && currentIndex.value < pages.value.length - 1,
)

function syncExceptionPanel(pageNo: number) {
  if (!pageNo) {
    exceptionPanelOpen.value = false
    return
  }
  const page = pages.value.find((p) => p.pageNo === pageNo)
  exceptionPanelOpen.value = Boolean(page && isPageException(page))
}

function gotoPage(pageNo: number) {
  previewPageNo.value = pageNo
  syncExceptionPanel(pageNo)
}
function gotoPrev() {
  if (canPrev.value) gotoPage(pages.value[currentIndex.value - 1].pageNo)
}
function gotoNext() {
  if (canNext.value) gotoPage(pages.value[currentIndex.value + 1].pageNo)
}
function gotoFirst() {
  if (pages.value.length) gotoPage(pages.value[0].pageNo)
}
function gotoLast() {
  if (pages.value.length) gotoPage(pages.value[pages.value.length - 1].pageNo)
}

function openFirstException() {
  const first = workflow.exceptionPages.value[0]
  if (first) gotoPage(first.pageNo)
}

function goBackToSetup() {
  stage.gotoStage('setup')
}

async function refreshScanningState() {
  await workflow.refreshAll()
}

async function restartScanFromEmptyState() {
  if (!workflow.canStartDirectScan.value || workflow.loading.value) return
  const started = await workflow.startDirectScan()
  if (!started && !workflow.currentJob.value) {
    await workflow.ensureScanningWorkspaceReady()
  }
}

function clampZoom(v: number) {
  return Math.min(Math.max(Math.round(v * 100) / 100, ZOOM_MIN), ZOOM_MAX)
}
function zoomIn() {
  zoomLevel.value = clampZoom(zoomLevel.value + ZOOM_STEP)
}
function zoomOut() {
  zoomLevel.value = clampZoom(zoomLevel.value - ZOOM_STEP)
}
function fitToScreen() {
  zoomLevel.value = 1
}
function resetView() {
  zoomLevel.value = 1
  rotation.value = 0
  grayscale.value = false
}
function resolveRotateRight(value: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  switch (value) {
    case 0:
      return 90
    case 90:
      return 180
    case 180:
      return 270
    case 270:
      return 0
  }
}
function resolveRotateLeft(value: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  switch (value) {
    case 0:
      return 270
    case 90:
      return 0
    case 180:
      return 90
    case 270:
      return 180
  }
}
function rotateRight() {
  rotation.value = resolveRotateRight(rotation.value)
}
function rotateLeft() {
  rotation.value = resolveRotateLeft(rotation.value)
}
function toggleGrayscale() {
  grayscale.value = !grayscale.value
}

// 切页时重置视图状态：避免上一页放大状态影响下一页观感
watch(previewPageNo, (pageNo) => {
  syncExceptionPanel(pageNo)
  zoomLevel.value = 1
  rotation.value = 0
  // grayscale 不重置，作为持久偏好（教师可能持续灰度核对）
})

// 自动跟随：扫描中页数变化时，若 currentIndex 已是末页则自动前进
watch(
  () => pages.value.length,
  (next, prev) => {
    if (!next || next <= (prev ?? 0)) return
    const last = pages.value[pages.value.length - 1]
    if (currentIndex.value === (prev ?? 0) - 1 || previewPageNo.value === 0) {
      gotoPage(last.pageNo)
    }
  },
)

const stateClass = computed(() => `state-${workflow.workState.value.tone}`)

const stageMainStyle = computed(() => {
  if (!hasJob.value) return { gridTemplateColumns: 'minmax(0, 1fr)' }
  if (exceptionPanelOpen.value) {
    return { gridTemplateColumns: 'minmax(0, 1fr) 280px' }
  }
  return { gridTemplateColumns: 'minmax(0, 1fr) 168px' }
})

function pageStatusLabel(status: string): string {
  if (status === KioskSyntheticScanPageStatusCode.SCANNED) {
    return strictEnumLabel(
      KioskSyntheticScanPageStatusDescription,
      KioskSyntheticScanPageStatusCode.SCANNED,
      '扫描页状态',
    )
  }
  switch (status) {
    case LocalScanPageStatusCode.CAPTURED:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.CAPTURED,
        '扫描页状态',
      )
    case LocalScanPageStatusCode.PREPROCESSED:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.PREPROCESSED,
        '扫描页状态',
      )
    case LocalScanPageStatusCode.UPLOADING:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.UPLOADING,
        '扫描页状态',
      )
    case LocalScanPageStatusCode.UPLOADED:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.UPLOADED,
        '扫描页状态',
      )
    case LocalScanPageStatusCode.FAILED:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.FAILED,
        '扫描页状态',
      )
    case LocalScanPageStatusCode.DELETED:
      return strictEnumLabel(
        LocalScanPageStatusDescription,
        LocalScanPageStatusCode.DELETED,
        '扫描页状态',
      )
  }
  throw new Error(`扫描页状态缺少展示映射：${status}`)
}

onMounted(() => {
  void workflow.ensureScanningWorkspaceReady()
})
</script>

<template>
  <section class="scanning-stage">
    <KioskScanSessionStrip />

    <!-- 顶部 status ribbon -->
    <header class="ribbon">
      <div class="ribbon-state">
        <span class="state-dot" :class="stateClass" />
        <div class="state-text">
          <strong>{{ workflow.workState.value.text }}</strong>
          <small>{{ workflow.uploadStage.value }}</small>
        </div>
      </div>
      <div v-if="hasJob" class="ribbon-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              transform: `scaleX(${Math.max(0, Math.min(1, workflow.scanProgress.value / 100))})`,
            }"
          />
        </div>
        <span class="progress-pct">{{ workflow.scanProgress.value }}%</span>
      </div>
      <div v-if="hasJob" class="ribbon-counters">
        <div>
          <span>已扫描</span>
          <strong>{{ workflow.displayScannedCount.value }}</strong>
        </div>
        <div>
          <span>已上传</span>
          <strong>{{ workflow.displayUploadedCount.value }}</strong>
        </div>
        <div v-if="workflow.exceptionPages.value.length > 0" class="counter-warn">
          <span>异常</span>
          <strong>{{ workflow.exceptionPages.value.length }}</strong>
        </div>
      </div>
      <div v-if="workflow.exceptionPages.value.length > 0" class="ribbon-fix">
        <button type="button" class="ribbon-fix-btn" @click="openFirstException">
          修正异常 ({{ workflow.exceptionPages.value.length }})
        </button>
      </div>
      <div v-if="job?.status === LocalScanJobStatusCode.PAUSED" class="ribbon-paused">
        <PauseCircleOutlined />
        <span>已暂停</span>
      </div>
    </header>

    <KioskBoundStudentsPanel
      v-if="hasJob && workflow.boundPaperScanBatchId.value"
      variant="panel"
      class="scan-bound-mobile"
      :scan-batch-id="workflow.boundPaperScanBatchId.value"
    />

    <div class="stage-body">
      <aside class="batch-rail">
        <KioskSessionBatchPanel variant="scanning" />
      </aside>

      <div class="stage-main" :style="stageMainStyle">
        <!-- 大画布预览 -->
        <main class="canvas-wrap">
          <div class="canvas">
            <div v-if="!hasJob" class="canvas-empty">
              <ScanOutlined class="canvas-empty-icon" />
              <p>
                {{
                  workflow.scanWorkspaceBootstrapping.value ? '正在准备扫描工作台…' : emptyScanTitle
                }}
              </p>
              <small>{{ effectiveEmptyScanHint }}</small>
              <div v-if="!workflow.scanWorkspaceBootstrapping.value" class="canvas-empty-actions">
                <button
                  v-if="hasRecoverableBackendSession"
                  type="button"
                  class="canvas-empty-btn canvas-empty-btn--primary"
                  :disabled="workflow.loading.value"
                  @click="refreshScanningState"
                >
                  <ReloadOutlined />
                  <span>刷新扫描状态</span>
                </button>
                <template v-else>
                  <button
                    type="button"
                    class="canvas-empty-btn"
                    :disabled="workflow.loading.value"
                    @click="goBackToSetup"
                  >
                    <ArrowLeftOutlined />
                    <span>返回准备扫描</span>
                  </button>
                  <button
                    type="button"
                    class="canvas-empty-btn canvas-empty-btn--primary"
                    :disabled="!workflow.canStartDirectScan.value || workflow.loading.value"
                    @click="restartScanFromEmptyState"
                  >
                    <PlayCircleOutlined />
                    <span>重新开始扫描</span>
                  </button>
                </template>
              </div>
            </div>
            <div v-else-if="pages.length === 0" class="canvas-empty">
              <ScanOutlined class="canvas-empty-icon canvas-empty-icon--pulse" />
              <p>{{ canvasEmptyTitle }}</p>
              <small>{{ canvasEmptyHint }}</small>
            </div>
            <div v-else-if="!previewPageNo || !workflow.previewImageUrl.value" class="canvas-empty">
              <p v-if="workflow.previewLoadError.value">{{ workflow.previewLoadError.value }}</p>
              <p v-else>请在右侧缩略图中选择一页查看</p>
            </div>
            <img
              v-else
              class="canvas-image"
              :src="workflow.previewImageUrl.value"
              :alt="currentPreviewTitle"
              :style="{ transform: imageTransform, filter: imageFilter }"
              draggable="false"
              @error="workflow.onPreviewImageLoadError"
            />

            <!-- 浮动工具栏 -->
            <div v-if="hasJob && pages.length > 0" class="canvas-tools">
              <!-- 翻页组 -->
              <div class="tool-group" role="group" aria-label="翻页">
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="!canPrev"
                  title="第一页 [Home]"
                  @click="gotoFirst"
                >
                  <StepBackwardOutlined />
                </button>
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="!canPrev"
                  title="上一页 [←]"
                  @click="gotoPrev"
                >
                  <CaretLeftOutlined />
                </button>
                <span class="tool-info">
                  <strong>{{ currentPreviewTitle || previewPageNo }}</strong>
                  <small>/ {{ pages.length }}</small>
                </span>
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="!canNext"
                  title="下一页 [→]"
                  @click="gotoNext"
                >
                  <CaretRightOutlined />
                </button>
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="!canNext"
                  title="末页 [End]"
                  @click="gotoLast"
                >
                  <StepForwardOutlined />
                </button>
              </div>

              <span class="tool-divider" />

              <!-- 缩放组 -->
              <div class="tool-group" role="group" aria-label="缩放">
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="zoomLevel <= ZOOM_MIN"
                  title="缩小 [-]"
                  @click="zoomOut"
                >
                  <MinusOutlined />
                </button>
                <span class="tool-info" :title="`实际尺寸 100% · 当前 ${zoomPercent}`">
                  <strong>{{ zoomPercent }}</strong>
                </span>
                <button
                  type="button"
                  class="tool-btn"
                  :disabled="zoomLevel >= ZOOM_MAX"
                  title="放大 [+]"
                  @click="zoomIn"
                >
                  <PlusOutlined />
                </button>
                <button type="button" class="tool-btn" title="适配窗口 [0]" @click="fitToScreen">
                  <ExpandOutlined />
                </button>
              </div>

              <span class="tool-divider" />

              <!-- 旋转组 -->
              <div class="tool-group" role="group" aria-label="旋转">
                <button
                  type="button"
                  class="tool-btn"
                  title="左转 90° [Shift+R]"
                  @click="rotateLeft"
                >
                  <UndoOutlined />
                </button>
                <span class="tool-info">
                  <strong>{{ rotation }}°</strong>
                </span>
                <button type="button" class="tool-btn" title="右转 90° [R]" @click="rotateRight">
                  <RedoOutlined />
                </button>
              </div>

              <span class="tool-divider" />

              <!-- 滤镜组 -->
              <div class="tool-group" role="group" aria-label="滤镜">
                <button
                  type="button"
                  class="tool-btn tool-btn--toggle"
                  :class="{ 'tool-btn--active': grayscale }"
                  title="灰度 [G]"
                  @click="toggleGrayscale"
                >
                  <FilterFilled v-if="grayscale" />
                  <FilterOutlined v-else />
                </button>
              </div>
            </div>
          </div>
        </main>

        <!-- 缩略图 strip（异常修正时由修正面板占用同列） -->
        <aside v-if="hasJob && !exceptionPanelOpen" class="thumbs">
          <div class="thumbs-head">
            <h4>页面 ({{ pages.length }})</h4>
            <span v-if="workflow.exceptionPages.value.length" class="thumbs-warn">
              异常 {{ workflow.exceptionPages.value.length }}
            </span>
          </div>
          <div v-if="pages.length === 0" class="thumbs-empty">扫描后页面将显示在此</div>
          <ul v-else class="thumbs-list">
            <li
              v-for="page in pages"
              :key="page.pageNo"
              class="thumb"
              :class="{
                active: page.pageNo === previewPageNo,
                exception: isPageException(page),
              }"
            >
              <button type="button" @click="gotoPage(page.pageNo)">
                <div class="thumb-no">{{ workflow.scanPageDisplayTitle(page) }}</div>
                <div class="thumb-status">
                  <WarningFilled v-if="isPageException(page)" class="thumb-warn-icon" />
                  <span>{{ pageStatusLabel(page.status) }}</span>
                </div>
              </button>
            </li>
          </ul>
        </aside>

        <KioskScanExceptionPanel
          v-else-if="hasJob && exceptionPanelOpen"
          :open="exceptionPanelOpen"
          :page-no="previewPageNo"
          @close="exceptionPanelOpen = false"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.scanning-stage {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  height: 100%;
  min-height: 0;
}

/* ----------- Status ribbon ----------- */

.ribbon {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-5);
  padding: var(--kiosk-space-3) var(--kiosk-space-5);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  box-shadow: var(--kiosk-shadow-1);
}

.ribbon-state {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  flex: 0 0 auto;
}
.state-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--kiosk-neutral);
  flex: 0 0 auto;
}
.state-dot.state-success {
  background: var(--kiosk-success);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-success-soft);
}
.state-dot.state-running {
  background: var(--kiosk-primary);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-primary-soft);
  animation: ribbon-running 1.6s var(--kiosk-easing) infinite;
}
.state-dot.state-danger {
  background: var(--kiosk-danger);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-danger-soft);
}
.state-dot.state-warning {
  background: var(--kiosk-warning);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-warning-soft);
}
.state-dot.state-muted {
  background: var(--kiosk-neutral);
}
@keyframes ribbon-running {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.state-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.25;
}
.state-text strong {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.state-text small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.ribbon-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  min-width: 0;
}
.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--kiosk-neutral-soft);
  border-radius: var(--kiosk-radius-lg);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: var(--kiosk-primary);
  border-radius: var(--kiosk-radius-lg);
  transition: transform var(--kiosk-dur-base) var(--kiosk-easing);
}
.progress-pct {
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  min-width: 48px;
  text-align: right;
}

.ribbon-counters {
  display: flex;
  gap: var(--kiosk-space-4);
  flex: 0 0 auto;
}
.ribbon-counters > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 56px;
}
.ribbon-counters span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.ribbon-counters strong {
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.counter-warn strong {
  color: var(--kiosk-warning);
}

.ribbon-fix {
  flex: 0 0 auto;
}
.ribbon-fix-btn {
  height: 32px;
  padding: 0 var(--kiosk-space-3);
  border: 1px solid var(--kiosk-warning);
  border-radius: var(--kiosk-radius-lg);
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}
.ribbon-fix-btn:hover {
  background: color-mix(in srgb, var(--kiosk-warning-soft) 70%, var(--kiosk-warning) 30%);
}

.ribbon-paused {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: 0 var(--kiosk-space-3);
  height: 32px;
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
  border-radius: var(--kiosk-radius-lg);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
}

/* ----------- Body grid: canvas + thumb strip ----------- */

.stage-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: var(--kiosk-space-3);
  flex: 1;
  min-height: 0;
}

.batch-rail {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-3);
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.stage-main {
  display: grid;
  gap: var(--kiosk-space-3);
  min-height: 0;
  min-width: 0;
}

.canvas-wrap {
  display: flex;
  min-height: 0;
}

.canvas {
  position: relative;
  flex: 1;
  background: var(--kiosk-canvas);
  border-radius: var(--kiosk-radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--kiosk-shadow-2);
}

/* img 用 absolute + transform 居中，方便 scale/rotate 不影响布局 */
.canvas-image {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: calc(100% - var(--kiosk-space-6) * 2);
  max-height: calc(100% - var(--kiosk-space-6) * 2);
  background: var(--kiosk-surface);
  box-shadow: var(--kiosk-shadow-3);
  user-select: none;
  transform-origin: center center;
  transition:
    transform var(--kiosk-dur-fast) var(--kiosk-easing),
    filter var(--kiosk-dur-fast) var(--kiosk-easing);
}

.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-5);
  color: var(--kiosk-ink-on-canvas);
}
.canvas-empty-icon {
  font-size: 56px;
  color: var(--kiosk-ink-on-canvas-secondary);
  margin-bottom: var(--kiosk-space-2);
}
.canvas-empty-icon--pulse {
  animation: canvas-empty-pulse 1.6s var(--kiosk-easing) infinite;
}
@keyframes canvas-empty-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
.canvas-empty p {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-medium);
}
.canvas-empty small {
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-on-canvas-secondary);
  max-width: 520px;
  text-align: center;
  line-height: var(--kiosk-lh-base);
}

.canvas-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--kiosk-space-2);
  margin-top: var(--kiosk-space-2);
}

.canvas-empty-btn {
  height: 36px;
  min-width: 148px;
  padding: 0 var(--kiosk-space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  border: 1px solid color-mix(in srgb, var(--kiosk-ink-on-canvas) 16%, transparent);
  border-radius: var(--kiosk-radius-md);
  background: color-mix(in srgb, var(--kiosk-ink-on-canvas) 6%, transparent);
  color: var(--kiosk-ink-on-canvas);
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition:
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    color var(--kiosk-dur-fast) var(--kiosk-easing);
}

.canvas-empty-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kiosk-ink-on-canvas) 12%, transparent);
  border-color: color-mix(in srgb, var(--kiosk-ink-on-canvas) 24%, transparent);
}

.canvas-empty-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.canvas-empty-btn--primary {
  border-color: transparent;
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
}

.canvas-empty-btn--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kiosk-primary) 82%, var(--kiosk-surface) 18%);
}

/* ----------- Floating tools ----------- */

.canvas-tools {
  position: absolute;
  bottom: var(--kiosk-space-4);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-2) var(--kiosk-space-3);
  background: var(--kiosk-canvas-soft);
  border: 1px solid color-mix(in srgb, var(--kiosk-ink-on-canvas) 12%, transparent);
  border-radius: var(--kiosk-radius-lg);
  z-index: 10;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tool-divider {
  width: 1px;
  height: 28px;
  background: color-mix(in srgb, var(--kiosk-ink-on-canvas) 18%, transparent);
  margin: 0 var(--kiosk-space-1);
}

.tool-btn {
  width: var(--kiosk-h-icon-button);
  height: var(--kiosk-h-icon-button);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-on-canvas);
  font-size: var(--dp-font-size-xl);
  cursor: pointer;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.tool-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kiosk-ink-on-canvas) 8%, transparent);
}
.tool-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.tool-btn--toggle.tool-btn--active {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
}

.tool-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 0 var(--kiosk-space-2);
  color: var(--kiosk-ink-on-canvas);
  min-width: 56px;
  justify-content: center;
}
.tool-info strong {
  font-size: var(--kiosk-fz-h3);
  font-variant-numeric: tabular-nums;
}
.tool-info small {
  font-size: var(--kiosk-fz-caption);
  opacity: 0.7;
}

.scan-bound-mobile {
  display: none;
}

/* ----------- Thumbnail strip ----------- */

.thumbs {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  min-height: 0;
}

.thumbs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--kiosk-space-1) var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
}
.thumbs-head h4 {
  margin: 0;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-secondary);
}
.thumbs-warn {
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-warning);
}

.thumbs-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  padding: var(--kiosk-space-5) var(--kiosk-space-3);
}

.thumbs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  overflow-y: auto;
}

.thumb {
  padding: 0;
}
.thumb button {
  width: 100%;
  height: 96px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-1);
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.thumb button:hover {
  border-color: var(--kiosk-primary);
}

.thumb.active button {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kiosk-primary) 20%, transparent);
}
.thumb.exception button {
  border-color: var(--kiosk-danger);
  border-width: 2px;
  background: var(--kiosk-danger-soft);
}
.thumb.exception.active button {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--kiosk-danger) 20%, transparent);
}

.thumb-no {
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.thumb-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}
.thumb.exception .thumb-status {
  color: var(--kiosk-danger);
}
.thumb-warn-icon {
  font-size: var(--dp-font-size-xs);
  color: var(--kiosk-danger);
}

@media (max-width: bp.$shell-laptop-max) {
  .stage-main {
    /* gridTemplateColumns 由内联 style 控制 */
  }
  .canvas-tools {
    gap: 1px;
    padding: var(--kiosk-space-1) var(--kiosk-space-2);
  }
  .tool-divider {
    margin: 0;
  }
}
@media (max-width: bp.$shell-tablet-max) {
  .scan-bound-mobile {
    display: block;
  }

  .stage-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .batch-rail {
    display: flex;
    max-height: 132px;
  }

  .batch-rail :deep(.batch-list) {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .batch-rail :deep(.batch-row) {
    min-width: 200px;
  }

  .stage-main {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .thumbs {
    display: none;
  }

  .stage-main > :deep(.exception-panel) {
    max-height: 280px;
    height: auto;
  }
}
</style>
