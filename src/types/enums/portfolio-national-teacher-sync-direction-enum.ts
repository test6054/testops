/** 全国教师系统同步方向 - 与后端 PortfolioNationalTeacherSyncDirectionEnum 逐值对齐 */
export enum PortfolioNationalTeacherSyncDirectionEnum {
  OUTBOUND = 'OUTBOUND',
  INBOUND = 'INBOUND',
}

export const ALL_PORTFOLIO_NATIONAL_TEACHER_SYNC_DIRECTION_ENUMS: readonly PortfolioNationalTeacherSyncDirectionEnum[] = [
  PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND,
  PortfolioNationalTeacherSyncDirectionEnum.INBOUND,
]

export const PortfolioNationalTeacherSyncDirectionDescription: Record<
  PortfolioNationalTeacherSyncDirectionEnum,
  string
> = {
  [PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND]: '上报',
  [PortfolioNationalTeacherSyncDirectionEnum.INBOUND]: '回流',
}
