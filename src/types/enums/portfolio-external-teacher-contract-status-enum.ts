/** 外聘教师合同状态 - 与后端 PortfolioExternalTeacherContractStatusEnum 一致 */
export enum PortfolioExternalTeacherContractStatusCode {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  PENDING = 'PENDING',
}

export const PORTFOLIO_EXTERNAL_TEACHER_CONTRACT_STATUS_LABEL: Record<
  PortfolioExternalTeacherContractStatusCode,
  string
> = {
  [PortfolioExternalTeacherContractStatusCode.ACTIVE]: '有效',
  [PortfolioExternalTeacherContractStatusCode.EXPIRED]: '到期',
  [PortfolioExternalTeacherContractStatusCode.TERMINATED]: '终止',
  [PortfolioExternalTeacherContractStatusCode.PENDING]: '待生效',
}
