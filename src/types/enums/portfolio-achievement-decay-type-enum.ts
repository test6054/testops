/** 成果时效衰减类型 - PortfolioAchievementDecayTypeEnum */
export enum PortfolioAchievementDecayTypeCode {
  REDLINE = 'REDLINE',
  CERTIFICATE = 'CERTIFICATE',
  ENTERPRISE_PRACTICE = 'ENTERPRISE_PRACTICE',
  TRAINING = 'TRAINING',
  TEACHING_AWARD = 'TEACHING_AWARD',
  TEACHING_REFORM = 'TEACHING_REFORM',
  PAPER_PATENT = 'PAPER_PATENT',
  NONE = 'NONE',
}

export const ALL_PORTFOLIO_ACHIEVEMENT_DECAY_TYPE_CODES: readonly PortfolioAchievementDecayTypeCode[] = [
  PortfolioAchievementDecayTypeCode.REDLINE,
  PortfolioAchievementDecayTypeCode.CERTIFICATE,
  PortfolioAchievementDecayTypeCode.ENTERPRISE_PRACTICE,
  PortfolioAchievementDecayTypeCode.TRAINING,
  PortfolioAchievementDecayTypeCode.TEACHING_AWARD,
  PortfolioAchievementDecayTypeCode.TEACHING_REFORM,
  PortfolioAchievementDecayTypeCode.PAPER_PATENT,
  PortfolioAchievementDecayTypeCode.NONE,
]

export const PortfolioAchievementDecayTypeDescription: Record<PortfolioAchievementDecayTypeCode, string> = {
  [PortfolioAchievementDecayTypeCode.REDLINE]: '红线事项',
  [PortfolioAchievementDecayTypeCode.CERTIFICATE]: '职业资格证书',
  [PortfolioAchievementDecayTypeCode.ENTERPRISE_PRACTICE]: '企业实践',
  [PortfolioAchievementDecayTypeCode.TRAINING]: '培训研修',
  [PortfolioAchievementDecayTypeCode.TEACHING_AWARD]: '教学成果奖',
  [PortfolioAchievementDecayTypeCode.TEACHING_REFORM]: '教改项目',
  [PortfolioAchievementDecayTypeCode.PAPER_PATENT]: '论文专利',
  [PortfolioAchievementDecayTypeCode.NONE]: '不启用衰减',
}
