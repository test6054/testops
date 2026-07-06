import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveVolumeCatalogLineVO,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'

/** 目录行选中键：archiveCode 与后端材料 catalogCode 同义，无档号时回退行号。 */
export function resolveArchiveCatalogLineKey(line: ArchiveVolumeCatalogLineVO): string {
  const archiveCode = line.archiveCode?.trim()
  if (archiveCode) {
    return archiveCode
  }
  return String(line.lineNo)
}

/** 材料 / 缺项分组键：catalogCode 优先，否则 materialType。 */
export function resolveArchiveMaterialGroupKey(item: {
  catalogCode?: string
  materialType: ArchiveMaterialTypeCode
}): string {
  const catalogCode = item.catalogCode?.trim()
  if (catalogCode) {
    return catalogCode
  }
  return item.materialType
}

/** 判断材料是否归属目录选中键（与 MaterialTable 过滤口径一致）。 */
export function archiveMaterialBelongsToCatalogKey(
  material: ArchiveVolumeMaterialResponse,
  catalogKey: string,
): boolean {
  if (!catalogKey) {
    return true
  }
  return resolveArchiveMaterialGroupKey(material) === catalogKey
}

/** 判断完整性缺项是否对应该目录键。 */
export function archiveMissingItemTargetsCatalogKey(
  item: ArchiveIntegrityMissingItemVO,
  catalogKey: string,
): boolean {
  return resolveArchiveMaterialGroupKey(item) === catalogKey
}

/** 按目录键过滤材料；未选中时返回全量。 */
export function filterArchiveMaterialsByCatalogKey(
  materials: ArchiveVolumeMaterialResponse[],
  catalogKey?: string,
): ArchiveVolumeMaterialResponse[] {
  if (!catalogKey) {
    return materials
  }
  return materials.filter((item) => archiveMaterialBelongsToCatalogKey(item, catalogKey))
}
