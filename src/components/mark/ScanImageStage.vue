<script lang="ts" setup>
/**
 * ScanImageStage - mark 域浅色看片台
 *
 * 影像优先：白纸影像在浅灰画布上放大居中，浮动工具栏（缩放/旋转/灰度）压缩让位。
 * 对齐一体机 ScanningStage 的「看片画布」结构与交互，但用浅色表达（不深色化 Web）。
 * 支持母版 ROI overlay。影像 URL 由父级传入（已 blob 化），本组件不负责拉取。
 */
import {
  ExpandOutlined,
  MinusOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import ConfidentialWatermarkLayer from '@/components/mark/ConfidentialWatermarkLayer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { buildConfidentialWatermarkLines } from '@/composables/useConfidentialWatermark'

/** 母版题目区域 ROI（百分比定位，已由父级换算） */
interface RoiStyle {
  left: string
  top: string
  width: string
  height: string
}

const props = withDefaults(
  defineProps<{
    /** 当前影像 blob URL；为空时显示空态 */
    src?: string
    /** 影像标题/页码说明 */
    caption?: string
    /** 母版 ROI 高亮区域（百分比定位），无则不渲染 */
    roi?: RoiStyle | null
    /** 空态文案 */
    emptyText?: string
    /** 画布最小高度（px），默认 420 */
    minHeight?: number
    /** 涉密场次：禁用右键与文本选择，水印密度提升 */
    confidential?: boolean
    /** 水印中的考试标识 */
    examLabel?: string
    /** 自定义水印行；缺省时按当前登录用户 + examLabel 生成 */
    watermarkLines?: string[]
    /** 是否在卷面影像上叠操作者水印（默认开启，用于试卷/扫描页追溯） */
    viewerWatermark?: boolean
    /** 父级正在获取影像地址或 blob。 */
    loading?: boolean
    /** 父级取图失败原因；与浏览器图片解码失败统一展示。 */
    errorText?: string
  }>(),
  {
    viewerWatermark: true,
    loading: false,
    errorText: '',
  },
)

const showViewerWatermark = computed(() => props.viewerWatermark && Boolean(props.src))
const resolvedWatermarkLines = computed(() => {
  if (!showViewerWatermark.value) {
    return []
  }
  if (props.watermarkLines?.length) {
    return props.watermarkLines
  }
  return buildConfidentialWatermarkLines({ examLabel: props.examLabel })
})
const watermarkDensity = computed(() => (props.confidential === true ? 'dense' : 'normal'))

const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25

// 视图状态：缩放 / 旋转 / 灰度 / 平移
const zoomLevel = ref(1)
type ScanImageRotation = 0 | 90 | 180 | 270
const rotation = ref<ScanImageRotation>(0)
const grayscale = ref(false)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const imageLoading = ref(false)
const imageError = ref('')
const imageAttempt = ref(0)
let panPointerId: number | null = null
let panOriginX = 0
let panOriginY = 0
let panStartX = 0
let panStartY = 0

const zoomPercent = computed(() => `${Math.round(zoomLevel.value * 100)}%`)
const imageTransform = computed(
  () =>
    `translate(${panX.value}px, ${panY.value}px) scale(${zoomLevel.value}) rotate(${rotation.value}deg)`,
)
const imageFilter = computed(() => (grayscale.value ? 'grayscale(1)' : 'none'))
const canvasMinHeight = computed(() => `${props.minHeight ?? 420}px`)
const canPan = computed(() => Boolean(props.src) && zoomLevel.value > 1)
const showLoading = computed(() => props.loading || imageLoading.value)
const resolvedError = computed(() => props.errorText || imageError.value)

function resetPan(): void {
  panX.value = 0
  panY.value = 0
}

function clampZoom(v: number): number {
  return Math.min(Math.max(Math.round(v * 100) / 100, ZOOM_MIN), ZOOM_MAX)
}
function zoomIn(): void {
  zoomLevel.value = clampZoom(zoomLevel.value + ZOOM_STEP)
}
function zoomOut(): void {
  zoomLevel.value = clampZoom(zoomLevel.value - ZOOM_STEP)
}
function fitToScreen(): void {
  zoomLevel.value = 1
  resetPan()
}
function rotateRight(): void {
  rotation.value = nextRotation(rotation.value, 90)
}
function rotateLeft(): void {
  rotation.value = nextRotation(rotation.value, 270)
}
function toggleGrayscale(): void {
  grayscale.value = !grayscale.value
}

function nextRotation(current: ScanImageRotation, delta: 90 | 270): ScanImageRotation {
  const next = (current + delta) % 360
  if (next === 0 || next === 90 || next === 180 || next === 270) {
    return next
  }
  throw new Error(`扫描图像旋转角度异常：${next}`)
}
function onConfidentialContextMenu(event: MouseEvent): void {
  if (props.confidential === true) {
    event.preventDefault()
  }
}

function onCanvasPointerDown(event: PointerEvent): void {
  if (canPan.value !== true) {
    return
  }
  if (event.target instanceof HTMLElement && event.target.closest('.scan-stage__tools')) {
    return
  }
  if (!(event.currentTarget instanceof HTMLElement)) {
    return
  }
  isPanning.value = true
  panPointerId = event.pointerId
  panOriginX = panX.value
  panOriginY = panY.value
  panStartX = event.clientX
  panStartY = event.clientY
  event.currentTarget.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onCanvasPointerMove(event: PointerEvent): void {
  if (!isPanning.value || panPointerId !== event.pointerId) {
    return
  }
  panX.value = panOriginX + (event.clientX - panStartX)
  panY.value = panOriginY + (event.clientY - panStartY)
}

function onCanvasKeydown(event: KeyboardEvent): void {
  if (canPan.value !== true) {
    return
  }
  const delta = event.shiftKey ? 40 : 16
  if (event.key === 'ArrowLeft') panX.value -= delta
  else if (event.key === 'ArrowRight') panX.value += delta
  else if (event.key === 'ArrowUp') panY.value -= delta
  else if (event.key === 'ArrowDown') panY.value += delta
  else if (event.key === 'Home') resetPan()
  else return
  event.preventDefault()
}

function onImageLoad(): void {
  imageLoading.value = false
  imageError.value = ''
}

function onImageError(): void {
  imageLoading.value = false
  imageError.value = '影像文件加载失败，请重新加载'
}

function retryImage(): void {
  if (!props.src) {
    return
  }
  imageAttempt.value += 1
  imageError.value = ''
  imageLoading.value = true
}

function endCanvasPan(event: PointerEvent): void {
  if (panPointerId !== event.pointerId) {
    return
  }
  isPanning.value = false
  panPointerId = null
}

// 切换影像时重置缩放/旋转/平移；灰度作为持久核对偏好不重置
watch(
  () => props.src,
  (src) => {
    zoomLevel.value = 1
    rotation.value = 0
    resetPan()
    imageAttempt.value = 0
    imageError.value = ''
    imageLoading.value = Boolean(src)
  },
  { immediate: true },
)
</script>

<template>
  <div class="scan-stage" :class="{ 'scan-stage--confidential': props.confidential }">
    <div
      class="scan-stage__canvas"
      :class="{
        'scan-stage__canvas--pan': canPan,
        'scan-stage__canvas--panning': isPanning,
        'scan-stage__canvas--confidential': props.confidential,
      }"
      :style="{ minHeight: canvasMinHeight }"
      :tabindex="canPan ? 0 : undefined"
      :aria-busy="showLoading || undefined"
      aria-label="扫描影像查看区"
      @pointerdown="onCanvasPointerDown"
      @pointermove="onCanvasPointerMove"
      @pointerup="endCanvasPan"
      @pointercancel="endCanvasPan"
      @contextmenu="onConfidentialContextMenu"
      @keydown="onCanvasKeydown"
    >
      <UiSkeletonState v-if="showLoading" variant="card" compact />
      <UiEmpty
        v-else-if="resolvedError"
        size="sm"
        title="影像加载失败"
        :description="resolvedError"
      >
        <template #action>
          <UiButton v-if="src" size="sm" variant="outline" @click="retryImage">
            重新加载
          </UiButton>
        </template>
      </UiEmpty>
      <div v-else-if="!src" class="scan-stage__empty">
        {{ emptyText || '暂无影像' }}
      </div>
      <div v-else class="scan-stage__paper-wrap">
        <ConfidentialWatermarkLayer
          v-if="showViewerWatermark"
          :lines="resolvedWatermarkLines"
          :density="watermarkDensity"
        />
        <img
          class="scan-stage__image"
          :key="`${src}:${imageAttempt}`"
          :src="src"
          :alt="caption || '扫描影像'"
          :style="{ transform: imageTransform, filter: imageFilter }"
          draggable="false"
          @contextmenu="onConfidentialContextMenu"
          @load="onImageLoad"
          @error="onImageError"
        />
        <div
          v-if="roi"
          class="scan-stage__roi"
          :style="{ left: roi.left, top: roi.top, width: roi.width, height: roi.height }"
        />
      </div>

      <div v-if="src && !showLoading && !resolvedError" class="scan-stage__tools" role="toolbar" aria-label="影像查看工具">
        <div class="scan-stage__group" role="group" aria-label="缩放">
          <button
            type="button"
            class="scan-stage__btn"
            :disabled="zoomLevel <= ZOOM_MIN"
            title="缩小"
            aria-label="缩小影像"
            @click="zoomOut"
          >
            <MinusOutlined />
          </button>
          <span class="scan-stage__info">{{ zoomPercent }}</span>
          <button
            type="button"
            class="scan-stage__btn"
            :disabled="zoomLevel >= ZOOM_MAX"
            title="放大"
            aria-label="放大影像"
            @click="zoomIn"
          >
            <PlusOutlined />
          </button>
          <button type="button" class="scan-stage__btn" title="适配窗口" aria-label="适配窗口" @click="fitToScreen">
            <ExpandOutlined />
          </button>
        </div>
        <span class="scan-stage__divider" aria-hidden="true" />
        <div class="scan-stage__group" role="group" aria-label="旋转">
          <button type="button" class="scan-stage__btn" title="左转 90°" aria-label="向左旋转 90 度" @click="rotateLeft">
            <UndoOutlined />
          </button>
          <span class="scan-stage__info">{{ rotation }}°</span>
          <button type="button" class="scan-stage__btn" title="右转 90°" aria-label="向右旋转 90 度" @click="rotateRight">
            <RedoOutlined />
          </button>
        </div>
        <span class="scan-stage__divider" aria-hidden="true" />
        <button
          type="button"
          class="scan-stage__btn scan-stage__btn--toggle"
          :class="{ 'scan-stage__btn--active': grayscale }"
          title="灰度核对"
          aria-label="切换灰度核对"
          :aria-pressed="grayscale"
          @click="toggleGrayscale"
        >
          灰度
        </button>
      </div>
    </div>
    <p v-if="caption" class="scan-stage__caption">{{ caption }}</p>
  </div>
</template>

<style scoped>
.scan-stage {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.scan-stage__canvas {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--scan-canvas-bg);
  border: 1px solid var(--scan-canvas-border);
  border-radius: var(--dp-radius-panel);
  overflow: hidden;
  touch-action: none;
}

.scan-stage__canvas--pan {
  cursor: grab;
}

.scan-stage__canvas--panning {
  cursor: grabbing;
}

.scan-stage__empty {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-md);
}

.scan-stage__paper-wrap {
  position: relative;
  display: inline-block;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
  isolation: isolate;
}

.scan-stage__canvas--confidential {
  user-select: none;
}

.scan-stage__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  background: var(--dp-surface);
  box-shadow: var(--scan-paper-shadow);
  user-select: none;
  transform-origin: center center;
  transition:
    transform var(--dp-duration-fast) var(--dp-ease-default),
    filter var(--dp-duration-fast) var(--dp-ease-default);
}

.scan-stage__canvas--confidential .scan-stage__image {
  -webkit-user-drag: none;
}

.scan-stage__canvas--panning .scan-stage__image {
  transition: filter var(--dp-duration-fast) var(--dp-ease-default);
}

.scan-stage__roi {
  position: absolute;
  border: 2px dashed var(--dp-color-primary);
  background: color-mix(in srgb, var(--dp-color-primary) 8%, transparent);
  pointer-events: none;
  border-radius: 2px;
}

.scan-stage__tools {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  background: var(--scan-toolbar-bg);
  border: 1px solid var(--scan-toolbar-border);
  border-radius: var(--dp-radius-panel);
  box-shadow: var(--dp-shadow-sm);
}

.scan-stage__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.scan-stage__divider {
  width: 1px;
  height: 22px;
  background: var(--dp-border);
}

.scan-stage__btn {
  min-width: 34px;
  height: 34px;
  padding: 0 var(--dp-space-component-tight);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--dp-radius-control-inner);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-md);
  cursor: pointer;
  transition: background var(--dp-duration-fast) var(--dp-ease-default);
}
.scan-stage__btn:hover:not(:disabled) {
  background: var(--dp-surface-subtle);
  color: var(--dp-color-primary);
}
.scan-stage__btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.scan-stage__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}
.scan-stage__btn--toggle.scan-stage__btn--active {
  background: var(--dp-color-primary);
  color: var(--dp-text-inverse);
}

.scan-stage__info {
  min-width: 48px;
  padding: 0 var(--dp-space-component-xs);
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-primary);
}

.scan-stage__caption {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
