export type ArchiveAutoCreateFailureCategory =
  | 'CROSS_DEPARTMENT'
  | 'DEPARTMENT_MISSING'
  | 'CLASS_INFO_UNAVAILABLE'
  | 'AGGREGATE_FAILED'
  | 'EXISTING_STUB_BLOCKS'
  | 'GATE_DEFERRED'
  | 'UNKNOWN'

export const ARCHIVE_AUTO_CREATE_FAILURE_CATEGORY_LABEL = {
  CROSS_DEPARTMENT: '参考班级跨院系',
  DEPARTMENT_MISSING: '班级未关联院系',
  CLASS_INFO_UNAVAILABLE: '班级或院系信息不可读取',
  AGGREGATE_FAILED: '材料聚合失败',
  EXISTING_STUB_BLOCKS: '失败诊断卷阻断',
  GATE_DEFERRED: '双门禁未满足',
  UNKNOWN: '未知失败',
} as const satisfies Record<ArchiveAutoCreateFailureCategory, string>

export const ARCHIVE_AUTO_CREATE_FAILURE_DESCRIPTION = {
  CROSS_DEPARTMENT:
    '参考班级跨院系，无法自动创建单一归档卷。请按院系拆分参考班级并保存，系统将自动清除失败诊断并重触发自动建卷。',
  DEPARTMENT_MISSING:
    '参考班级未关联院系，无法确定归档归属。请联系教务维护班级院系信息后重试。',
  CLASS_INFO_UNAVAILABLE:
    '班级或院系信息暂时不可读取。请稍后重试或联系管理员。',
  AGGREGATE_FAILED:
    '归档卷已创建但材料聚合失败。请查看事件诊断并联系管理员。',
  EXISTING_STUB_BLOCKS:
    '存在自动建卷失败诊断卷。请使用「重新触发自动建卷」清除诊断并重试；仅当失败类别为跨院系或班级院系缺失时再修正参考班级。',
  GATE_DEFERRED:
    '成绩发布或关考尚未完成，系统将自动重试建卷。',
  UNKNOWN:
    '自动建卷失败，请查看诊断信息并联系管理员。',
} as const satisfies Record<ArchiveAutoCreateFailureCategory, string>

export const TERMINAL_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveAutoCreateFailureCategory>([
  'CROSS_DEPARTMENT',
  'DEPARTMENT_MISSING',
  'CLASS_INFO_UNAVAILABLE',
  'AGGREGATE_FAILED',
  'EXISTING_STUB_BLOCKS',
  'UNKNOWN',
])

/** 须修正参考班级范围后方可重试自动建卷的失败类别 */
export const CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES = new Set<ArchiveAutoCreateFailureCategory>([
  'CROSS_DEPARTMENT',
  'DEPARTMENT_MISSING',
  'CLASS_INFO_UNAVAILABLE',
])

export function isArchiveAutoCreateFailureCategory(
  value: string | undefined | null,
): value is ArchiveAutoCreateFailureCategory {
  return value != null && value in ARCHIVE_AUTO_CREATE_FAILURE_CATEGORY_LABEL
}
