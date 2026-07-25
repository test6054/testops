<script setup lang="ts">
import type Konva from 'konva'
import type { ComponentPublicInstance } from 'vue'
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { LayoutCanvasToolCode } from '@/components/mark/layout-designer/LayoutCanvasToolbar.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Image, Layer, Line, Rect, Stage, Text, Transformer } from 'vue-konva'
import LayoutCanvasToolbar from '@/components/mark/layout-designer/LayoutCanvasToolbar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useLayoutPageRaster } from '@/composables/useLayoutPageRaster'
import { ExamLayoutBlockTypeCode, requireExamLayoutBlockTypeCode } from '@/types/enums/exam-layout-block-type-enum'
import {
  blocksOnPage,
  computeStageSize,
  createBlockWithRect,
  expectedAnswerBlockTypeForOcrScene,
  formatRectMmLabel,
  mmToPx,
  normToStageRect,
  pageByNo,
  resolveBlockFill,
  resolveBlockStroke,
  resolvePaperMm,
  resolveSafeMarginMm,
  snapStageValue,
  stageRectToNorm,
} from '@/utils/exam-layout-designer'
import { resolveThemeColor } from '@/utils/mark-echarts-options'

const props = withDefaults(
  defineProps<{
    document: ExamLayoutDocument | null
    pageNo: number
    focusedBlockId: string | null
    focusedQuestionId?: string | null
    readOnly?: boolean
  }>(),
  {
    focusedQuestionId: null,
    // MVR-389：默认拒绝假可写；仅父层显式 :read-only="false"（layoutWritable）可拖改
    readOnly: true,
  },
)

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto | null]
  "patch": [document: ExamLayoutDocument]
}>()

const { loading: rasterLoading, errorMessage: rasterError, loadPageRaster } = useLayoutPageRaster()

const zoom = ref(1)
const showGrid = ref(true)
const showSafeMargin = ref(true)
const snapGridMm = ref(5)
const canvasTool = ref<LayoutCanvasToolCode>('select')
const stageRef = ref()
const transformerRef = ref()
const shapeRefs = new Map<string, Konva.Rect>()
const bgImage = ref<HTMLCanvasElement | null>(null)

interface MarqueeDraft {
  x: number
  y: number
  width: number
  height: number
}

const marqueeDrawing = ref(false)
const marqueeAnchor = ref<{ x: number, y: number } | null>(null)
const marqueeDraft = ref<MarqueeDraft | null>(null)

interface VueKonvaShapeRef {
  getNode: () => Konva.Rect
}

interface TransformerBoundBox {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

function createShapeRefSetter(blockId: string) {
  return (el: Element | ComponentPublicInstance | null) => {
    if (el && typeof el === 'object' && 'getNode' in el) {
      registerShape(blockId, (el as VueKonvaShapeRef).getNode())
      return
    }
    registerShape(blockId, null)
  }
}

function transformerBoundBoxFunc(
  oldBox: TransformerBoundBox,
  newBox: TransformerBoundBox,
): TransformerBoundBox {
  return newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
}

const page = computed(() => pageByNo(props.document, props.pageNo))
const stageSize = computed(() => computeStageSize(page.value))
const visibleBlocks = computed(() => blocksOnPage(props.document, props.pageNo))
const safeMarginMm = computed(() => resolveSafeMarginMm(props.document))

const focusedBlock = computed(
  () => visibleBlocks.value.find((block) => block.id === props.focusedBlockId) ?? null,
)

const rulerLabel = computed(() => {
  if (!focusedBlock.value || !page.value) {
    return ''
  }
  return formatRectMmLabel(focusedBlock.value.rectNorm, page.value, props.document?.paperSpec)
})

const bgImageConfig = computed(() => {
  if (!bgImage.value) {
    return null
  }
  return {
    image: bgImage.value,
    x: 0,
    y: 0,
    width: stageSize.value.width,
    height: stageSize.value.height,
    listening: false,
  }
})

const safeMarginConfig = computed(() => {
  if (!page.value || !showSafeMargin.value) {
    return null
  }
  const paperMm = resolvePaperMm(props.document?.paperSpec, page.value)
  const marginX
    = mmToPx(safeMarginMm.value, page.value.naturalWidthPx, paperMm.widthMm)
      * (stageSize.value.width / page.value.naturalWidthPx)
  const marginY
    = mmToPx(safeMarginMm.value, page.value.naturalHeightPx, paperMm.heightMm)
      * (stageSize.value.height / page.value.naturalHeightPx)
  return {
    x: marginX,
    y: marginY,
    width: stageSize.value.width - marginX * 2,
    height: stageSize.value.height - marginY * 2,
    stroke: resolveThemeColor('--dp-red-600', ''),
    dash: [6, 4],
    strokeWidth: 1,
    listening: false,
  }
})

const gridLines = computed(() => {
  if (!page.value || !showGrid.value) {
    return []
  }
  const lines: Array<{ points: number[], key: string }> = []
  const stepMm = 10
  const stepX = (stepMm / 210) * stageSize.value.width
  const stepY = (stepMm / 210) * stageSize.value.height
  for (let x = stepX; x < stageSize.value.width; x += stepX) {
    lines.push({ key: `v-${x}`, points: [x, 0, x, stageSize.value.height] })
  }
  for (let y = stepY; y < stageSize.value.height; y += stepY) {
    lines.push({ key: `h-${y}`, points: [0, y, stageSize.value.width, y] })
  }
  return lines
})

const marqueePreviewConfig = computed(() => {
  if (!marqueeDraft.value) {
    return null
  }
  return {
    x: marqueeDraft.value.x,
    y: marqueeDraft.value.y,
    width: marqueeDraft.value.width,
    height: marqueeDraft.value.height,
    stroke: resolveThemeColor('--dp-color-primary', ''),
    dash: [6, 4],
    strokeWidth: 1.5,
    fill: resolveThemeColor('--dp-color-primary-bg', ''),
    listening: false,
  }
})

function blockDraggable(): boolean {
  return !props.readOnly && canvasTool.value === 'select'
}

function resolveMarqueeBlockType(): ExamLayoutBlockTypeCode {
  if (props.focusedQuestionId && props.document) {
    const question = props.document.questions.find((item) => item.id === props.focusedQuestionId)
    if (question) {
      return requireExamLayoutBlockTypeCode(
        expectedAnswerBlockTypeForOcrScene(question.ocrScene),
      )
    }
  }
  return ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
}

function stagePointer(event: { target: Konva.Node }): { x: number, y: number } | null {
  const stage = event.target.getStage()
  if (!stage) {
    return null
  }
  const pointer = stage.getPointerPosition()
  if (!pointer) {
    return null
  }
  const scale = stage.scaleX() || 1
  return { x: pointer.x / scale, y: pointer.y / scale }
}

function snapMarqueeRect(x: number, y: number, width: number, height: number): MarqueeDraft {
  if (snapGridMm.value <= 0 || !page.value) {
    return { x, y, width, height }
  }
  const paperSpec = props.document?.paperSpec
  const snappedX = snapStageValue(x, snapGridMm.value, page.value, stageSize.value.width, 'x', paperSpec)
  const snappedY = snapStageValue(y, snapGridMm.value, page.value, stageSize.value.width, 'y', paperSpec)
  const snappedWidth = snapStageValue(
    width,
    snapGridMm.value,
    page.value,
    stageSize.value.width,
    'x',
    paperSpec,
  )
  const snappedHeight = snapStageValue(
    height,
    snapGridMm.value,
    page.value,
    stageSize.value.width,
    'y',
    paperSpec,
  )
  return {
    x: snappedX,
    y: snappedY,
    width: snappedWidth,
    height: snappedHeight,
  }
}

function blockConfig(block: ExamLayoutBlockDto) {
  const rect = normToStageRect(block.rectNorm, page.value!, stageSize.value.width)
  const focused = props.focusedBlockId === block.id
  return {
    id: block.id,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill: resolveBlockFill(block.blockType),
    stroke: focused ? resolveThemeColor('--dp-color-primary', '') : resolveBlockStroke(block.blockType),
    strokeWidth: focused ? 2 : 1,
    draggable: blockDraggable(),
    listening: canvasTool.value === 'select',
    name: block.id,
  }
}

function labelConfig(block: ExamLayoutBlockDto) {
  const rect = normToStageRect(block.rectNorm, page.value!, stageSize.value.width)
  return {
    x: rect.x + 4,
    y: rect.y + 4,
    text: block.blockType,
    fontSize: 11,
    fill: resolveThemeColor('--dp-text-secondary', ''),
    listening: false,
  }
}

function registerShape(blockId: string, node: Konva.Rect | null): void {
  if (node) {
    shapeRefs.set(blockId, node)
  } else {
    shapeRefs.delete(blockId)
  }
}

function syncTransformer(): void {
  const transformer = transformerRef.value?.getNode() as Konva.Transformer | undefined
  if (!transformer) {
    return
  }
  if (props.readOnly || canvasTool.value !== 'select' || !props.focusedBlockId) {
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
    return
  }
  const shape = shapeRefs.get(props.focusedBlockId)
  if (shape) {
    transformer.nodes([shape])
    transformer.getLayer()?.batchDraw()
  } else {
    transformer.nodes([])
  }
}

function patchBlockRect(blockId: string, node: Konva.Rect): void {
  // MVR-417：与 readOnly / 父层 layoutCanvasReadonly 二次闸，禁止拖改/缩放绕过 disabled
  if (props.readOnly || !props.document || !page.value) {
    return
  }
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()
  node.scaleX(1)
  node.scaleY(1)
  let x = node.x()
  let y = node.y()
  let width = Math.max(8, node.width() * scaleX)
  let height = Math.max(8, node.height() * scaleY)
  if (snapGridMm.value > 0) {
    const paperSpec = props.document?.paperSpec
    x = snapStageValue(x, snapGridMm.value, page.value, stageSize.value.width, 'x', paperSpec)
    y = snapStageValue(y, snapGridMm.value, page.value, stageSize.value.width, 'y', paperSpec)
    width = snapStageValue(
      width,
      snapGridMm.value,
      page.value,
      stageSize.value.width,
      'x',
      paperSpec,
    )
    height = snapStageValue(
      height,
      snapGridMm.value,
      page.value,
      stageSize.value.width,
      'y',
      paperSpec,
    )
    node.position({ x, y })
    node.size({ width, height })
  }
  const rectNorm = stageRectToNorm(x, y, width, height, page.value, stageSize.value.width)
  const blocks = props.document.blocks.map((block) =>
    block.id === blockId ? { ...block, rectNorm } : block,
  )
  emit('patch', { ...props.document, blocks })
}

function handleDragEnd(blockId: string, event: { target: Konva.Rect }): void {
  patchBlockRect(blockId, event.target)
}

function handleTransformEnd(blockId: string, event: { target: Konva.Rect }): void {
  patchBlockRect(blockId, event.target)
}

function handleSelect(block: ExamLayoutBlockDto): void {
  if (canvasTool.value !== 'select') {
    return
  }
  emit('focus-block', block)
}

function resetMarqueeDraft(): void {
  marqueeDrawing.value = false
  marqueeAnchor.value = null
  marqueeDraft.value = null
}

function commitMarqueeDraft(): void {
  // MVR-417：框选落块叠 readOnly（识别中/关考只读漂移时不写入本地 document）
  if (props.readOnly || !marqueeDraft.value || !props.document || !page.value) {
    resetMarqueeDraft()
    return
  }
  const draft = snapMarqueeRect(
    marqueeDraft.value.x,
    marqueeDraft.value.y,
    marqueeDraft.value.width,
    marqueeDraft.value.height,
  )
  resetMarqueeDraft()
  if (draft.width < 8 || draft.height < 8) {
    return
  }
  const rectNorm = stageRectToNorm(
    draft.x,
    draft.y,
    draft.width,
    draft.height,
    page.value,
    stageSize.value.width,
  )
  const blockType = resolveMarqueeBlockType()
  const maxLayer = props.document.blocks.reduce((max, block) => Math.max(max, block.layer ?? 0), 0)
  const nextBlock = createBlockWithRect(props.pageNo, blockType, maxLayer + 1, rectNorm)
  if (props.focusedQuestionId) {
    nextBlock.layoutQuestionId = props.focusedQuestionId
  }
  emit('patch', {
    ...props.document,
    blocks: [...props.document.blocks, nextBlock],
  })
  emit('focus-block', nextBlock)
}

function handleStageMouseDown(event: { target: Konva.Node }): void {
  if (props.readOnly) {
    return
  }
  if (canvasTool.value === 'marquee') {
    if (event.target !== event.target.getStage()) {
      return
    }
    const point = stagePointer(event)
    if (!point) {
      return
    }
    marqueeDrawing.value = true
    marqueeAnchor.value = { x: point.x, y: point.y }
    marqueeDraft.value = { x: point.x, y: point.y, width: 0, height: 0 }
    return
  }
  if (event.target === event.target.getStage()) {
    emit('focus-block', null)
  }
}

function handleStageMouseMove(event: { target: Konva.Node }): void {
  if (!marqueeDrawing.value || !marqueeAnchor.value) {
    return
  }
  const point = stagePointer(event)
  if (!point) {
    return
  }
  const anchor = marqueeAnchor.value
  marqueeDraft.value = {
    x: Math.min(anchor.x, point.x),
    y: Math.min(anchor.y, point.y),
    width: Math.abs(point.x - anchor.x),
    height: Math.abs(point.y - anchor.y),
  }
}

function handleStageMouseUp(): void {
  if (!marqueeDrawing.value) {
    return
  }
  commitMarqueeDraft()
}

async function loadBackground(): Promise<void> {
  bgImage.value = null
  if (!page.value?.backgroundFileId) {
    return
  }
  bgImage.value = await loadPageRaster(
    page.value.backgroundFileId,
    props.pageNo,
    stageSize.value.width,
  )
}

watch(
  () => [page.value?.backgroundFileId, props.pageNo],
  () => {
    void loadBackground()
  },
  { immediate: true },
)

watch(
  () => [props.focusedBlockId, visibleBlocks.value.length, props.readOnly, canvasTool.value],
  async () => {
    await nextTick()
    syncTransformer()
  },
)

onMounted(() => {
  syncTransformer()
})
</script>

<template>
  <section class="layout-canvas">
    <LayoutCanvasToolbar
      v-model:zoom="zoom"
      v-model:show-grid="showGrid"
      v-model:show-safe-margin="showSafeMargin"
      v-model:snap-grid-mm="snapGridMm"
      v-model:canvas-tool="canvasTool"
      :read-only="readOnly"
    />
    <div v-if="rulerLabel" class="layout-canvas__ruler">{{ rulerLabel }}</div>
    <UiSpin :spinning="rasterLoading">
      <UiAlertStrip
        v-if="!page"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
        class="layout-canvas__empty"
      >
        <template #default>
          <span class="layout-canvas__empty-row">
            <UiTag tone="blue" size="sm">待配置页背景</UiTag>
            <span class="layout-canvas__empty-text">当前页尚未配置背景，请生成答题纸或上传整卷源文件</span>
          </span>
        </template>
      </UiAlertStrip>
      <div v-else class="layout-canvas__viewport">
        <Stage
          ref="stageRef"
          :config="{
            width: stageSize.width * zoom,
            height: stageSize.height * zoom,
            scaleX: zoom,
            scaleY: zoom,
          }"
          @mousedown="handleStageMouseDown"
          @mousemove="handleStageMouseMove"
          @mouseup="handleStageMouseUp"
          @mouseleave="handleStageMouseUp"
          @touchstart="handleStageMouseDown"
          @touchmove="handleStageMouseMove"
          @touchend="handleStageMouseUp"
        >
          <Layer>
            <Image v-if="bgImageConfig" :config="bgImageConfig" />
            <Rect
              v-else
              :config="{
                x: 0,
                y: 0,
                width: stageSize.width,
                height: stageSize.height,
                fill: resolveThemeColor('--dp-gray-50', ''),
                stroke: resolveThemeColor('--dp-gray-200', ''),
                listening: false,
              }"
            />
          </Layer>
          <Layer>
            <Line
              v-for="line in gridLines"
              :key="line.key"
              :config="{
                points: line.points,
                stroke: resolveThemeColor('--dp-gray-200', ''),
                strokeWidth: 1,
                listening: false,
              }"
            />
            <Rect v-if="safeMarginConfig" :config="safeMarginConfig" />
          </Layer>
          <Layer>
            <template v-for="block in visibleBlocks" :key="block.id">
              <Rect
                :ref="createShapeRefSetter(block.id)"
                :config="blockConfig(block)"
                @click="handleSelect(block)"
                @tap="handleSelect(block)"
                @dragend="handleDragEnd(block.id, $event)"
                @transformend="handleTransformEnd(block.id, $event)"
              />
              <Text :config="labelConfig(block)" />
            </template>
            <Transformer
              v-if="!readOnly && canvasTool === 'select'"
              ref="transformerRef"
              :config="{
                rotateEnabled: false,
                keepRatio: false,
                enabledAnchors: [
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                  'middle-left',
                  'middle-right',
                  'top-center',
                  'bottom-center',
                ],
                boundBoxFunc: transformerBoundBoxFunc,
              }"
            />
            <Rect v-if="marqueePreviewConfig" :config="marqueePreviewConfig" />
          </Layer>
        </Stage>
      </div>
      <p v-if="rasterError" class="layout-canvas__error">{{ rasterError }}</p>
    </UiSpin>
  </section>
</template>

<style scoped lang="scss">
.layout-canvas {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  padding: var(--dp-space-component);

  &__viewport {
    overflow: auto;
    max-height: calc(100vh - 280px);
    min-height: 440px;
    background: var(--dp-surface-subtle);
    border-radius: var(--dp-radius-control);
    padding: var(--dp-space-component);
  }

  &__ruler {
    margin-bottom: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__empty {
    margin: var(--dp-space-component) 0;
    max-width: 100%;
  }

  &__empty-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-width: 0;
  }

  &__empty-text {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__error {
    margin-top: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-error);
  }
}
</style>
