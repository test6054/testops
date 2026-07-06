/**
 * 文件管理模块 API
 * 对接后端 FileSystemNodeController (/api/storage/filesystem)
 *
 * 注意：已整合FileUploadController和SimpleFileController的功能
 * 所有文件操作统一使用FileSystemNodeController
 */

import type { BlobDownloadResponse, ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { ExtractArchiveTaskStatusCode } from '@/types/enums/extract-archive-task-status-enum'
import type { FileSystemNodeTypeCode } from '@/types/enums/file-system-node-type-enum'
import http from '@/config/axios'
import { STORAGE_TOKEN } from '@/constants/storage-keys'
import { getTraceHeaders } from '@/utils/trace'


/** 文件信息 - 通用文件类型 */
export interface FileInfo {
  /** 文件ID */
  id: string
  /** 文件名 */
  fileName: string
  /** 文件大小 */
  fileSize: number
  /** 文件类型 */
  fileType: string
}

/** 文件系统节点响应DTO */
export interface FileSystemNodeResponseDTO {
  id: string
  parentId?: string
  nodeName: string
  nodeType: FileSystemNodeTypeCode
  fileMetadataId?: string
  fileSize?: number
  fileType?: string
  tenantId: string
  ownerId: string
  createTime: string
  updateTime?: string
}

/** 创建文件夹请求DTO */
export interface CreateFolderRequestDTO {
  parentId?: string
  folderName: string
  tenantId: string
  userId: string
}

/** 上传文件请求DTO */
export interface UploadFileRequestDTO {
  parentId?: string
  businessType: string
}

/** 获取子节点请求DTO */
export interface GetChildNodesRequestDTO {
  parentId?: string
  tenantId: string
  userId: string
}

/** 删除节点请求DTO */
export interface DeleteNodeRequestDTO {
  nodeId: string
  tenantId?: string
  userId?: string
}

/** 下载文件请求DTO */
export interface DownloadFileRequestDTO {
  nodeId: string
  tenantId?: string
  userId?: string
}

/** 预览文件请求DTO */
export interface PreviewFileRequestDTO {
  nodeId: string
  tenantId: string
  userId: string
}

/** 旧版 Office 转 OOXML 预览请求 - 对应 edu-cad /api/cad/office/convert-legacy-office */
export interface ConvertLegacyOfficeRequestDTO {
  nodeId: string
  tenantId?: string
  userId?: string
}

/** 重命名节点请求DTO */
export interface RenameNodeRequestDTO {
  nodeId: string
  newName: string
  tenantId: string
  userId: string
}

/** 异步解压任务状态 */
export interface ExtractArchiveTaskStatusDTO {
  taskId: string
  status: ExtractArchiveTaskStatusCode
  progress: number
  message?: string
  newlyExtracted?: boolean
  rootFolderId?: string
  extractedFileCount?: number
  extractedFolderCount?: number
  totalSize?: number
  warnings?: string[]
  processingTimeMs?: number
}

/** 批量上传响应DTO */
export interface BatchUploadResponseDTO {
  totalFiles: number
  successCount: number
  failedCount: number
  successFiles: FileSystemNodeResponseDTO[]
  failedFiles: Array<{
    fileName: string
    errorMessage: string
  }>
}

/** 目录树节点DTO */
export interface DirectoryTreeNodeDTO {
  id: string
  parentId?: string
  nodeName: string
  nodeType: FileSystemNodeTypeCode
  fileSize?: number
  fileType?: string
  createTime?: string
  updateTime?: string
  hasChildren?: boolean
  fullPath?: string
  children?: DirectoryTreeNodeDTO[]
}

/** 获取目录树请求DTO */
export interface GetDirectoryTreeRequestDTO {
  rootNodeId?: string
  maxDepth?: number
  tenantId: string
  userId: string
}


/**
 * 创建文件夹 - 对应后端 POST /api/storage/filesystem/folder
 */
export function createFolder(data: CreateFolderRequestDTO): Promise<FileSystemNodeResponseDTO> {
  return http.post<FileSystemNodeResponseDTO>('/api/storage/filesystem/folder', data)
}

/**
 * 上传文件配置选项
 */
export interface UploadFileOptions extends UploadFileRequestDTO {
  /** 上传进度回调 */
  onProgress?: (progressEvent: { percent: number, loaded: number, total: number }) => void
}

/**
 * 获取子节点列表 - 对应后端 POST /api/storage/filesystem/children
 */
export function getChildNodes(data: GetChildNodesRequestDTO): Promise<FileSystemNodeResponseDTO[]> {
  return http.post<FileSystemNodeResponseDTO[]>('/api/storage/filesystem/children', data)
}

/**
 * 删除节点 - 对应后端 POST /api/storage/filesystem/delete
 */
export function deleteNode(data: DeleteNodeRequestDTO): Promise<void> {
  return http.post<void>('/api/storage/filesystem/delete', data)
}

/**
 * 重命名节点 - 对应后端 POST /api/storage/filesystem/rename
 */
export function renameNode(data: RenameNodeRequestDTO): Promise<FileSystemNodeResponseDTO> {
  return http.post<FileSystemNodeResponseDTO>('/api/storage/filesystem/rename', data)
}

/**
 * 批量上传文件 - 对应后端 POST /api/storage/filesystem/batch-upload
 * 业务页请使用 platform/file 或 UiPlatformFileField。
 */
export function batchUploadFiles(files: File[], data: UploadFileRequestDTO): Promise<BatchUploadResponseDTO> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append(`files`, file)
  })
  if (data.parentId) {
    formData.append('parentId', data.parentId)
  }
  if (data.businessType) {
    formData.append('businessType', data.businessType)
  }
  return http.post<BatchUploadResponseDTO>('/api/storage/filesystem/batch-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 600000 // 10分钟超时
  })
}

/**
 * 上传文件夹 - 对应后端 POST /api/storage/filesystem/upload-folder
 */
export function uploadFolder(files: File[], data: {
  parentId?: string
  rootPath: string
  businessType: string
}): Promise<BatchUploadResponseDTO> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  if (data.parentId) {
    formData.append('parentId', data.parentId)
  }
  formData.append('rootPath', data.rootPath)
  formData.append('businessType', data.businessType)
  // tenantId 和 userId 由后端从用户上下文(UserHold)自动获取，无需前端传递

  return http.post<BatchUploadResponseDTO>('/api/storage/filesystem/upload-folder', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 600000 // 10分钟超时
  })
}

/**
 * 下载文件 - 对应后端 GET /api/storage/filesystem/download
 * 使用 GET 请求返回完整响应对象，用于浏览器下载
 */
export function downloadFile(
  data: DownloadFileRequestDTO,
  config?: ExtendedAxiosRequestConfig
): Promise<BlobDownloadResponse> {
  return http.download('/api/storage/filesystem/download', {
    nodeId: data.nodeId,
  }, config)
}

/**
 * 获取文件二进制数据 - 用于Office文档预览
 * 使用原生fetch避免axios拦截器干扰，返回ArrayBuffer供vue-office组件使用
 */
export async function getFileArrayBuffer(data: DownloadFileRequestDTO): Promise<ArrayBuffer> {
  // 从localStorage获取token
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) {
    throw new Error('未登录或登录已过期，请重新登录')
  }

  const requestUrl = new URL('/api/storage/filesystem/download', window.location.origin)
  requestUrl.searchParams.set('nodeId', data.nodeId)

  const response = await fetch(requestUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      ...getTraceHeaders()
    }
  })

  if (!response.ok) {
    throw new Error('文件下载失败，请稍后重试')
  }

  // 检查响应类型，确保不是接口错误响应
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    throw new Error('文件下载失败，请稍后重试')
  }

  return await response.arrayBuffer()
}

/**
 * 转换旧版 Office 并获取 OOXML 二进制 - 用于 .doc/.wps/.xls/.ppt 在线预览。
 * 后端 edu-cad LibreOffice 链路转 docx/xlsx/pptx 后供 vue-office 渲染。
 */
export async function convertLegacyOfficeArrayBuffer(
  data: ConvertLegacyOfficeRequestDTO,
): Promise<ArrayBuffer> {
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) {
    throw new Error('未登录或登录已过期，请重新登录')
  }

  const response = await fetch('/api/cad/office/convert-legacy-office', {
    method: 'POST',
    credentials: 'include',
    headers: {
      "Authorization": `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...getTraceHeaders(),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const errorData = await response.json()
      throw new Error(errorData.msg || `旧版 Office 转换失败: HTTP ${response.status}`)
    }
    throw new Error(`旧版 Office 转换失败: HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    const errorData = await response.json()
    throw new Error(errorData.msg || '旧版 Office 转换失败：服务器返回 JSON 错误')
  }

  return await response.arrayBuffer()
}

/**
 * 获取图片的 Blob URL - 用于需要认证的图片展示
 * 使用 fetch 带 Authorization header 获取图片，转换为 blob URL
 * 注意：调用方需要在不使用时调用 URL.revokeObjectURL 释放内存
 */
export async function getImageBlobUrl(nodeId: string): Promise<string> {
  const requestUrl = new URL('/api/storage/filesystem/download', window.location.origin)
  requestUrl.searchParams.set('nodeId', nodeId)

  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) {
    throw new Error('未登录或登录已过期')
  }

  const response = await fetch(requestUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      ...getTraceHeaders(),
    },
  })

  if (!response.ok) {
    throw new Error('图片加载失败，请稍后重试')
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/** 文件预览响应DTO */
export interface FilePreviewResponseDTO {
  nodeId: string
  fileName: string
  mimeType: string
  fileSize: number
  previewType: 'TEXT' | 'IMAGE' | 'PDF' | 'VIDEO' | 'AUDIO' | 'OFFICE' | 'UNKNOWN'
  content?: string // 预览内容（文本文件的内容，图片的base64等）
  previewUrl?: string // 预览URL（用于图片、视频等媒体文件）
  previewable: boolean
  errorMessage?: string
}

/**
 * 预览文件 - 对应后端 POST /api/storage/filesystem/preview
 * 后端返回ResultInfo<FilePreviewResponseDTO>，包含预览内容和元信息
 */
export function previewFile(data: PreviewFileRequestDTO): Promise<FilePreviewResponseDTO> {
  return http.post<FilePreviewResponseDTO>('/api/storage/filesystem/preview', data)
}

/**
 * 获取目录树 - 对应后端 POST /api/storage/filesystem/directory-tree
 */
export function getDirectoryTree(data: GetDirectoryTreeRequestDTO): Promise<DirectoryTreeNodeDTO[]> {
  return http.post<DirectoryTreeNodeDTO[]>('/api/storage/filesystem/directory-tree', data)
}

/**
 * 获取节点信息 - 对应后端 POST /api/storage/filesystem/node-info
 */
export function getNodeInfo(data: DeleteNodeRequestDTO): Promise<FileSystemNodeResponseDTO> {
  return http.post<FileSystemNodeResponseDTO>('/api/storage/filesystem/node-info', data)
}



/**
 * 重命名文件 - 对应后端 POST /api/storage/filesystem/rename
 */
export function renameFile(data: {
  nodeId: string
  newName: string
}): Promise<FileInfo> {
  return http.post<FileInfo>(`/api/storage/filesystem/rename`, data)
}


/** 解压压缩文件请求DTO */
export interface ExtractArchiveRequestDTO {
  /** 文件节点ID */
  nodeId: string
  /** 提交ID - 文件节点未回写 submissionId 时用于兜底 */
  submissionId?: string
  /** 租户ID */
  tenantId: string
  /** 用户ID */
  userId: string
  /** 实践ID - 用于构建目录结构 tenant-{tenantId}/practice-{practiceId} */
  practiceId: string
}

/** 解压压缩文件响应DTO */
export interface ExtractArchiveResponseDTO {
  /** 解压后的文件数量 */
  extractedFileCount: number
  /** 解压后的文件夹数量 */
  extractedFolderCount: number
  /** 解压后的总大小（字节） */
  totalSize: number
  /** 根文件夹ID */
  rootFolderId: string
  /** 解压后的文件列表 */
  files: FileSystemNodeResponseDTO[]
  /** 警告信息列表 */
  warnings?: string[]
}

/**
 * 解压压缩文件 - 对应后端 POST /api/storage/filesystem/extract-archive
 */
export function extractArchive(data: ExtractArchiveRequestDTO): Promise<ExtractArchiveResponseDTO> {
  return http.post<ExtractArchiveResponseDTO>('/api/storage/filesystem/extract-archive', data)
}

/**
 * 异步解压 - 返回任务ID
 */
export function startExtractArchiveAsync(data: ExtractArchiveRequestDTO): Promise<string> {
  return http.post<string>('/api/storage/filesystem/extract-archive/async', data)
}

/**
 * 查询解压任务状态 - 对应后端 POST /api/storage/filesystem/extract-archive/status
 */
export function getExtractArchiveStatus(data: {
  taskId: string
  tenantId: string
  userId: string
}): Promise<ExtractArchiveTaskStatusDTO> {
  return http.post<ExtractArchiveTaskStatusDTO>('/api/storage/filesystem/extract-archive/status', data)
}
