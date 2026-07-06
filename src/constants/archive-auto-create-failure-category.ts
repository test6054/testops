import {
  ArchiveAutoCreateFailureCategoryCode,
} from '@/types/enums/archive-auto-create-failure-category-enum'

export {
  ALL_ARCHIVE_AUTO_CREATE_FAILURE_CATEGORY_CODES,
  ArchiveAutoCreateFailureCategoryCode,
  ArchiveAutoCreateFailureCategoryDescription,
  ArchiveAutoCreateFailureCategoryHintDescription,
} from '@/types/enums/archive-auto-create-failure-category-enum'

export const TERMINAL_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveAutoCreateFailureCategoryCode>([
  ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT,
  ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING,
  ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE,
  ArchiveAutoCreateFailureCategoryCode.AGGREGATE_FAILED,
  ArchiveAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS,
  ArchiveAutoCreateFailureCategoryCode.UNKNOWN,
])

/** 须修正参考班级范围后方可重试自动建卷的失败类别 */
export const CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveAutoCreateFailureCategoryCode>([
  ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT,
  ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING,
  ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE,
])

export function isArchiveAutoCreateFailureCategory(
  value: string | undefined | null,
): value is ArchiveAutoCreateFailureCategoryCode {
  return value === ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT
    || value === ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING
    || value === ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE
    || value === ArchiveAutoCreateFailureCategoryCode.AGGREGATE_FAILED
    || value === ArchiveAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS
    || value === ArchiveAutoCreateFailureCategoryCode.GATE_DEFERRED
    || value === ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING
    || value === ArchiveAutoCreateFailureCategoryCode.UNKNOWN
}
