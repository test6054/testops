/** 归档共享材料引用类型 */
export enum ArchiveSharedMaterialRefTypeCode {
  UNIFIED_EXAM_PUBLIC = 'UNIFIED_EXAM_PUBLIC',
  MERGED_CLASS_SHARED = 'MERGED_CLASS_SHARED',
}

export const ALL_ARCHIVE_SHARED_MATERIAL_REF_TYPE_CODES: readonly ArchiveSharedMaterialRefTypeCode[] = [
  ArchiveSharedMaterialRefTypeCode.UNIFIED_EXAM_PUBLIC,
  ArchiveSharedMaterialRefTypeCode.MERGED_CLASS_SHARED,
]

