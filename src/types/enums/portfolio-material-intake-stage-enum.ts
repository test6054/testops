/** 材料采集阶段 - PortfolioMaterialIntakeStageEnum */
export enum PortfolioMaterialIntakeStageCode {
  EMPTY = 'EMPTY',
  UPLOADED = 'UPLOADED',
  OCR_PENDING = 'OCR_PENDING',
  AI_PROCESSING = 'AI_PROCESSING',
  AI_FAILED = 'AI_FAILED',
  CATEGORY_PENDING = 'CATEGORY_PENDING',
  FIELDS_INCOMPLETE = 'FIELDS_INCOMPLETE',
  READY_TO_SUBMIT = 'READY_TO_SUBMIT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RETURNED = 'RETURNED',
}

export const ALL_PORTFOLIO_MATERIAL_INTAKE_STAGE_CODES: readonly PortfolioMaterialIntakeStageCode[] = [
  PortfolioMaterialIntakeStageCode.EMPTY,
  PortfolioMaterialIntakeStageCode.UPLOADED,
  PortfolioMaterialIntakeStageCode.OCR_PENDING,
  PortfolioMaterialIntakeStageCode.AI_PROCESSING,
  PortfolioMaterialIntakeStageCode.AI_FAILED,
  PortfolioMaterialIntakeStageCode.CATEGORY_PENDING,
  PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE,
  PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT,
  PortfolioMaterialIntakeStageCode.SUBMITTED,
  PortfolioMaterialIntakeStageCode.UNDER_REVIEW,
  PortfolioMaterialIntakeStageCode.RETURNED,
]

export const PortfolioMaterialIntakeStageDescription: Record<PortfolioMaterialIntakeStageCode, string> = {
  [PortfolioMaterialIntakeStageCode.EMPTY]: '待上传',
  [PortfolioMaterialIntakeStageCode.UPLOADED]: '已上传',
  [PortfolioMaterialIntakeStageCode.OCR_PENDING]: 'OCR 处理中',
  [PortfolioMaterialIntakeStageCode.AI_PROCESSING]: 'AI 抽取中',
  [PortfolioMaterialIntakeStageCode.AI_FAILED]: 'AI 抽取失败',
  [PortfolioMaterialIntakeStageCode.CATEGORY_PENDING]: '待确认分类',
  [PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE]: '字段待补全',
  [PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT]: '可提交审核',
  [PortfolioMaterialIntakeStageCode.SUBMITTED]: '已提交',
  [PortfolioMaterialIntakeStageCode.UNDER_REVIEW]: '审核中',
  [PortfolioMaterialIntakeStageCode.RETURNED]: '已退回',
}
