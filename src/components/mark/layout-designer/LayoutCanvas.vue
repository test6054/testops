<script setup lang="ts">
import type Konva from 'konva'
import type { ComponentPublicInstance } from 'vue'
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'vue-konva'
import LayoutCanvasToolbar from '@/components/mark/layout-designer/LayoutCanvasToolbar.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { useLayoutPageRaster } from '@/composables/useLayoutPageRaster'
import {
  blocksOnPage,
  computeStageSize,
  formatRectMmLabel,
  mmToPx,
  normToStageRect,
  pageByNo,
  resolveBlockFill,
  resolveBlockStroke,
  resolveSafeMarginMm,
  snapStageValue,
  stageRectToNorm,
} from '@/utils/exam-layout-designer'

const props = withDefaults(
  defineProps<{
    document: ExamLayoutDocument | null
    pageNo: number
    focusedBlockId: string | null
    readOnly?: boolean
  }>(),
  {
    readOnly: false,
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
const stageRef = ref()
const transformerRef = ref()
const shapeRefs = new Map<string, Konva.Rect>()
const bgImage = ref<HTMLCanvasElement | null>(null)

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
  return formatRectMmLabel(focusedBlock.value.rectNorm, page.value)
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
  const marginX
    = mmToPx(safeMarginMm.value, page.value.naturalWidthPx)
      * (stageSize.value.width / page.value.naturalWidthPx)
  const marginY
    = mmToPx(safeMarginMm.value, page.value.naturalHeightPx)
      * (stageSize.value.height / page.value.naturalHeightPx)
  return {
    x: marginX,
    y: marginY,
    width: stageSize.value.width - marginX * 2,
    height: stageSize.value.height - marginY * 2,
    stroke: '#ff7875',
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
    stroke: focused ? '#1677ff' : resolveBlockStroke(block.blockType),
    strokeWidth: focused ? 2 : 1,
    draggable: !props.readOnly,
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
    fill: '#334155',
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
  if (props.readOnly || !props.focusedBlockId) {
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
  if (!props.document || !page.value) {
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
    x = snapStageValue(x, snapGridMm.value, page.value, stageSize.value.width, 'x')
    y = snapStageValue(y, snapGridMm.value, page.value, stageSize.value.width, 'y')
    width = snapStageValue(width, snapGridMm.value, page.value, stageSize.value.width, 'x')
    height = snapStageValue(height, snapGridMm.value, page.value, stageSize.value.width, 'y')
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
  emit('focus-block', block)
}

function handleStageClick(event: { target: Konva.Node }): void {
  if (event.target === event.target.getStage()) {
    emit('focus-block', null)
  }
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
  () => [props.focusedBlockId, visibleBlocks.value.length, props.readOnly],
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
      :read-only="readOnly"
    />
    <div v-if="rulerLabel" class="layout-canvas__ruler">{{ rulerLabel }}</div>
    <a-spin :spinning="rasterLoading">
      <UiEmpty
        v-if="!page"
        description="当前页尚未配置背景，请从无源生成或上传有源 PDF"
        class="layout-canvas__empty"
      />
      <div v-else class="layout-canvas__viewport">
        <Stage
          ref="stageRef"
          :config="{
            width: stageSize.width * zoom,
            height: stageSize.height * zoom,
            scaleX: zoom,
            scaleY: zoom,
          }"
          @mousedown="handleStageClick"
          @touchstart="handleStageClick"
        >
          <Layer>
            <KonvaImage v-if="bgImageConfig" :config="bgImageConfig" />
            <Rect
              v-else
              :config="{
                x: 0,
                y: 0,
                width: stageSize.width,
                height: stageSize.height,
                fill: '#f8fafc',
                stroke: '#e2e8f0',
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
                stroke: '#e2e8f0',
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
              v-if="!readOnly"
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
          </Layer>
        </Stage>
      </div>
      <p v-if="rasterError" class="layout-canvas__error">{{ rasterError }}</p>
    </a-spin>
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
  background: #fff;
  padding: 12px;

  &__viewport {
    overflow: auto;
    max-height: calc(100vh - 280px);
    min-height: 520px;
    background: var(--dp-surface-subtle);
    border-radius: var(--dp-radius-control);
    padding: 12px;
  }

  &__ruler {
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__empty {
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__error {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ant-color-error);
  }
}
</style>
