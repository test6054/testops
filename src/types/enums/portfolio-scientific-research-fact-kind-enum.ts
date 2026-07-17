/**
 * 科研系统专用域同步事实种类（与后端 PortfolioScientificResearchFactKindEnum 逐值一致）。
 * 论文/项目落库外源键为 PUBLICATION:原始ID / PROJECT:原始ID。
 */
export enum PortfolioScientificResearchFactKindCode {
  HONOR = 'HONOR',
  PUBLICATION = 'PUBLICATION',
  PROJECT = 'PROJECT',
}

export const ALL_PORTFOLIO_SCIENTIFIC_RESEARCH_FACT_KIND_CODES = [
  PortfolioScientificResearchFactKindCode.HONOR,
  PortfolioScientificResearchFactKindCode.PUBLICATION,
  PortfolioScientificResearchFactKindCode.PROJECT,
] as const satisfies readonly PortfolioScientificResearchFactKindCode[]

export const PortfolioScientificResearchFactKindDescription: Record<
  PortfolioScientificResearchFactKindCode,
  string
> = {
  [PortfolioScientificResearchFactKindCode.HONOR]: '荣誉获奖',
  [PortfolioScientificResearchFactKindCode.PUBLICATION]: '论文著作',
  [PortfolioScientificResearchFactKindCode.PROJECT]: '科研项目',
}

/** 成果类 fact_kind 的落库外源键前缀（与后端 scopedExternalId 一致）。 */
export function isAchievementScientificResearchFactKind(
  code: PortfolioScientificResearchFactKindCode,
): boolean {
  return code === PortfolioScientificResearchFactKindCode.PUBLICATION
    || code === PortfolioScientificResearchFactKindCode.PROJECT
}

/**
 * 将渠道原始外源 ID 规范为种类隔离幂等键；已带本种类前缀时保持规范化。
 */
export function scopedScientificResearchExternalId(
  factKind: PortfolioScientificResearchFactKindCode,
  rawExternalId: string,
): string {
  const trimmed = (rawExternalId || '').trim()
  if (!trimmed) {
    throw new Error(`${PortfolioScientificResearchFactKindDescription[factKind]}缺少 externalId`)
  }
  if (!isAchievementScientificResearchFactKind(factKind)) {
    throw new Error('仅论文/项目成果需要种类隔离外源键')
  }
  const prefix = `${factKind}:`
  if (trimmed.toUpperCase().startsWith(prefix)) {
    const body = trimmed.slice(prefix.length).trim()
    if (!body) {
      throw new Error(`${PortfolioScientificResearchFactKindDescription[factKind]}外源 ID 前缀后为空`)
    }
    return `${factKind}:${body}`
  }
  for (const other of [
    PortfolioScientificResearchFactKindCode.PUBLICATION,
    PortfolioScientificResearchFactKindCode.PROJECT,
  ] as const) {
    if (other === factKind) {
      continue
    }
    const otherPrefix = `${other}:`
    if (trimmed.toUpperCase().startsWith(otherPrefix)) {
      throw new Error(`${PortfolioScientificResearchFactKindDescription[factKind]}外源 ID 不得使用 ${other} 前缀`)
    }
  }
  return `${factKind}:${trimmed}`
}
