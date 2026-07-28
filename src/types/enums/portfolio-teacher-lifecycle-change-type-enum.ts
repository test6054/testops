/** 教师生命周期变更类型 - PortfolioTeacherLifecycleChangeTypeEnum */
export enum PortfolioTeacherLifecycleChangeTypeCode {
  LEFT = 'LEFT',
  RETIRED = 'RETIRED',
  TRANSFERRED_OUT = 'TRANSFERRED_OUT',
  STUDY_LEAVE = 'STUDY_LEAVE',
  SECONDMENT = 'SECONDMENT',
  LONG_SICK_LEAVE = 'LONG_SICK_LEAVE',
  REHIRED = 'REHIRED',
  RESUME_FROM_HOLD = 'RESUME_FROM_HOLD',
  CANCEL_TRANSFER_OUT = 'CANCEL_TRANSFER_OUT',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',
}

export const PortfolioTeacherLifecycleChangeTypeDescription: Record<
  PortfolioTeacherLifecycleChangeTypeCode,
  string
> = {
  [PortfolioTeacherLifecycleChangeTypeCode.LEFT]: '离职',
  [PortfolioTeacherLifecycleChangeTypeCode.RETIRED]: '退休',
  [PortfolioTeacherLifecycleChangeTypeCode.TRANSFERRED_OUT]: '调出',
  [PortfolioTeacherLifecycleChangeTypeCode.STUDY_LEAVE]: '访学',
  [PortfolioTeacherLifecycleChangeTypeCode.SECONDMENT]: '挂职',
  [PortfolioTeacherLifecycleChangeTypeCode.LONG_SICK_LEAVE]: '长期病假',
  [PortfolioTeacherLifecycleChangeTypeCode.REHIRED]: '返聘',
  [PortfolioTeacherLifecycleChangeTypeCode.RESUME_FROM_HOLD]: '恢复在职',
  [PortfolioTeacherLifecycleChangeTypeCode.CANCEL_TRANSFER_OUT]: '撤销调出',
  [PortfolioTeacherLifecycleChangeTypeCode.EXPORT_COMPLETED]: '迁出导出完成',
}
