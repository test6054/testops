/** 档案计分明细行类型 - PortfolioArchiveScoreLineTypeEnum */
export enum PortfolioArchiveScoreLineTypeCode {
  ACHIEVEMENT_ITEM = 'ACHIEVEMENT_ITEM',
  RULE_SUMMARY = 'RULE_SUMMARY',
  BLANK_PERIOD = 'BLANK_PERIOD',
}

export const PortfolioArchiveScoreLineTypeDescription: Record<
  PortfolioArchiveScoreLineTypeCode,
  string
> = {
  [PortfolioArchiveScoreLineTypeCode.ACHIEVEMENT_ITEM]: '成果明细',
  [PortfolioArchiveScoreLineTypeCode.RULE_SUMMARY]: '规则汇总',
  [PortfolioArchiveScoreLineTypeCode.BLANK_PERIOD]: '空白期衰减',
}
