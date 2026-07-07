import type { AttachmentPreviewTarget, FilePreviewKind } from '@/utils/file-preview'
import antMessage from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { convertLegacyOfficeArrayBuffer, getFileArrayBuffer, previewFile } from '@/apis/edu/file-management'
import { ErrorHandler } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import {
  formatFileSize,
  getMimeTypeForPreview,
  isOleBinaryFormat,
  isZipOoxmlFormat,
  LEGACY_OFFICE_EXTENSIONS,
  OFFICE_PREVIEW_EXTENSIONS,
  resolveFileExtension,
  resolvePreviewKind
} from '@/utils/file-preview'

/**
 * 文件预览 / 下载能力 composable。
 * 弹窗状态交给 <FilePreviewDialog> 渲染；支持 edu-storage 节点与旧版 Office（.doc/.xls/.ppt）转 OOXML 预览。
 */
export function useFilePreview() {
  const filePreviewOpen = ref(false)
  const filePreviewLoading = ref(false)
  const filePreviewError = ref('')
  const filePreviewKind = ref<FilePreviewKind | ''>('')
  const filePreviewTitle = ref('')
  const filePreviewUrl = ref('')
  const filePreviewText = ref('')
  const filePreviewOfficeData = ref<ArrayBuffer | null>(null)
  const currentPreviewTarget = ref<AttachmentPreviewTarget | null>(null)

  const filePreviewMeta = computed(() => {
    const target = currentPreviewTarget.value
    if (!target) return '在线预览'
    const extension = resolveFileExtension(target.fileName, target.extension)
    const typeText = extension ? extension.toUpperCase() : '文件'
    return `${typeText} · ${formatFileSize(target.fileSize)}`
  })

  function revokePreviewUrl() {
    if (filePreviewUrl.value) {
      window.URL.revokeObjectURL(filePreviewUrl.value)
      filePreviewUrl.value = ''
    }
  }

  function resetPreviewContent() {
    revokePreviewUrl()
    filePreviewError.value = ''
    filePreviewKind.value = ''
    filePreviewText.value = ''
    filePreviewOfficeData.value = null
  }

  function closePreview() {
    filePreviewOpen.value = false
    filePreviewLoading.value = false
    currentPreviewTarget.value = null
    resetPreviewContent()
  }

  async function loadArrayBufferForTarget(target: AttachmentPreviewTarget) {
    if (!target.fileId) {
      throw new Error('当前文件暂不支持预览')
    }
    return await getFileArrayBuffer({
      nodeId: String(target.fileId),
    })
  }

  async function convertLegacyOfficeForTarget(target: AttachmentPreviewTarget): Promise<ArrayBuffer> {
    return await convertLegacyOfficeArrayBuffer({
      nodeId: String(target.fileId),
    })
  }

  /**
   * 加载 Office 预览数据：旧版扩展名或 OOXML 壳内 OLE 内容均走 edu-cad 转换链。
   */
  async function loadOfficePreviewData(target: AttachmentPreviewTarget): Promise<ArrayBuffer> {
    const extension = resolveFileExtension(target.fileName, target.extension)
    if (LEGACY_OFFICE_EXTENSIONS.has(extension)) {
      return await convertLegacyOfficeForTarget(target)
    }

    const arrayBuffer = await loadArrayBufferForTarget(target)
    if (isOleBinaryFormat(arrayBuffer)) {
      return await convertLegacyOfficeForTarget(target)
    }
    if (!isZipOoxmlFormat(arrayBuffer)) {
      throw new Error('文件格式无法识别，请下载后查看')
    }
    return arrayBuffer
  }

  async function loadTextPreview(target: AttachmentPreviewTarget) {
    if (target.fileId) {
      try {
        const response = await previewFile({
          nodeId: String(target.fileId),
        })
        if (response.previewable && response.content) {
          filePreviewText.value = response.content
          return
        }
      }
      catch {
        // 文本预览接口失败时继续尝试按二进制读取
      }
    }

    const arrayBuffer = await loadArrayBufferForTarget(target)
    filePreviewText.value = new TextDecoder('utf-8').decode(arrayBuffer)
  }

  async function downloadAttachmentTarget(target: AttachmentPreviewTarget) {
    try {
      if (!target.fileId) {
        antMessage.warning('当前文件暂不支持下载')
        return
      }
      await handleDownloadFile(
        { fileId: String(target.fileId), fileName: target.fileName },
        { showSuccessMessage: false },
      )
    }
    catch (error) {
      ErrorHandler.handle(error)
    }
  }

  async function openPreview(target: AttachmentPreviewTarget) {
    const previewKind = resolvePreviewKind(target)
    if (!previewKind) {
      resetPreviewContent()
      currentPreviewTarget.value = target
      filePreviewTitle.value = target.fileName
      filePreviewKind.value = ''
      const extension = resolveFileExtension(target.fileName, target.extension)
      const ext = extension ? extension.toUpperCase() : '该格式'
      filePreviewError.value = `${ext} 文件暂不支持在线预览，您可以下载到本地用对应软件打开。`
      filePreviewOpen.value = true
      filePreviewLoading.value = false
      return
    }

    resetPreviewContent()
    currentPreviewTarget.value = target
    filePreviewTitle.value = target.fileName
    filePreviewKind.value = previewKind
    filePreviewOpen.value = true
    filePreviewLoading.value = true

    try {
      if (previewKind === 'text') {
        await loadTextPreview(target)
        return
      }

      if (OFFICE_PREVIEW_EXTENSIONS.has(previewKind)) {
        filePreviewOfficeData.value = await loadOfficePreviewData(target)
        return
      }

      const arrayBuffer = await loadArrayBufferForTarget(target)
      const blob = new Blob([arrayBuffer], { type: getMimeTypeForPreview(previewKind, target) })
      filePreviewUrl.value = window.URL.createObjectURL(blob)
    }
    catch (error) {
      const extension = resolveFileExtension(target.fileName, target.extension)
      if (LEGACY_OFFICE_EXTENSIONS.has(extension) || OFFICE_PREVIEW_EXTENSIONS.has(previewKind)) {
        filePreviewError.value = error instanceof Error
          ? `旧版 Office 转换失败：${error.message}`
          : '旧版 Office 转换失败，请下载后查看'
      }
      else {
        filePreviewError.value = '文件预览失败，您可以尝试下载到本地查看。'
      }
      filePreviewKind.value = ''
      console.warn('[useFilePreview] preview failed', error)
    }
    finally {
      filePreviewLoading.value = false
    }
  }

  async function downloadCurrentTarget() {
    if (!currentPreviewTarget.value) return
    await downloadAttachmentTarget(currentPreviewTarget.value)
  }

  function handleOfficePreviewError() {
    filePreviewError.value = '文档渲染失败，可下载后查看'
  }

  return {
    filePreviewOpen,
    filePreviewLoading,
    filePreviewError,
    filePreviewKind,
    filePreviewTitle,
    filePreviewUrl,
    filePreviewText,
    filePreviewOfficeData,
    currentPreviewTarget,
    filePreviewMeta,
    openPreview,
    closePreview,
    downloadCurrentTarget,
    handleOfficePreviewError,
  }
}

export type FilePreviewApi = ReturnType<typeof useFilePreview>
