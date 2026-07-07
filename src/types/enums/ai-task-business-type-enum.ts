/** AI 任务业务类型 - AiTaskSubmitRequest.businessType */
export enum AiTaskBusinessTypeCode {
  ACHIEVEMENT_RESULT = 'ACHIEVEMENT_RESULT',
  QUALITY_COURSE = 'QUALITY_COURSE',
  TRAINING_PLAN = 'TRAINING_PLAN',
  REPORT = 'REPORT',
  INDIRECT_FORM = 'INDIRECT_FORM',
  PORTFOLIO_MATERIAL = 'PORTFOLIO_MATERIAL',
  PORTFOLIO_EVALUATION = 'PORTFOLIO_EVALUATION',
}

export const ALL_AI_TASK_BUSINESS_TYPE_CODES: readonly AiTaskBusinessTypeCode[] = [
  AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT,
  AiTaskBusinessTypeCode.QUALITY_COURSE,
  AiTaskBusinessTypeCode.TRAINING_PLAN,
  AiTaskBusinessTypeCode.REPORT,
  AiTaskBusinessTypeCode.INDIRECT_FORM,
  AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL,
  AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION,
]

export const AiTaskBusinessTypeDescription: Record<AiTaskBusinessTypeCode, string> = {
  [AiTaskBusinessTypeCode.ACHIEVEMENT_RESULT]: '达成度计算结果',
  [AiTaskBusinessTypeCode.QUALITY_COURSE]: '质量评价课程',
  [AiTaskBusinessTypeCode.TRAINING_PLAN]: '培养方案',
  [AiTaskBusinessTypeCode.REPORT]: '质量报告',
  [AiTaskBusinessTypeCode.INDIRECT_FORM]: '间接评价问卷',
  [AiTaskBusinessTypeCode.PORTFOLIO_MATERIAL]: '教学档案袋材料',
  [AiTaskBusinessTypeCode.PORTFOLIO_EVALUATION]: '教学档案袋评价任务',
}
