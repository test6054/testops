/** 候选确认链可提交的任务类型（对齐 PortfolioAiTaskTypeCode 子集） */
export enum PortfolioAiExtractTaskTypeCode {
  PORTFOLIO_CERTIFICATE_OCR = 'PORTFOLIO_CERTIFICATE_OCR',
  PORTFOLIO_DOCUMENT_PARSE = 'PORTFOLIO_DOCUMENT_PARSE',
}

export const ALL_PORTFOLIO_AI_EXTRACT_TASK_TYPE_CODES: readonly PortfolioAiExtractTaskTypeCode[] = [
  PortfolioAiExtractTaskTypeCode.PORTFOLIO_CERTIFICATE_OCR,
  PortfolioAiExtractTaskTypeCode.PORTFOLIO_DOCUMENT_PARSE,
]

/** 抽取任务类型中文文案，与 PortfolioAiTaskTypeDescription 对应子集保持一致 */
export const PortfolioAiExtractTaskTypeDescription: Record<PortfolioAiExtractTaskTypeCode, string> = {
  [PortfolioAiExtractTaskTypeCode.PORTFOLIO_CERTIFICATE_OCR]: '证书证明 OCR 抽取',
  [PortfolioAiExtractTaskTypeCode.PORTFOLIO_DOCUMENT_PARSE]: '文档结构化抽取',
}
