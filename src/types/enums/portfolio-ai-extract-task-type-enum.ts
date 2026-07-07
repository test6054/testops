/** 候选确认链可提交的任务类型（对齐 PortfolioAiTaskTypeCode 子集） */
export enum PortfolioAiExtractTaskTypeCode {
  PORTFOLIO_CERTIFICATE_OCR = 'PORTFOLIO_CERTIFICATE_OCR',
  PORTFOLIO_DOCUMENT_PARSE = 'PORTFOLIO_DOCUMENT_PARSE',
}

export const ALL_PORTFOLIO_AI_EXTRACT_TASK_TYPE_CODES: readonly PortfolioAiExtractTaskTypeCode[] = [
  PortfolioAiExtractTaskTypeCode.PORTFOLIO_CERTIFICATE_OCR,
  PortfolioAiExtractTaskTypeCode.PORTFOLIO_DOCUMENT_PARSE,
]
