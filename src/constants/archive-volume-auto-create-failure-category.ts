import {
  ArchiveVolumeAutoCreateFailureCategoryCode,
} from '@/types/enums/archive-volume-auto-create-failure-category-enum'

export {
  ALL_ARCHIVE_VOLUME_AUTO_CREATE_FAILURE_CATEGORY_CODES,
  ArchiveVolumeAutoCreateFailureCategoryCode,
  ArchiveVolumeAutoCreateFailureCategoryDescription,
  ArchiveVolumeAutoCreateFailureCategoryHintDescription,
} from '@/types/enums/archive-volume-auto-create-failure-category-enum'

export const TERMINAL_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveVolumeAutoCreateFailureCategoryCode>([
  ArchiveVolumeAutoCreateFailureCategoryCode.CROSS_DEPARTMENT,
  ArchiveVolumeAutoCreateFailureCategoryCode.DEPARTMENT_MISSING,
  ArchiveVolumeAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE,
  ArchiveVolumeAutoCreateFailureCategoryCode.AGGREGATE_FAILED,
  ArchiveVolumeAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS,
  ArchiveVolumeAutoCreateFailureCategoryCode.UNKNOWN,
])

/** 须修正参考班级范围后方可重试自动建卷的失败类别 */
export const CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveVolumeAutoCreateFailureCategoryCode>([
  ArchiveVolumeAutoCreateFailureCategoryCode.CROSS_DEPARTMENT,
  ArchiveVolumeAutoCreateFailureCategoryCode.DEPARTMENT_MISSING,
  ArchiveVolumeAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE,
])

export function isArchiveVolumeAutoCreateFailureCategory(
  value: string | undefined | null,
): value is ArchiveVolumeAutoCreateFailureCategoryCode {
  return value === ArchiveVolumeAutoCreateFailureCategoryCode.CROSS_DEPARTMENT
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.DEPARTMENT_MISSING
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.AGGREGATE_FAILED
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.GATE_DEFERRED
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.PACKAGE_PENDING
    || value === ArchiveVolumeAutoCreateFailureCategoryCode.UNKNOWN
}
