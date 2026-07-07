export enum PortfolioArchiveScoreRuleTypeCode {
  COMPLETENESS = 'COMPLETENESS',
  CATEGORY = 'CATEGORY',
  ACHIEVEMENT = 'ACHIEVEMENT',
}

export const ALL_PORTFOLIO_ARCHIVE_SCORE_RULE_TYPE_CODES: readonly PortfolioArchiveScoreRuleTypeCode[] = [
  PortfolioArchiveScoreRuleTypeCode.COMPLETENESS,
  PortfolioArchiveScoreRuleTypeCode.CATEGORY,
  PortfolioArchiveScoreRuleTypeCode.ACHIEVEMENT,
]

export const PortfolioArchiveScoreRuleTypeDescription: Record<PortfolioArchiveScoreRuleTypeCode, string> = {
  [PortfolioArchiveScoreRuleTypeCode.COMPLETENESS]: '完整度加权',
  [PortfolioArchiveScoreRuleTypeCode.CATEGORY]: '分类归档计分',
  [PortfolioArchiveScoreRuleTypeCode.ACHIEVEMENT]: '成果条目计分',
}
