/** 师德事件类型 - PortfolioEthicsEventTypeEnum */
export enum PortfolioEthicsEventTypeCode {
  TEACHING_ACCIDENT = 'TEACHING_ACCIDENT',
  ACADEMIC_MISCONDUCT = 'ACADEMIC_MISCONDUCT',
  TEACHER_ETHICS_VIOLATION = 'TEACHER_ETHICS_VIOLATION',
  OTHER = 'OTHER',
}

export const ALL_PORTFOLIO_ETHICS_EVENT_TYPE_CODES: readonly PortfolioEthicsEventTypeCode[] = [
  PortfolioEthicsEventTypeCode.TEACHING_ACCIDENT,
  PortfolioEthicsEventTypeCode.ACADEMIC_MISCONDUCT,
  PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION,
  PortfolioEthicsEventTypeCode.OTHER,
]

export const PortfolioEthicsEventTypeDescription: Record<PortfolioEthicsEventTypeCode, string> = {
  [PortfolioEthicsEventTypeCode.TEACHING_ACCIDENT]: '教学事故',
  [PortfolioEthicsEventTypeCode.ACADEMIC_MISCONDUCT]: '学术不端',
  [PortfolioEthicsEventTypeCode.TEACHER_ETHICS_VIOLATION]: '师德失范',
  [PortfolioEthicsEventTypeCode.OTHER]: '其他',
}
