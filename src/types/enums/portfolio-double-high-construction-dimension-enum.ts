/** 双高建设监测贡献维度 - PortfolioDoubleHighConstructionDimensionEnum */
export enum PortfolioDoubleHighConstructionDimensionCode {
  DUAL_TEACHER_TEAM = 'DUAL_TEACHER_TEAM',
  MAJOR_GROUP_CONTRIBUTION = 'MAJOR_GROUP_CONTRIBUTION',
  INDUSTRY_INTEGRATION = 'INDUSTRY_INTEGRATION',
  COURSE_TEXTBOOK = 'COURSE_TEXTBOOK',
  INNOVATION_TEAM = 'INNOVATION_TEAM',
  TEACHER_DEVELOPMENT = 'TEACHER_DEVELOPMENT',
  SOCIAL_SERVICE = 'SOCIAL_SERVICE',
}

export const ALL_PORTFOLIO_DOUBLE_HIGH_CONSTRUCTION_DIMENSION_CODES: readonly PortfolioDoubleHighConstructionDimensionCode[] = [
  PortfolioDoubleHighConstructionDimensionCode.DUAL_TEACHER_TEAM,
  PortfolioDoubleHighConstructionDimensionCode.MAJOR_GROUP_CONTRIBUTION,
  PortfolioDoubleHighConstructionDimensionCode.INDUSTRY_INTEGRATION,
  PortfolioDoubleHighConstructionDimensionCode.COURSE_TEXTBOOK,
  PortfolioDoubleHighConstructionDimensionCode.INNOVATION_TEAM,
  PortfolioDoubleHighConstructionDimensionCode.TEACHER_DEVELOPMENT,
  PortfolioDoubleHighConstructionDimensionCode.SOCIAL_SERVICE,
]

export const PortfolioDoubleHighConstructionDimensionDescription: Record<
  PortfolioDoubleHighConstructionDimensionCode,
  string
> = {
  [PortfolioDoubleHighConstructionDimensionCode.DUAL_TEACHER_TEAM]: '双师队伍建设',
  [PortfolioDoubleHighConstructionDimensionCode.MAJOR_GROUP_CONTRIBUTION]: '专业群贡献',
  [PortfolioDoubleHighConstructionDimensionCode.INDUSTRY_INTEGRATION]: '产教融合服务',
  [PortfolioDoubleHighConstructionDimensionCode.COURSE_TEXTBOOK]: '课程教材建设',
  [PortfolioDoubleHighConstructionDimensionCode.INNOVATION_TEAM]: '教学创新团队',
  [PortfolioDoubleHighConstructionDimensionCode.TEACHER_DEVELOPMENT]: '教师发展机制',
  [PortfolioDoubleHighConstructionDimensionCode.SOCIAL_SERVICE]: '社会服务',
}
