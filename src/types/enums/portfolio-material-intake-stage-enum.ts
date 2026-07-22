/** 材料采集阶段 - PortfolioMaterialIntakeStageEnum */
export enum PortfolioMaterialIntakeStageCode {
  EMPTY = 'EMPTY',
  UPLOADED = 'UPLOADED',
  OCR_PENDING = 'OCR_PENDING',
  AI_PROCESSING = 'AI_PROCESSING',
  AI_FAILED = 'AI_FAILED',
  CANDIDATES_REJECTED = 'CANDIDATES_REJECTED',
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
  PortfolioMaterialIntakeStageCode.CANDIDATES_REJECTED,
  PortfolioMaterialIntakeStageCode.CATEGORY_PENDING,
  PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE,
  PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT,
  PortfolioMaterialIntakeStageCode.SUBMITTED,
  PortfolioMaterialIntakeStageCode.UNDER_REVIEW,
  PortfolioMaterialIntakeStageCode.RETURNED,
]

export const PortfolioMaterialIntakeStageDescription: Record<PortfolioMaterialIntakeStageCode, string> = {
  [PortfolioMaterialIntakeStageCode.EMPTY]: '未上传',
  [PortfolioMaterialIntakeStageCode.UPLOADED]: '已上传',
  [PortfolioMaterialIntakeStageCode.OCR_PENDING]: 'OCR处理中',
  [PortfolioMaterialIntakeStageCode.AI_PROCESSING]: 'AI处理中',
  [PortfolioMaterialIntakeStageCode.AI_FAILED]: 'AI抽取失败',
  [PortfolioMaterialIntakeStageCode.CANDIDATES_REJECTED]: 'AI候选均驳回',
  [PortfolioMaterialIntakeStageCode.CATEGORY_PENDING]: '待选分类',
  [PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE]: '字段未完整',
  [PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT]: '可提交',
  [PortfolioMaterialIntakeStageCode.SUBMITTED]: '已提交',
  [PortfolioMaterialIntakeStageCode.UNDER_REVIEW]: '审核中',
  [PortfolioMaterialIntakeStageCode.RETURNED]: '已退回',
}
