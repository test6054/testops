/**
 * 统一文件下载工具
 * 所有文件下载功能统一使用此工具函数
 */

import type { AxiosProgressEvent } from 'axios'
import type { BlobDownloadResponse, ExtendedAxiosRequestConfig } from '@/config/axios/types'
import message from 'ant-design-vue/es/message'
import { downloadFile } from '@/apis/edu/file-management'
import { showUserError } from '@/utils/error-handler'

/** 文件项接口 - 统一下载接口 */
export interface FileItem {
  fileId: string | number
  fileName?: string
}

/** 下载扩展选项，用于注入进度、生命周期钩子 */
export interface DownloadOptions {
  onBeforeDownload?: (file: FileItem) => void
  onProgress?: (event: AxiosProgressEvent) => void
  onAfterDownload?: (file: FileItem) => void
  onError?: (error: unknown) => void
  axiosConfig?: Partial<ExtendedAxiosRequestConfig>
  showSuccessMessage?: boolean
  showErrorMessage?: boolean
  successMessage?: string
  errorMessage?: string
}


/**
 * 从 Content-Disposition 响应头解析文件名
 * 支持 filename*=UTF-8'' 格式（RFC 5987）和传统 filename= 格式
 */
function parseFileNameFromHeaders(headers: Record<string, unknown>, fallback: string): string {
  const contentDisposition = headers?.['content-disposition']
  if (typeof contentDisposition !== 'string') return fallback

  // 优先匹配 filename*=UTF-8''xxx 格式
  const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/)
  if (filenameStarMatch?.[1]) {
    return decodeURIComponent(filenameStarMatch[1])
  }

  // 回退匹配 filename="xxx" 或 filename=xxx 格式
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (filenameMatch?.[1]) {
    return decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
  }

  return fallback
}

/**
 * 校验 Blob 响应是否有效
 * 检查状态码、Blob 大小、是否为错误 JSON/text 响应
 *
 * @returns 错误消息，无错误返回 null
 */
async function validateBlobResponse(response: BlobDownloadResponse): Promise<string | null> {
  if (response.status !== 200) {
    return '文件暂不能下载，请稍后重试'
  }
  if (!response.data || response.data.size === 0) {
    return '文件内容为空，暂不能下载'
  }
  // 服务端可能返回 JSON 错误信息而非真正的文件
  if (response.data.type === 'text/plain' || response.data.type === 'application/json') {
    await response.data.text()
    return '文件暂不能下载，请稍后重试'
  }
  return null
}

/**
 * 从 Blob 创建下载链接并触发浏览器下载
 */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}


/** 通用 Blob 下载选项 */
export interface BlobDownloadOptions {
  /** 是否显示成功提示，默认 false */
  showSuccessMessage?: boolean
  /** 是否显示错误提示，默认 true */
  showErrorMessage?: boolean
  /** 自定义成功消息 */
  successMessage?: string
  /** 自定义错误消息 */
  errorMessage?: string
}

/**
 * 通用 Blob 下载
 * 处理任意接口返回的 Blob 响应（导出 Excel、下载模板等）
 * 统一了响应校验、文件名解析、错误处理逻辑
 *
 * @param apiCall 返回原始 axios 响应的 API 调用函数（通过 http.download 或 http.downloadByPost）
 * @param defaultFileName 默认文件名（含扩展名），当 Content-Disposition 无文件名时使用
 * @param options 下载选项
 */
export async function handleBlobDownload(
  apiCall: () => Promise<BlobDownloadResponse>,
  defaultFileName: string,
  options: BlobDownloadOptions = {},
): Promise<void> {
  const {
    showSuccessMessage = false,
    showErrorMessage = true,
    successMessage = '下载成功',
    errorMessage = '下载失败，请稍后重试',
  } = options

  try {
    const response = await apiCall()

    // 校验响应
    const validationError = await validateBlobResponse(response)
    if (validationError) {
      if (showErrorMessage) message.error(validationError)
      return
    }

    // 解析文件名
    const fileName = parseFileNameFromHeaders(response.headers, defaultFileName)

    // 触发下载
    triggerBlobDownload(new Blob([response.data]), fileName)

    if (showSuccessMessage) message.success(successMessage)
  } catch (error) {
    if (showErrorMessage) showUserError(error, errorMessage)
  }
}

/** 处理文件下载（文件存储服务专用） */
export async function handleDownloadFile(file: FileItem, options: DownloadOptions = {}) {
  const {
    onBeforeDownload,
    onProgress,
    onAfterDownload,
    onError,
    axiosConfig,
    showSuccessMessage = true,
    showErrorMessage = true,
    successMessage = '文件下载成功',
    errorMessage = '文件下载失败，请稍后重试'
  } = options

  if (file.fileId === undefined || file.fileId === null || file.fileId === '') {
    if (showErrorMessage) {
      message.error('未找到可下载的文件')
    }
    return
  }

  const normalizedFile: FileItem = {
    fileId: String(file.fileId),
    fileName: file.fileName
  }

  try {
    onBeforeDownload?.(normalizedFile)

    const downloadConfig: Partial<ExtendedAxiosRequestConfig> = {
      ...axiosConfig
    }

    if (onProgress) {
      downloadConfig.onDownloadProgress = (event: AxiosProgressEvent) => {
        axiosConfig?.onDownloadProgress?.(event)
        onProgress(event)
      }
    }

    const response = await downloadFile({
      nodeId: String(normalizedFile.fileId)
    }, downloadConfig)

    // 统一校验响应
    const validationError = await validateBlobResponse(response)
    if (validationError) {
      if (showErrorMessage) message.error(validationError)
      return
    }

    // 解析文件名并触发下载
    const fileName = parseFileNameFromHeaders(response.headers, normalizedFile.fileName || 'download')
    normalizedFile.fileName = fileName
    triggerBlobDownload(response.data, fileName)

    onAfterDownload?.(normalizedFile)
    if (showSuccessMessage) {
      message.success(successMessage)
    }
  } catch (error) {
    onError?.(error)
    if (showErrorMessage) {
      showUserError(error, errorMessage)
    }
  }
}

/**
 * 批量下载文件
 * @param files 文件列表
 * @param options
 */
export async function batchDownloadFiles(files: FileItem[], options?: DownloadOptions) {
  if (!files || files.length === 0) {
    message.warning('没有文件可下载')
    return
  }

  message.info(`开始下载 ${files.length} 个文件...`)

  let successCount = 0
  let failCount = 0

  for (const file of files) {
    try {
      await handleDownloadFile(file, options)
      successCount++
      // 避免同时下载太多文件，添加小延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      failCount++
    }
  }

  if (failCount === 0) {
    message.success(`所有文件下载完成 (${successCount}/${files.length})`)
  } else {
    message.warning(`部分文件下载失败 (成功: ${successCount}, 失败: ${failCount})`)
  }
}
