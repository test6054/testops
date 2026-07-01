import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { getFileArrayBuffer } from '@/apis/edu/file-management'

GlobalWorkerOptions.workerSrc = pdfWorker

const rasterCache = new Map<string, HTMLCanvasElement>()
const objectUrlCache = new Map<string, string>()

function cacheKey(fileId: string, pageNo: number, targetWidth: number): string {
  return `${fileId}:${pageNo}:${targetWidth}`
}

function isPdfBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4))
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

async function renderImageToCanvas(
  buffer: ArrayBuffer,
  targetWidth: number,
): Promise<HTMLCanvasElement> {
  const blob = new Blob([buffer])
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('页背景图片解码失败'))
      img.src = url
    })
    const scale = targetWidth / image.naturalWidth
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = Math.round(image.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('画布上下文初始化失败')
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function renderPdfPageToCanvas(
  buffer: ArrayBuffer,
  pageNo: number,
  targetWidth: number,
): Promise<HTMLCanvasElement> {
  const pdf = await getDocument({ data: buffer }).promise
  const page = await pdf.getPage(pageNo)
  const viewport = page.getViewport({ scale: 1 })
  const scale = targetWidth / viewport.width
  const scaledViewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(scaledViewport.width)
  canvas.height = Math.floor(scaledViewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('PDF 页渲染上下文初始化失败')
  }
  await page.render({ canvas, canvasContext: ctx, viewport: scaledViewport }).promise
  return canvas
}

/**
 * 将页背景文件栅格化为 Konva 可用画布；PDF 按 pageNo 取页，图片直接缩放。
 */
export function useLayoutPageRaster() {
  const loading = ref(false)
  const errorMessage = shallowRef<string | null>(null)

  async function loadPageRaster(
    backgroundFileId: string,
    pageNo: number,
    targetWidth: number,
  ): Promise<HTMLCanvasElement | null> {
    if (!backgroundFileId) {
      return null
    }
    const key = cacheKey(backgroundFileId, pageNo, targetWidth)
    const cached = rasterCache.get(key)
    if (cached) {
      return cached
    }
    loading.value = true
    errorMessage.value = null
    try {
      const buffer = await getFileArrayBuffer({ nodeId: backgroundFileId })
      const canvas = isPdfBuffer(buffer)
        ? await renderPdfPageToCanvas(buffer, pageNo, targetWidth)
        : await renderImageToCanvas(buffer, targetWidth)
      rasterCache.set(key, canvas)
      return canvas
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '页背景加载失败'
      return null
    } finally {
      loading.value = false
    }
  }

  function clearRasterCache(): void {
    rasterCache.clear()
    for (const url of objectUrlCache.values()) {
      URL.revokeObjectURL(url)
    }
    objectUrlCache.clear()
  }

  onBeforeUnmount(() => {
    clearRasterCache()
  })

  return {
    loading,
    errorMessage,
    loadPageRaster,
    clearRasterCache,
  }
}
