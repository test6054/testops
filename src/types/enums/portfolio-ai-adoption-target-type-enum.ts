/** AI 确认入档目标类型 - PortfolioAiAdoptionTargetTypeEnum */
export enum PortfolioAiAdoptionTargetTypeCode {
  DEVELOPMENT_PLAN = 'DEVELOPMENT_PLAN',
  ARCHIVE_RECORD = 'ARCHIVE_RECORD',
  NONE = 'NONE',
}

export const ALL_PORTFOLIO_AI_ADOPTION_TARGET_TYPE_CODES: readonly PortfolioAiAdoptionTargetTypeCode[] = [
  PortfolioAiAdoptionTargetTypeCode.DEVELOPMENT_PLAN,
  PortfolioAiAdoptionTargetTypeCode.ARCHIVE_RECORD,
  PortfolioAiAdoptionTargetTypeCode.NONE,
]

export const PortfolioAiAdoptionTargetTypeDescription: Record<PortfolioAiAdoptionTargetTypeCode, string> = {
  [PortfolioAiAdoptionTargetTypeCode.DEVELOPMENT_PLAN]: '发展规划',
  [PortfolioAiAdoptionTargetTypeCode.ARCHIVE_RECORD]: '档案记录',
  [PortfolioAiAdoptionTargetTypeCode.NONE]: '无需落档',
}

export function isPortfolioAiAdoptionTargetType(
  value: string,
): value is PortfolioAiAdoptionTargetTypeCode {
  return (ALL_PORTFOLIO_AI_ADOPTION_TARGET_TYPE_CODES as readonly string[]).includes(value)
}
