/** 部门一张表教师分段编码 - PortfolioDeptTeacherSegmentCodeEnum */
export enum PortfolioDeptTeacherSegmentCode {
  NEEDS_SUPPORT = 'NEEDS_SUPPORT',
  HIGH_POTENTIAL = 'HIGH_POTENTIAL',
  DATA_ANOMALY = 'DATA_ANOMALY',
}

export const PortfolioDeptTeacherSegmentDescription: Record<
  PortfolioDeptTeacherSegmentCode,
  string
> = {
  [PortfolioDeptTeacherSegmentCode.NEEDS_SUPPORT]: '亟需帮扶',
  [PortfolioDeptTeacherSegmentCode.HIGH_POTENTIAL]: '潜力教师',
  [PortfolioDeptTeacherSegmentCode.DATA_ANOMALY]: '数据异常',
}

export const ALL_PORTFOLIO_DEPT_TEACHER_SEGMENT_CODES: PortfolioDeptTeacherSegmentCode[] = [
  PortfolioDeptTeacherSegmentCode.NEEDS_SUPPORT,
  PortfolioDeptTeacherSegmentCode.HIGH_POTENTIAL,
  PortfolioDeptTeacherSegmentCode.DATA_ANOMALY,
]
