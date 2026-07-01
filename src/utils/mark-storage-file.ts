import type { FileSystemNodeResponseDTO } from '@/apis/edu/file-management'
import { getNodeInfo } from '@/apis/edu/file-management'

export function requireUploadFileName(node: FileSystemNodeResponseDTO, file: File): string {
  const name = (node.nodeName ?? '').trim() || file.name.trim()
  if (!name) {
    throw new Error('上传响应缺少文件名')
  }
  return name
}

export async function resolveStorageNodeName(nodeId: string): Promise<string> {
  const info = await getNodeInfo({ nodeId })
  const name = (info.nodeName ?? '').trim()
  if (!name) {
    throw new Error(`存储节点 ${nodeId} 缺少文件名`)
  }
  return name
}

export async function resolveStorageNodeNames(nodeIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(nodeIds.filter((id) => id.trim() !== ''))]
  const map = new Map<string, string>()
  await Promise.all(
    unique.map(async (nodeId) => {
      map.set(nodeId, await resolveStorageNodeName(nodeId))
    }),
  )
  return map
}

export async function hydrateTemplatePageFileNames(
  rows: Array<{ templateFileId?: string; templateFileName?: string }>,
): Promise<void> {
  const pendingIds = rows
    .filter((row) => row.templateFileId && !row.templateFileName?.trim())
    .map((row) => row.templateFileId!)
  if (pendingIds.length === 0) {
    return
  }
  const nameMap = await resolveStorageNodeNames(pendingIds)
  for (const row of rows) {
    if (!row.templateFileId) {
      continue
    }
    const resolved = nameMap.get(row.templateFileId) ?? row.templateFileName?.trim()
    if (!resolved) {
      throw new Error(`模板文件 ${row.templateFileId} 缺少文件名`)
    }
    row.templateFileName = resolved
  }
}
