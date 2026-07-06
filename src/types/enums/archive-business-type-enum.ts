/** 归档业务类型 - ArchiveBusinessTypeEnum */
export enum ArchiveBusinessTypeCode {
  TRAINING_PLAN = 'TRAINING_PLAN',
  GRADUATION_REQUIREMENT = 'GRADUATION_REQUIREMENT',
  COURSE_GOAL = 'COURSE_GOAL',
  SCORE_BATCH = 'SCORE_BATCH',
  ACHIEVEMENT_RESULT = 'ACHIEVEMENT_RESULT',
  AI_RESULT = 'AI_RESULT',
  REPORT = 'REPORT',
  IMPROVEMENT_TASK = 'IMPROVEMENT_TASK',
  EXPERT_PACKAGE = 'EXPERT_PACKAGE',
  AUDIT_RECTIFICATION = 'AUDIT_RECTIFICATION',
}

export const ALL_ARCHIVE_BUSINESS_TYPE_CODES: readonly ArchiveBusinessTypeCode[] = [
  ArchiveBusinessTypeCode.TRAINING_PLAN,
  ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT,
  ArchiveBusinessTypeCode.COURSE_GOAL,
  ArchiveBusinessTypeCode.SCORE_BATCH,
  ArchiveBusinessTypeCode.ACHIEVEMENT_RESULT,
  ArchiveBusinessTypeCode.AI_RESULT,
  ArchiveBusinessTypeCode.REPORT,
  ArchiveBusinessTypeCode.IMPROVEMENT_TASK,
  ArchiveBusinessTypeCode.EXPERT_PACKAGE,
  ArchiveBusinessTypeCode.AUDIT_RECTIFICATION,
]

export const ArchiveBusinessTypeDescription: Record<ArchiveBusinessTypeCode, string> = {
  [ArchiveBusinessTypeCode.TRAINING_PLAN]: '培养方案',
  [ArchiveBusinessTypeCode.GRADUATION_REQUIREMENT]: '毕业要求',
  [ArchiveBusinessTypeCode.COURSE_GOAL]: '课程目标',
  [ArchiveBusinessTypeCode.SCORE_BATCH]: '成绩导入批次',
  [ArchiveBusinessTypeCode.ACHIEVEMENT_RESULT]: '达成度计算结果',
  [ArchiveBusinessTypeCode.AI_RESULT]: 'AI 结果',
  [ArchiveBusinessTypeCode.REPORT]: '报告',
  [ArchiveBusinessTypeCode.IMPROVEMENT_TASK]: '持续改进任务',
  [ArchiveBusinessTypeCode.EXPERT_PACKAGE]: '行业专家评审材料包',
  [ArchiveBusinessTypeCode.AUDIT_RECTIFICATION]: '审核评估整改材料',
}
