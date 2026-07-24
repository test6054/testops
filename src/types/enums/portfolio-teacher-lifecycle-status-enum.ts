/** 教师生命周期状态 - PortfolioTeacherLifecycleStatusEnum */
export enum PortfolioTeacherLifecycleStatusCode {
  ACTIVE = 'ACTIVE',
  SEALED = 'SEALED',
  TRANSFER_FROZEN = 'TRANSFER_FROZEN',
  TRANSFERRED = 'TRANSFERRED',
  TEMP_HOLD = 'TEMP_HOLD',
}

export const ALL_PORTFOLIO_TEACHER_LIFECYCLE_STATUS_CODES: readonly PortfolioTeacherLifecycleStatusCode[] = [
  PortfolioTeacherLifecycleStatusCode.ACTIVE,
  PortfolioTeacherLifecycleStatusCode.SEALED,
  PortfolioTeacherLifecycleStatusCode.TRANSFER_FROZEN,
  PortfolioTeacherLifecycleStatusCode.TRANSFERRED,
  PortfolioTeacherLifecycleStatusCode.TEMP_HOLD,
]

export const PortfolioTeacherLifecycleStatusDescription: Record<
  PortfolioTeacherLifecycleStatusCode,
  string
> = {
  [PortfolioTeacherLifecycleStatusCode.ACTIVE]: '在职',
  [PortfolioTeacherLifecycleStatusCode.SEALED]: '封存',
  [PortfolioTeacherLifecycleStatusCode.TRANSFER_FROZEN]: '迁出冻结',
  [PortfolioTeacherLifecycleStatusCode.TRANSFERRED]: '已迁出',
  [PortfolioTeacherLifecycleStatusCode.TEMP_HOLD]: '暂挂',
}
