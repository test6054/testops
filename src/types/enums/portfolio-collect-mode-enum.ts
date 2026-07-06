/** 档案袋 Kiosk 采集模式 */
export enum PortfolioCollectModeCode {
  AI_SUBMIT = 'AI_SUBMIT',
  GAP_ATTACHMENT = 'GAP_ATTACHMENT',
}

export const ALL_PORTFOLIO_COLLECT_MODE_CODES: readonly PortfolioCollectModeCode[] = [
  PortfolioCollectModeCode.AI_SUBMIT,
  PortfolioCollectModeCode.GAP_ATTACHMENT,
]

export const PortfolioCollectModeDescription: Record<PortfolioCollectModeCode, string> = {
  [PortfolioCollectModeCode.AI_SUBMIT]: 'AI 候选提交',
  [PortfolioCollectModeCode.GAP_ATTACHMENT]: '补采附件',
}
