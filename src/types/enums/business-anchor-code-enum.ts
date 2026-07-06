/** 外部拔取业务归属锚点 */
export enum BusinessAnchorCode {
  TRAINING_PLAN = 'TRAINING_PLAN',
  QUALITY_COURSE = 'QUALITY_COURSE',
  ASSESSMENT_ITEM = 'ASSESSMENT_ITEM',
  ACHIEVEMENT_RESULT = 'ACHIEVEMENT_RESULT',
  REPORT = 'REPORT',
  AUDIT_ISSUE = 'AUDIT_ISSUE',
  AUDIT_RECTIFICATION = 'AUDIT_RECTIFICATION',
}

export const ALL_BUSINESS_ANCHOR_CODES: readonly BusinessAnchorCode[] = [
  BusinessAnchorCode.TRAINING_PLAN,
  BusinessAnchorCode.QUALITY_COURSE,
  BusinessAnchorCode.ASSESSMENT_ITEM,
  BusinessAnchorCode.ACHIEVEMENT_RESULT,
  BusinessAnchorCode.REPORT,
  BusinessAnchorCode.AUDIT_ISSUE,
  BusinessAnchorCode.AUDIT_RECTIFICATION,
]

export const BusinessAnchorCodeDescription: Record<BusinessAnchorCode, string> = {
  [BusinessAnchorCode.TRAINING_PLAN]: '培养方案',
  [BusinessAnchorCode.QUALITY_COURSE]: '质量评价课程',
  [BusinessAnchorCode.ASSESSMENT_ITEM]: '考核环节',
  [BusinessAnchorCode.ACHIEVEMENT_RESULT]: '达成度结果',
  [BusinessAnchorCode.REPORT]: '质量报告',
  [BusinessAnchorCode.AUDIT_ISSUE]: '审查问题',
  [BusinessAnchorCode.AUDIT_RECTIFICATION]: '整改任务',
}

export const BUSINESS_ANCHOR_OPTIONS: Array<{ value: BusinessAnchorCode, label: string }>
  = ALL_BUSINESS_ANCHOR_CODES.map((value) => ({
    value,
    label: BusinessAnchorCodeDescription[value],
  }))

