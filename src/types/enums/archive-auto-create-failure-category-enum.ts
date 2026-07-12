/** 归档卷自动建卷失败类别 */
export enum ArchiveAutoCreateFailureCategoryCode {
  CROSS_DEPARTMENT = 'CROSS_DEPARTMENT',
  DEPARTMENT_MISSING = 'DEPARTMENT_MISSING',
  CLASS_INFO_UNAVAILABLE = 'CLASS_INFO_UNAVAILABLE',
  AGGREGATE_FAILED = 'AGGREGATE_FAILED',
  EXISTING_STUB_BLOCKS = 'EXISTING_STUB_BLOCKS',
  GATE_DEFERRED = 'GATE_DEFERRED',
  PACKAGE_PENDING = 'PACKAGE_PENDING',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_ARCHIVE_AUTO_CREATE_FAILURE_CATEGORY_CODES: readonly ArchiveAutoCreateFailureCategoryCode[] = [
  ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT,
  ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING,
  ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE,
  ArchiveAutoCreateFailureCategoryCode.AGGREGATE_FAILED,
  ArchiveAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS,
  ArchiveAutoCreateFailureCategoryCode.GATE_DEFERRED,
  ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING,
  ArchiveAutoCreateFailureCategoryCode.UNKNOWN,
]

export const ArchiveAutoCreateFailureCategoryDescription: Record<ArchiveAutoCreateFailureCategoryCode, string> = {
  [ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT]: '参考班级跨院系',
  [ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING]: '班级未关联院系',
  [ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE]: '班级或院系信息不可读取',
  [ArchiveAutoCreateFailureCategoryCode.AGGREGATE_FAILED]: '材料聚合失败',
  [ArchiveAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS]: '失败诊断卷阻断',
  [ArchiveAutoCreateFailureCategoryCode.GATE_DEFERRED]: '双门禁未满足',
  [ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING]: '归档包或材料聚合待完成',
  [ArchiveAutoCreateFailureCategoryCode.UNKNOWN]: '未知失败',
}

export const ArchiveAutoCreateFailureCategoryHintDescription: Record<ArchiveAutoCreateFailureCategoryCode, string> = {
  [ArchiveAutoCreateFailureCategoryCode.CROSS_DEPARTMENT]:
    '参考班级跨院系，无法自动创建单一归档卷。请按院系拆分参考班级并保存，系统将自动清除失败诊断并重触发自动建卷。',
  [ArchiveAutoCreateFailureCategoryCode.DEPARTMENT_MISSING]:
    '参考班级未关联院系，无法确定归档归属。请联系教务维护班级院系信息后重试。',
  [ArchiveAutoCreateFailureCategoryCode.CLASS_INFO_UNAVAILABLE]:
    '班级或院系信息暂时不可读取，请联系管理员。',
  [ArchiveAutoCreateFailureCategoryCode.AGGREGATE_FAILED]:
    '归档卷已创建但材料聚合失败。请查看事件诊断并联系管理员。',
  [ArchiveAutoCreateFailureCategoryCode.EXISTING_STUB_BLOCKS]:
    '存在自动建卷失败诊断卷。请使用「重新触发自动建卷」清除诊断并重试；仅当失败类别为跨院系或班级院系缺失时再修正参考班级。',
  [ArchiveAutoCreateFailureCategoryCode.GATE_DEFERRED]:
    '成绩发布或关考尚未完成，系统将自动重试建卷。',
  [ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING]:
    '双门禁已满足，考后归档包正在投递或材料正在聚合，系统将自动重试并刷新进度。',
  [ArchiveAutoCreateFailureCategoryCode.UNKNOWN]:
    '自动建卷失败，请查看诊断信息并联系管理员。',
}
