/** 双师认定申请状态 */
export enum PortfolioDualTeacherApplicationStatusCode {
  DRAFT = 'DRAFT',
  COLLEGE_PENDING = 'COLLEGE_PENDING',
  COLLEGE_RETURNED = 'COLLEGE_RETURNED',
  ACADEMIC_PENDING = 'ACADEMIC_PENDING',
  ACADEMIC_RETURNED = 'ACADEMIC_RETURNED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const ALL_PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_CODES: readonly PortfolioDualTeacherApplicationStatusCode[] = [
  PortfolioDualTeacherApplicationStatusCode.DRAFT,
  PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING,
  PortfolioDualTeacherApplicationStatusCode.COLLEGE_RETURNED,
  PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING,
  PortfolioDualTeacherApplicationStatusCode.ACADEMIC_RETURNED,
  PortfolioDualTeacherApplicationStatusCode.APPROVED,
  PortfolioDualTeacherApplicationStatusCode.REJECTED,
]

export const PortfolioDualTeacherApplicationStatusDescription: Record<PortfolioDualTeacherApplicationStatusCode, string> = {
  [PortfolioDualTeacherApplicationStatusCode.DRAFT]: '草稿',
  [PortfolioDualTeacherApplicationStatusCode.COLLEGE_PENDING]: '待院审',
  [PortfolioDualTeacherApplicationStatusCode.COLLEGE_RETURNED]: '院审退回',
  [PortfolioDualTeacherApplicationStatusCode.ACADEMIC_PENDING]: '待教务终审',
  [PortfolioDualTeacherApplicationStatusCode.ACADEMIC_RETURNED]: '教务退回',
  [PortfolioDualTeacherApplicationStatusCode.APPROVED]: '认定通过',
  [PortfolioDualTeacherApplicationStatusCode.REJECTED]: '认定驳回',
}
