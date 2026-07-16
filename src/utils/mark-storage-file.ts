import type { FileSystemNodeResponseDTO } from '@/apis/edu/file-management'
import { getNodeInfo } from '@/apis/edu/file-management'
import { showUserError } from '@/utils/error-handler'

export function requireUploadFileName(node: FileSystemNodeResponseDTO, file: File): string | null {
  const name = (node.nodeName ?? '').trim() || file.name.trim()
  if (!name) {
    showUserError(null, '上传响应缺少文件名')
    return null
  }
  return name
}

export async function resolveStorageNodeName(nodeId: string): Promise<string | null> {
  const info = await getNodeInfo({ nodeId })
  const name = (info.nodeName ?? '').trim()
  if (!name) {
    showUserError(null, '存储节点缺少文件名')
    return null
  }
  return name
}

export async function resolveStorageNodeNames(nodeIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(nodeIds.filter((id) => id.trim() !== ''))]
  const map = new Map<string, string>()
  await Promise.all(
    unique.map(async (nodeId) => {
      const name = await resolveStorageNodeName(nodeId)
      if (name) {
        map.set(nodeId, name)
      }
    }),
  )
  return map
}

export async function hydrateTemplatePageFileNames(
  rows: Array<{ templateFileId?: string, templateFileName?: string }>,
): Promise<boolean> {
  const pendingIds = rows
    .filter((row) => row.templateFileId && !row.templateFileName?.trim())
    .map((row) => row.templateFileId!)
  if (pendingIds.length === 0) {
    return true
  }
  const nameMap = await resolveStorageNodeNames(pendingIds)
  for (const row of rows) {
    if (!row.templateFileId) {
      continue
    }
    const resolved = nameMap.get(row.templateFileId) ?? row.templateFileName?.trim()
    if (!resolved) {
      showUserError(null, '模板文件缺少文件名')
      return false
    }
    row.templateFileName = resolved
  }
  return true
}
