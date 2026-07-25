/** 平台指标一级维度正式码 - PortfolioIndicatorDimensionL1CodeEnum */
export enum PortfolioIndicatorDimensionL1Code {
  BASIC_DUTY_ETHICS = 'BASIC_DUTY_ETHICS',
  MANAGEMENT_COLLABORATION = 'MANAGEMENT_COLLABORATION',
  MAJOR_GROUP_DOUBLE_HIGH = 'MAJOR_GROUP_DOUBLE_HIGH',
  TEACHING_TASK_QUALITY = 'TEACHING_TASK_QUALITY',
  COURSE_CONSTRUCTION_REFORM = 'COURSE_CONSTRUCTION_REFORM',
  TEXTBOOK_TEACHING_ACHIEVEMENT = 'TEXTBOOK_TEACHING_ACHIEVEMENT',
  RESEARCH_TECH_SERVICE = 'RESEARCH_TECH_SERVICE',
  TRAINING_DIGITAL_LITERACY = 'TRAINING_DIGITAL_LITERACY',
  DUAL_TEACHER_ENTERPRISE_PRACTICE = 'DUAL_TEACHER_ENTERPRISE_PRACTICE',
  INDUSTRY_EDUCATION_SOCIAL_SERVICE = 'INDUSTRY_EDUCATION_SOCIAL_SERVICE',
}

export const ALL_PORTFOLIO_INDICATOR_DIMENSION_L1_CODES: PortfolioIndicatorDimensionL1Code[] = [
  PortfolioIndicatorDimensionL1Code.BASIC_DUTY_ETHICS,
  PortfolioIndicatorDimensionL1Code.MANAGEMENT_COLLABORATION,
  PortfolioIndicatorDimensionL1Code.MAJOR_GROUP_DOUBLE_HIGH,
  PortfolioIndicatorDimensionL1Code.TEACHING_TASK_QUALITY,
  PortfolioIndicatorDimensionL1Code.COURSE_CONSTRUCTION_REFORM,
  PortfolioIndicatorDimensionL1Code.TEXTBOOK_TEACHING_ACHIEVEMENT,
  PortfolioIndicatorDimensionL1Code.RESEARCH_TECH_SERVICE,
  PortfolioIndicatorDimensionL1Code.TRAINING_DIGITAL_LITERACY,
  PortfolioIndicatorDimensionL1Code.DUAL_TEACHER_ENTERPRISE_PRACTICE,
  PortfolioIndicatorDimensionL1Code.INDUSTRY_EDUCATION_SOCIAL_SERVICE,
]

export const PortfolioIndicatorDimensionL1Description: Record<PortfolioIndicatorDimensionL1Code, string> = {
  [PortfolioIndicatorDimensionL1Code.BASIC_DUTY_ETHICS]: '基础履职与师德规范',
  [PortfolioIndicatorDimensionL1Code.MANAGEMENT_COLLABORATION]: '管理协同与发展潜力',
  [PortfolioIndicatorDimensionL1Code.MAJOR_GROUP_DOUBLE_HIGH]: '专业群与双高建设贡献',
  [PortfolioIndicatorDimensionL1Code.TEACHING_TASK_QUALITY]: '教学任务与教学质量',
  [PortfolioIndicatorDimensionL1Code.COURSE_CONSTRUCTION_REFORM]: '课程建设与教学改革',
  [PortfolioIndicatorDimensionL1Code.TEXTBOOK_TEACHING_ACHIEVEMENT]: '教材建设与教学成果',
  [PortfolioIndicatorDimensionL1Code.RESEARCH_TECH_SERVICE]: '教研科研与技术服务',
  [PortfolioIndicatorDimensionL1Code.TRAINING_DIGITAL_LITERACY]: '培训发展与数字素养',
  [PortfolioIndicatorDimensionL1Code.DUAL_TEACHER_ENTERPRISE_PRACTICE]: '双师发展与企业实践',
  [PortfolioIndicatorDimensionL1Code.INDUSTRY_EDUCATION_SOCIAL_SERVICE]: '产教融合与社会服务',
}
