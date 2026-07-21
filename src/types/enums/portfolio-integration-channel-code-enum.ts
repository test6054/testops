/** 数据集成渠道编码 - 与后端 PortfolioIntegrationChannelCodeEnum 逐值对齐 */
export enum PortfolioIntegrationChannelCodeEnum {
  HR_PERSONNEL = 'HR_PERSONNEL',
  TEACHING_AFFAIRS = 'TEACHING_AFFAIRS',
  TEACHING_EVALUATION = 'TEACHING_EVALUATION',
  SCIENTIFIC_RESEARCH = 'SCIENTIFIC_RESEARCH',
  TRAINING_CLOUD = 'TRAINING_CLOUD',
  STUDENT_AFFAIRS = 'STUDENT_AFFAIRS',
  FINANCE_SUMMARY = 'FINANCE_SUMMARY',
  NATIONAL_TEACHER_SYSTEM = 'NATIONAL_TEACHER_SYSTEM',
}

export const ALL_PORTFOLIO_INTEGRATION_CHANNEL_CODE_ENUMS: readonly PortfolioIntegrationChannelCodeEnum[] = [
  PortfolioIntegrationChannelCodeEnum.HR_PERSONNEL,
  PortfolioIntegrationChannelCodeEnum.TEACHING_AFFAIRS,
  PortfolioIntegrationChannelCodeEnum.TEACHING_EVALUATION,
  PortfolioIntegrationChannelCodeEnum.SCIENTIFIC_RESEARCH,
  PortfolioIntegrationChannelCodeEnum.TRAINING_CLOUD,
  PortfolioIntegrationChannelCodeEnum.STUDENT_AFFAIRS,
  PortfolioIntegrationChannelCodeEnum.FINANCE_SUMMARY,
  PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM,
]

export const PortfolioIntegrationChannelCodeDescription: Record<
  PortfolioIntegrationChannelCodeEnum,
  string
> = {
  [PortfolioIntegrationChannelCodeEnum.HR_PERSONNEL]: '人事系统',
  [PortfolioIntegrationChannelCodeEnum.TEACHING_AFFAIRS]: '教务系统',
  [PortfolioIntegrationChannelCodeEnum.TEACHING_EVALUATION]: '评教系统',
  [PortfolioIntegrationChannelCodeEnum.SCIENTIFIC_RESEARCH]: '科研系统',
  [PortfolioIntegrationChannelCodeEnum.TRAINING_CLOUD]: '培训云',
  [PortfolioIntegrationChannelCodeEnum.STUDENT_AFFAIRS]: '学工系统',
  [PortfolioIntegrationChannelCodeEnum.FINANCE_SUMMARY]: '财务摘要',
  [PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM]: '全国教师系统',
}
