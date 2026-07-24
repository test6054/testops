/** 是/否 - PortfolioYesNoEnum */
export enum PortfolioYesNoCode {
  YES = 'YES',
  NO = 'NO',
}

export const PortfolioYesNoDescription: Record<PortfolioYesNoCode, string> = {
  [PortfolioYesNoCode.YES]: '是',
  [PortfolioYesNoCode.NO]: '否',
}
