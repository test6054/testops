import AudioOutlined from '@ant-design/icons-vue/AudioOutlined'
import CodeOutlined from '@ant-design/icons-vue/CodeOutlined'
import FileExcelOutlined from '@ant-design/icons-vue/FileExcelOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileMarkdownOutlined from '@ant-design/icons-vue/FileMarkdownOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import FilePptOutlined from '@ant-design/icons-vue/FilePptOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import FileUnknownOutlined from '@ant-design/icons-vue/FileUnknownOutlined'
import FileWordOutlined from '@ant-design/icons-vue/FileWordOutlined'
import FileZipOutlined from '@ant-design/icons-vue/FileZipOutlined'
import VideoCameraOutlined from '@ant-design/icons-vue/VideoCameraOutlined'

/** 支持点击预览的种类（决定弹窗内用哪种渲染器） */
export type FilePreviewKind = 'image' | 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text' | 'video' | 'audio'

/** 文件预览目标的统一抽象，兼容 fileSystem 节点等来源 */
export interface AttachmentPreviewTarget {
  /** fileSystem 节点 ID（与 storage 的 nodeId 一致） */
  fileId?: string | number
  /** 文件名（必填，用于展示与扩展名推断） */
  fileName: string
  /** 显式指定的扩展名，可空 */
  extension?: string
  /** MIME 类型，可空 */
  mimeType?: string
  /** 文件大小（字节），可空 */
  fileSize?: number
}

/** 图片可预览扩展名（含纸质档案扫描常见 TIFF） */
export const IMAGE_PREVIEW_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'svg',
  'webp',
  'ico',
  'tif',
  'tiff',
])
/** 视频可预览扩展名 */
export const VIDEO_PREVIEW_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov'])
/** 音频可预览扩展名 */
export const AUDIO_PREVIEW_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'])
/** 走 vue-office 渲染的扩展名 */
export const OFFICE_PREVIEW_EXTENSIONS = new Set<FilePreviewKind>(['docx', 'xlsx', 'pptx'])
/** 通用办公文档（决定 file-icon 主题归类） */
export const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'])
/** 压缩包扩展名 */
export const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])
/** 代码 / 配置类扩展名（也走文本预览） */
export const CODE_EXTENSIONS = new Set([
  'java',
  'py',
  'js',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'yml',
  'xml',
  'sh',
  'bash',
  'sql',
  'go',
  'rs',
  'rb',
  'php',
  'swift',
  'kt',
  'md',
])
/** 文本可预览扩展名（含代码） */
export const TEXT_PREVIEW_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  'txt',
  'log',
  'csv',
  'tsv',
])

/** 标准化扩展名（去掉前导点、转小写） */
export function normalizeExtension(extension?: string) {
  return (extension || '').replace(/^\./, '').toLowerCase()
}

/** 从文件名 / 显式扩展中解析最终扩展名 */
export function resolveFileExtension(fileName?: string, fallbackExtension?: string) {
  const normalizedFallback = normalizeExtension(fallbackExtension)
  if (normalizedFallback) return normalizedFallback

  const normalizedName = (fileName || '').trim().toLowerCase()
  if (!normalizedName.includes('.')) return ''
  if (normalizedName.endsWith('.tar.gz')) return 'tgz'
  return normalizeExtension(normalizedName.split('.').pop())
}

/** 根据文件名 / 扩展 / mime 推断 file-icon 的颜色主题 key */
export function resolveFileIconTheme(fileName?: string, fallbackExtension?: string, mimeType?: string) {
  const extension = resolveFileExtension(fileName, fallbackExtension)
  const mime = (mimeType || '').toLowerCase()

  if (extension === 'pdf' || mime.includes('pdf')) return 'pdf'
  if (IMAGE_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('image/')) return 'image'
  if (['doc', 'docx'].includes(extension)) return 'word'
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'excel'
  if (['ppt', 'pptx'].includes(extension)) return 'ppt'
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'zip'
  if (AUDIO_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('audio/')) return 'audio'
  if (VIDEO_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('video/')) return 'video'
  if (extension === 'md') return 'markdown'
  if (CODE_EXTENSIONS.has(extension)) return 'code'
  if (TEXT_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('text/')) return 'text'
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document'
  return 'unknown'
}

/** 根据文件名 / 扩展 / mime 返回对应的 ant-design 图标组件 */
export function resolveFileIcon(fileName?: string, fallbackExtension?: string, mimeType?: string) {
  const theme = resolveFileIconTheme(fileName, fallbackExtension, mimeType)
  const iconMap = {
    audio: AudioOutlined,
    code: CodeOutlined,
    document: FileTextOutlined,
    excel: FileExcelOutlined,
    image: FileImageOutlined,
    markdown: FileMarkdownOutlined,
    pdf: FilePdfOutlined,
    ppt: FilePptOutlined,
    text: FileTextOutlined,
    unknown: FileUnknownOutlined,
    video: VideoCameraOutlined,
    word: FileWordOutlined,
    zip: FileZipOutlined,
  } as const
  return iconMap[theme as keyof typeof iconMap] || FileOutlined
}

/** 文件大小格式化 */
export function formatFileSize(size?: number) {
  if (!size || size <= 0) return '大小未知'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** 旧版 Office 扩展名（走 edu-cad convert-legacy-office 转 OOXML 后预览） */
export const LEGACY_OFFICE_EXTENSIONS = new Set(['doc', 'wps', 'xls', 'ppt'])

/** OLE 复合文档魔数（.doc/.xls/.ppt 等旧版 Office 二进制头） */
export function isOleBinaryFormat(arrayBuffer: ArrayBuffer): boolean {
  const header = new Uint8Array(arrayBuffer.slice(0, 4))
  return header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0
}

/** OOXML（docx/xlsx/pptx）ZIP 容器魔数 PK */
export function isZipOoxmlFormat(arrayBuffer: ArrayBuffer): boolean {
  const header = new Uint8Array(arrayBuffer.slice(0, 2))
  return header[0] === 0x50 && header[1] === 0x4B
}

/** 根据 target 推断点击预览时该用哪种渲染方式；返回空串表示无法预览 */
export function resolvePreviewKind(target: AttachmentPreviewTarget): FilePreviewKind | '' {
  const extension = resolveFileExtension(target.fileName, target.extension)
  const mime = (target.mimeType || '').toLowerCase()

  if (IMAGE_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('image/')) return 'image'
  if (extension === 'pdf' || mime.includes('pdf')) return 'pdf'
  if (extension === 'doc' || extension === 'wps') return 'docx'
  if (extension === 'xls') return 'xlsx'
  if (extension === 'ppt') return 'pptx'
  if (extension === 'docx') return 'docx'
  if (extension === 'xlsx') return 'xlsx'
  if (extension === 'pptx') return 'pptx'
  if (TEXT_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('text/')) return 'text'
  if (VIDEO_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('video/')) return 'video'
  if (AUDIO_PREVIEW_EXTENSIONS.has(extension) || mime.startsWith('audio/')) return 'audio'
  return ''
}

/** 根据预览种类与 target 推算 Blob 的 MIME 类型（用于 createObjectURL） */
export function getMimeTypeForPreview(kind: FilePreviewKind, target: AttachmentPreviewTarget) {
  if (target.mimeType) return target.mimeType
  const extension = resolveFileExtension(target.fileName, target.extension)
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'image') {
    if (extension === 'svg') return 'image/svg+xml'
    if (extension === 'tif' || extension === 'tiff') return 'image/tiff'
    return `image/${extension === 'jpg' ? 'jpeg' : extension || 'png'}`
  }
  if (kind === 'video') return `video/${extension || 'mp4'}`
  if (kind === 'audio') return `audio/${extension || 'mpeg'}`
  return 'text/plain'
}
