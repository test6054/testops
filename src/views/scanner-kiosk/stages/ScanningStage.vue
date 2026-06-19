<script setup lang="ts">
import type { LocalScanPageStatus, ScanPageInfo } from '@/apis/mark/scanner-agent-local'
/**
 * Stage 2 - 扫描中
 *
 * 顶部 status ribbon + 大画布预览（深色） + 右侧缩略图 strip + 浮动工具栏（4 组）
 *
 * 浮动工具栏组（左→右，分隔条隔开）：
 *   翻页组：首页 / 上页 / 页号 / 下页 / 末页
 *   缩放组：缩小 / 百分比 / 放大 / 适配窗口
 *   旋转组：左转 90° / 右转 90°
 *   滤镜组：灰度切换
 *
 * 键盘快捷键（仅在本 stage 焦点不在输入框时生效）：
 *   ←/→/Home/End  : 由全局 useKioskShortcuts 处理（KioskLayout）
 *   Space         : 由全局 useKioskShortcuts 处理（暂停/继续）
 *   + / =         : 缩小 / 放大（实际：= 不带 shift 时为 +）
 *   - / _         : 缩小
 *   0             : 重置视图（缩放 1.0 / 旋转 0 / 关灰度）
 *   r             : 右转 90°
 *   R (shift+r)   : 左转 90°
 *   g             : 切换灰度
 *
 * 操作类按钮（暂停/继续/结束/重试）由 KioskLayout 的 BottomBar 处理。
 */
import {
  CaretLeftOutlined,
  CaretRightOutlined,
  ExpandOutlined,
  FilterFilled,
  FilterOutlined,
  MinusOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  ScanOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  UndoOutlined,
  WarningFilled,
} from '@ant-design/icons-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { strictEnumLabel } from '@/utils/strict-enum'
import KioskBoundStudentsPanel from '../components/KioskBoundStudentsPanel.vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, stage } = useKioskCtx()

const hasJob = computed(() => Boolean(workflow.currentJob.value))
const job = computed(() => workflow.currentJob.value)
const pages = computed(() => workflow.visiblePages.value)
const emptyScanTitle = computed(() => (workflow.activeBackendScanSession.value ? '存在未结束扫描进程' : '暂无扫描批次'))
const emptyScanHint = computed(() =>
  workflow.activeBackendScanSession.value
    ? workflow.activeBackendScanSessionReason.value
    : '请返回「准备扫描」开始一次扫描，或等待扫描仪送纸。',
)
const previewPageNo = computed({
  get: () => workflow.previewPageNo.value,
  set: (v: number) => {
    workflow.previewPageNo.value = v
  },
})

// 视图状态：缩放 / 旋转 / 灰度（不进 workflow，仅 stage 内部）
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25
const zoomLevel = ref(1)
const rotation = ref<0 | 90 | 180 | 270>(0)
const grayscale = ref(false)

const zoomPercent = computed(() => `${Math.round(zoomLevel.value * 100)}%`)
const imageTransform = computed(
  () => `translate(-50%, -50%) scale(${zoomLevel.value}) rotate(${rotation.value}deg)`,
)
const imageFilter = computed(() => (grayscale.value ? 'grayscale(1)' : 'none'))

const isPageException = (page: ScanPageInfo) => page.status === 'FAILED' || Boolean(page.diagnostic)

const currentIndex = computed(() => {
  if (!previewPageNo.value) return -1
  return pages.value.findIndex((p) => p.pageNo === previewPageNo.value)
})

const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(
  () => currentIndex.value >= 0 && currentIndex.value < pages.value.length - 1,
)

function gotoPage(pageNo: number) {
  previewPageNo.value = pageNo
}
function gotoPrev() {
  if (canPrev.value) previewPageNo.value = pages.value[currentIndex.value - 1].pageNo
}
function gotoNext() {
  if (canNext.value) previewPageNo.value = pages.value[currentIndex.value + 1].pageNo
}
function gotoFirst() {
  if (pages.value.length) previewPageNo.value = pages.value[0].pageNo
}
function gotoLast() {
  if (pages.value.length) previewPageNo.value = pages.value[pages.value.length - 1].pageNo
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
function rotateRight() {
  rotation.value = ((rotation.value + 90) % 360) as 0 | 90 | 180 | 270
}
function rotateLeft() {
  rotation.value = ((rotation.value + 270) % 360) as 0 | 90 | 180 | 270
}
function toggleGrayscale() {
  grayscale.value = !grayscale.value
}

// 切页时重置视图状态：避免上一页放大状态影响下一页观感
watch(previewPageNo, () => {
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
      previewPageNo.value = last.pageNo
    }
  },
)

const stateClass = computed(() => `state-${workflow.workState.value.tone}`)

const PAGE_STATUS_LABEL: Record<LocalScanPageStatus, string> = {
  CAPTURED: '已采集',
  PREPROCESSED: '已预处理',
  UPLOADING: '上传中',
  UPLOADED: '已上传',
  FAILED: '失败',
  DELETED: '已删除',
}

function pageStatusLabel(status: LocalScanPageStatus): string {
  return strictEnumLabel(PAGE_STATUS_LABEL, status, '扫描页状态')
}

// stage 内部视图键盘快捷键（与全局 useKioskShortcuts 不冲突）
function shouldIgnoreKey(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function onViewKeyDown(event: KeyboardEvent) {
  // 仅本 stage active 时响应（route 切换后 unmount 已清理 listener，此处再加一层保险）
  if (stage.currentStage.value !== 'scanning') return
  if (shouldIgnoreKey(event)) return
  if (event.altKey || event.ctrlKey || event.metaKey) return

  switch (event.key) {
    case '+':
    case '=':
      event.preventDefault()
      zoomIn()
      break
    case '-':
    case '_':
      event.preventDefault()
      zoomOut()
      break
    case '0':
      event.preventDefault()
      resetView()
      break
    case 'r':
      event.preventDefault()
      rotateRight()
      break
    case 'R':
      event.preventDefault()
      rotateLeft()
      break
    case 'g':
    case 'G':
      event.preventDefault()
      toggleGrayscale()
      break
  }
}

onMounted(() => window.addEventListener('keydown', onViewKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onViewKeyDown))
</script>

<template>
  <section class="scanning-stage">
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
          <div class="progress-fill" :style="{ width: `${workflow.scanProgress.value}%` }" />
        </div>
        <span class="progress-pct">{{ workflow.scanProgress.value }}%</span>
      </div>
      <div v-if="hasJob" class="ribbon-counters">
        <div>
          <span>已扫描</span>
          <strong>{{ job?.scannedPages ?? 0 }}</strong>
        </div>
        <div>
          <span>已上传</span>
          <strong>{{ job?.uploadedPages ?? 0 }}</strong>
        </div>
        <div v-if="workflow.exceptionPages.value.length > 0" class="counter-warn">
          <span>异常</span>
          <strong>{{ workflow.exceptionPages.value.length }}</strong>
        </div>
      </div>
      <div v-if="job?.status === 'PAUSED'" class="ribbon-paused">
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
      <!-- 大画布预览 -->
      <main class="canvas-wrap">
        <div class="canvas">
          <div v-if="!hasJob" class="canvas-empty">
            <ScanOutlined class="canvas-empty-icon" />
            <p>{{ emptyScanTitle }}</p>
            <small>{{ emptyScanHint }}</small>
          </div>
          <div v-else-if="pages.length === 0" class="canvas-empty">
            <ScanOutlined class="canvas-empty-icon canvas-empty-icon--pulse" />
            <p>等待扫描仪送纸…</p>
            <small>送纸后将自动显示首张影像，请勿关闭工作台。</small>
          </div>
          <div v-else-if="!previewPageNo || !workflow.previewImageUrl.value" class="canvas-empty">
            <p>请在右侧缩略图中选择一页查看</p>
          </div>
          <img
            v-else
            class="canvas-image"
            :src="workflow.previewImageUrl.value"
            :alt="`第 ${previewPageNo} 页`"
            :style="{ transform: imageTransform, filter: imageFilter }"
            draggable="false"
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
                <strong>{{ previewPageNo }}</strong>
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
              <button type="button" class="tool-btn" title="左转 90° [Shift+R]" @click="rotateLeft">
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

      <!-- 缩略图 strip -->
      <aside v-if="hasJob" class="thumbs">
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
              <div class="thumb-no">第 {{ page.pageNo }} 页</div>
              <div class="thumb-status">
                <WarningFilled v-if="isPageException(page)" class="thumb-warn-icon" />
                <span>{{ pageStatusLabel(page.status) }}</span>
              </div>
            </button>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
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
  border-radius: var(--kiosk-radius-pill);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--kiosk-primary);
  border-radius: var(--kiosk-radius-pill);
  transition: width var(--kiosk-dur-base) var(--kiosk-easing);
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

.ribbon-paused {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  padding: 0 var(--kiosk-space-3);
  height: 32px;
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
}

/* ----------- Body grid: canvas + thumb strip ----------- */

.stage-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 168px;
  gap: var(--kiosk-space-3);
  flex: 1;
  min-height: 0;
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
  background: #fff;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
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
  background: rgba(20, 27, 45, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--kiosk-radius-pill);
  backdrop-filter: blur(8px);
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
  background: rgba(255, 255, 255, 0.15);
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
  font-size: 18px;
  cursor: pointer;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
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
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.2);
}
.thumb.exception button {
  border-color: var(--kiosk-danger);
  background: var(--kiosk-danger-soft);
}
.thumb.exception.active button {
  box-shadow: 0 0 0 2px rgba(197, 38, 62, 0.2);
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
  font-size: 12px;
  color: var(--kiosk-danger);
}

@media (max-width: 1280px) {
  .stage-body {
    grid-template-columns: minmax(0, 1fr) 144px;
  }
  .canvas-tools {
    gap: 1px;
    padding: var(--kiosk-space-1) var(--kiosk-space-2);
  }
  .tool-divider {
    margin: 0;
  }
}
@media (max-width: 1024px) {
  .scan-bound-mobile {
    display: block;
  }

  .stage-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .thumbs {
    display: none;
  }
}
</style>
