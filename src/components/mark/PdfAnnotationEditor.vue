<template>
  <div class="pdf-editor">
    <div class="pdf-editor__toolbar">
      <a-space>
        <UiButton size="sm" :variant="tool === 'text' ? 'primary' : 'outline'" @click="tool = 'text'">
          <template #icon><EditOutlined /></template>
          文字标注
        </UiButton>
        <UiButton size="sm" :variant="tool === 'rect' ? 'primary' : 'outline'" @click="tool = 'rect'">
          <template #icon><BorderOutlined /></template>
          矩形框
        </UiButton>
        <UiButton size="sm" variant="outline" @click="undoLast">
          <template #icon><UndoOutlined /></template>
          撤销
        </UiButton>
        <UiButton size="sm" variant="outline" @click="clearAll">清空标注</UiButton>
        <a-divider type="vertical" />
        <UiButton size="sm" variant="primary" :loading="saving" @click="handleSave">
          <template #icon><SaveOutlined /></template>
          保存并覆盖
        </UiButton>
      </a-space>
      <span class="pdf-editor__hint">
        当前工具：{{ tool === 'text' ? '文字标注（点击页面添加）' : '矩形框（拖拽绘制）' }}
      </span>
    </div>
    <div v-if="loading" class="pdf-editor__loading">
      <a-spin tip="加载PDF中…" />
    </div>
    <div
      v-else
      ref="canvasContainer"
      class="pdf-editor__canvas-wrap"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    >
      <canvas ref="mainCanvas" class="pdf-editor__canvas" />
      <canvas ref="overlayCanvas" class="pdf-editor__canvas pdf-editor__overlay" />
    </div>
    <a-modal
      v-model:open="textModalOpen"
      title="添加文字标注"
      ok-text="添加"
      cancel-text="取消"
      @ok="confirmAddTextAnnotation"
    >
      <a-input v-model:value="pendingText" placeholder="请输入标注文字" @press-enter="confirmAddTextAnnotation" />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import BorderOutlined from '@ant-design/icons-vue/BorderOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import UndoOutlined from '@ant-design/icons-vue/UndoOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, ref, shallowRef, watch } from 'vue'
import { UiButton } from '@/components/ui-guide/ui'
import { showUserError } from '@/utils/error-handler'
import 'pdfjs-dist/build/pdf.worker.mjs'

defineOptions({ name: 'PdfAnnotationEditor' })

const props = defineProps<{
  pdfFileId: string
}>()

const emit = defineEmits<{
  saved: [fileId: string]
}>()

interface Annotation {
  type: 'text' | 'rect'
  x: number
  y: number
  w: number
  h: number
  text?: string
  color?: string
  pageIndex: number
}

const tool = ref<'text' | 'rect'>('text')
const loading = ref(true)
const saving = ref(false)
const annotations = shallowRef<Annotation[]>([])
const mainCanvas = ref<HTMLCanvasElement>()
const overlayCanvas = ref<HTMLCanvasElement>()
const canvasContainer = ref<HTMLDivElement>()
const drawing = ref(false)
const startX = ref(0)
const startY = ref(0)
const textModalOpen = ref(false)
const pendingText = ref('')
const pendingTextX = ref(0)
const pendingTextY = ref(0)

// PDF渲染
let pdfBytes: ArrayBuffer | null = null

async function loadPdf() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    // 拉取PDF bytes
    const url = new URL('/api/storage/filesystem/download', window.location.origin)
    url.searchParams.set('nodeId', props.pdfFileId)
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) {
      message.error('PDF加载失败')
      return
    }
    pdfBytes = await resp.arrayBuffer()

    // 使用pdfjs渲染
    const { getDocument } = await import('pdfjs-dist')
    const loadingTask = getDocument({ data: pdfBytes.slice(0) })
    const pdfDoc = await loadingTask.promise

    // 渲染首页到canvas
    const page = await pdfDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1.5 })

    const canvas = mainCanvas.value!
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // overlay canvas same size
    const overlay = overlayCanvas.value!
    overlay.width = viewport.width
    overlay.height = viewport.height
    redrawOverlay()
  } catch (e: unknown) {
    showUserError(e, 'PDF加载失败')
  } finally {
    loading.value = false
  }
}

// Overlay绘制
function redrawOverlay() {
  const canvas = overlayCanvas.value!
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const a of annotations.value) {
    ctx.strokeStyle = a.color ?? '#1677ff'
    ctx.lineWidth = 2
    if (a.type === 'rect') {
      ctx.strokeRect(a.x, a.y, a.w, a.h)
    } else if (a.type === 'text' && a.text) {
      const fontSize = 14
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = a.color ?? '#1677ff'
      ctx.fillText(a.text, a.x, a.y + fontSize)
      // underline
      const w = ctx.measureText(a.text).width
      ctx.beginPath()
      ctx.moveTo(a.x, a.y + fontSize + 2)
      ctx.lineTo(a.x + w, a.y + fontSize + 2)
      ctx.stroke()
    }
  }
}

// Mouse handlers
function onMouseDown(e: MouseEvent) {
  if (!overlayCanvas.value) return
  const rect = overlayCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  if (tool.value === 'text') {
    pendingText.value = ''
    pendingTextX.value = x
    pendingTextY.value = y
    textModalOpen.value = true
  } else if (tool.value === 'rect') {
    drawing.value = true
    startX.value = x
    startY.value = y
  }
}
function onMouseMove(e: MouseEvent) {
  if (!drawing.value || !overlayCanvas.value) return
  const rect = overlayCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const ctx = overlayCanvas.value.getContext('2d')!
  ctx.clearRect(0, 0, overlayCanvas.value.width, overlayCanvas.value.height)
  redrawOverlay()
  ctx.strokeStyle = '#1677ff'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.strokeRect(startX.value, startY.value, x - startX.value, y - startY.value)
  ctx.setLineDash([])
}
function onMouseUp(e: MouseEvent) {
  if (!drawing.value || !overlayCanvas.value) return
  drawing.value = false
  const rect = overlayCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = x - startX.value
  const h = y - startY.value
  if (Math.abs(w) > 5 && Math.abs(h) > 5) {
    annotations.value = [...annotations.value, {
      type: 'rect',
      x: startX.value,
      y: startY.value,
      w,
      h,
      color: '#1677ff',
      pageIndex: 0,
    }]
  }
  redrawOverlay()
}

function confirmAddTextAnnotation() {
  const text = pendingText.value.trim()
  if (!text) {
    message.warning('请输入标注文字')
    return
  }
  annotations.value = [...annotations.value, {
    type: 'text',
    x: pendingTextX.value,
    y: pendingTextY.value,
    w: 0,
    h: 0,
    text,
    color: '#1677ff',
    pageIndex: 0,
  }]
  textModalOpen.value = false
  redrawOverlay()
}

function undoLast() {
  annotations.value = annotations.value.slice(0, -1)
  redrawOverlay()
}

function clearAll() {
  annotations.value = []
  redrawOverlay()
}

// Save: merge annotations into PDF using pdf-lib
async function handleSave() {
  if (!pdfBytes || annotations.value.length === 0) {
    message.warning('没有可保存的标注')
    return
  }
  saving.value = true
  try {
    const { PDFDocument, rgb } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    if (pages.length === 0) {
      message.error('PDF无页面')
      return
    }

    const scaleFactor = 1.5 // match pdfjs rendering scale
    for (const a of annotations.value) {
      const page = pages[a.pageIndex] ?? pages[0]
      const pageHeight = page.getHeight()
      // Convert canvas coords back to PDF coords (y-axis inverted)
      const pdfX = a.x / scaleFactor
      const pdfY = pageHeight - (a.y / scaleFactor)
      if (a.type === 'text' && a.text) {
        page.drawText(a.text, {
          x: pdfX,
          y: pdfY - 12,
          size: 12,
          color: rgb(0.13, 0.47, 1.0),
        })
      } else if (a.type === 'rect') {
        page.drawRectangle({
          x: pdfX,
          y: pdfY - a.h / scaleFactor,
          width: a.w / scaleFactor,
          height: a.h / scaleFactor,
          borderColor: rgb(0.13, 0.47, 1.0),
          borderWidth: 1.5,
        })
      }
    }
    const modifiedBytes = await pdfDoc.save()
    const modifiedBuffer = new ArrayBuffer(modifiedBytes.byteLength)
    new Uint8Array(modifiedBuffer).set(modifiedBytes)
    const blob = new Blob([modifiedBuffer], { type: 'application/pdf' })

    // Upload to storage
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', blob, 'edited-paper.pdf')
    const uploadResp = await fetch('/api/storage/filesystem/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!uploadResp.ok) {
      message.error('上传失败')
      return
    }
    const uploadResult = await uploadResp.json()
    const newFileId = String(uploadResult?.data?.id ?? uploadResult?.data?.nodeId ?? '')
    if (!newFileId) {
      message.error('未获取到文件ID')
      return
    }

    message.success('PDF已保存并覆盖原文件')
    emit('saved', newFileId)
  } catch (e: unknown) {
    showUserError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (props.pdfFileId) {
    void loadPdf()
  }
})

watch(() => props.pdfFileId, () => {
  if (props.pdfFileId) {
    void loadPdf()
  }
})
</script>

<style scoped>
.pdf-editor { display: flex; flex-direction: column; gap: 8px; }
.pdf-editor__toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pdf-editor__hint { color: var(--dp-text-secondary); font-size: 12px; }
.pdf-editor__loading { padding: 40px; text-align: center; }
.pdf-editor__canvas-wrap { position: relative; border: 1px solid #d9d9d9; overflow: auto; background: #f5f5f5; }
.pdf-editor__canvas { display: block; max-width: 100%; }
.pdf-editor__overlay { position: absolute; top: 0; left: 0; cursor: crosshair; }
</style>
