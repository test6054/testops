/** 教学档案袋 AI 分析类型 - PortfolioAiAnalysisTypeEnum */
export enum PortfolioAiAnalysisTypeCode {
  POLICY_MATCH = 'POLICY_MATCH',
  MATERIAL_QA = 'MATERIAL_QA',
  COCKPIT_ASK = 'COCKPIT_ASK',
  REPORT_GENERATE = 'REPORT_GENERATE',
  CONTENT_OPTIMIZE = 'CONTENT_OPTIMIZE',
  TEACHING_EFFECT_ANALYSIS = 'TEACHING_EFFECT_ANALYSIS',
  DEVELOPMENT_SUGGEST = 'DEVELOPMENT_SUGGEST',
  CONTENT_GENERATE = 'CONTENT_GENERATE',
}

export const ALL_PORTFOLIO_AI_ANALYSIS_TYPE_CODES: readonly PortfolioAiAnalysisTypeCode[] = [
  PortfolioAiAnalysisTypeCode.POLICY_MATCH,
  PortfolioAiAnalysisTypeCode.MATERIAL_QA,
  PortfolioAiAnalysisTypeCode.COCKPIT_ASK,
  PortfolioAiAnalysisTypeCode.REPORT_GENERATE,
  PortfolioAiAnalysisTypeCode.CONTENT_OPTIMIZE,
  PortfolioAiAnalysisTypeCode.TEACHING_EFFECT_ANALYSIS,
  PortfolioAiAnalysisTypeCode.DEVELOPMENT_SUGGEST,
  PortfolioAiAnalysisTypeCode.CONTENT_GENERATE,
]

export const PortfolioAiAnalysisTypeDescription: Record<PortfolioAiAnalysisTypeCode, string> = {
  [PortfolioAiAnalysisTypeCode.POLICY_MATCH]: '政策条款匹配',
  [PortfolioAiAnalysisTypeCode.MATERIAL_QA]: '材料智能问数',
  [PortfolioAiAnalysisTypeCode.COCKPIT_ASK]: '驾驶舱指标问数',
  [PortfolioAiAnalysisTypeCode.REPORT_GENERATE]: '报告初稿生成',
  [PortfolioAiAnalysisTypeCode.CONTENT_OPTIMIZE]: '内容优化建议',
  [PortfolioAiAnalysisTypeCode.TEACHING_EFFECT_ANALYSIS]: '教学效果分析',
  [PortfolioAiAnalysisTypeCode.DEVELOPMENT_SUGGEST]: '个性化发展建议',
  [PortfolioAiAnalysisTypeCode.CONTENT_GENERATE]: '智能内容生成',
}
