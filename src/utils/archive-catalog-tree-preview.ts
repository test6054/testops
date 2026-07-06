import type { ArchiveVolumeCatalogLineVO } from '@/apis/mark/archive-volume'

export interface ArchiveCatalogTreeGroup {
  category: string
  entries: ArchiveVolumeCatalogLineVO[]
}

/** 按档号前缀分组目录行，供只读 catalog-tree 预览（无后端 category 字段时的展示分组）。 */
export function groupArchiveCatalogLinesForPreview(
  lines: ArchiveVolumeCatalogLineVO[],
): ArchiveCatalogTreeGroup[] {
  if (lines.length === 0) {
    return []
  }
  const groupMap = new Map<string, ArchiveVolumeCatalogLineVO[]>()
  for (const line of lines) {
    const category = resolveCatalogPreviewCategory(line.archiveCode)
    const bucket = groupMap.get(category)
    if (bucket) {
      bucket.push(line)
    }
    else {
      groupMap.set(category, [line])
    }
  }
  return Array.from(groupMap.entries()).map(([category, entries]) => ({
    category,
    entries: [...entries].sort((left, right) => left.lineNo - right.lineNo),
  }))
}

function resolveCatalogPreviewCategory(archiveCode?: string): string {
  const code = archiveCode?.trim()
  if (!code) {
    return '目录条目'
  }
  const dashIndex = code.indexOf('-')
  if (dashIndex > 0) {
    return code.slice(0, dashIndex)
  }
  const dotIndex = code.indexOf('.')
  if (dotIndex > 0) {
    return code.slice(0, dotIndex)
  }
  return '目录条目'
}

/** 页次展示：优先 pageRange，否则占位。 */
export function formatCatalogPreviewPageCount(pageRange?: string): string {
  const value = pageRange?.trim()
  if (!value) {
    return '—'
  }
  return value.includes('页') ? value : `${value}页`
}
