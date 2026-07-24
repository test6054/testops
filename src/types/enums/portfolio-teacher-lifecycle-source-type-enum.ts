/** 教师生命周期变更来源 - PortfolioTeacherLifecycleSourceTypeEnum */
export enum PortfolioTeacherLifecycleSourceTypeCode {
  MANUAL = 'MANUAL',
  HR_SYNC = 'HR_SYNC',
  SELF_DECLARE = 'SELF_DECLARE',
}

export const PortfolioTeacherLifecycleSourceTypeDescription: Record<
  PortfolioTeacherLifecycleSourceTypeCode,
  string
> = {
  [PortfolioTeacherLifecycleSourceTypeCode.MANUAL]: '人工登记',
  [PortfolioTeacherLifecycleSourceTypeCode.HR_SYNC]: '人事同步',
  [PortfolioTeacherLifecycleSourceTypeCode.SELF_DECLARE]: '自助申报',
}
