/** 性别 - PortfolioGenderEnum */
export enum PortfolioGenderCode {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export const PortfolioGenderDescription: Record<PortfolioGenderCode, string> = {
  [PortfolioGenderCode.MALE]: '男',
  [PortfolioGenderCode.FEMALE]: '女',
}
