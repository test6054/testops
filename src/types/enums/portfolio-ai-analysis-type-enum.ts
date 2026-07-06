/** 教学档案袋 AI 分析类型 - PortfolioAiAnalysisTypeEnum */
export enum PortfolioAiAnalysisTypeCode {
  POLICY_MATCH = 'POLICY_MATCH',
  MATERIAL_QA = 'MATERIAL_QA',
  COCKPIT_ASK = 'COCKPIT_ASK',
  REPORT_GENERATE = 'REPORT_GENERATE',
}

export const ALL_PORTFOLIO_AI_ANALYSIS_TYPE_CODES: readonly PortfolioAiAnalysisTypeCode[] = [
  PortfolioAiAnalysisTypeCode.POLICY_MATCH,
  PortfolioAiAnalysisTypeCode.MATERIAL_QA,
  PortfolioAiAnalysisTypeCode.COCKPIT_ASK,
  PortfolioAiAnalysisTypeCode.REPORT_GENERATE,
]

export const PortfolioAiAnalysisTypeDescription: Record<PortfolioAiAnalysisTypeCode, string> = {
  [PortfolioAiAnalysisTypeCode.POLICY_MATCH]: '政策条款匹配',
  [PortfolioAiAnalysisTypeCode.MATERIAL_QA]: '材料智能问数',
  [PortfolioAiAnalysisTypeCode.COCKPIT_ASK]: '驾驶舱指标问数',
  [PortfolioAiAnalysisTypeCode.REPORT_GENERATE]: '报告初稿生成',
}
