/** 人事就业状态 - PortfolioHrEmploymentStatusEnum（唯一合同码，禁止中文/别名解析） */
export enum PortfolioHrEmploymentStatusCode {
  ACTIVE = 'ACTIVE',
  LEFT = 'LEFT',
  RETIRED = 'RETIRED',
  TRANSFERRED_OUT = 'TRANSFERRED_OUT',
  STUDY_LEAVE = 'STUDY_LEAVE',
  SECONDMENT = 'SECONDMENT',
  LONG_SICK_LEAVE = 'LONG_SICK_LEAVE',
  REHIRED = 'REHIRED',
  RESUME_FROM_HOLD = 'RESUME_FROM_HOLD',
  CANCEL_TRANSFER_OUT = 'CANCEL_TRANSFER_OUT',
}

export const PortfolioHrEmploymentStatusDescription: Record<
  PortfolioHrEmploymentStatusCode,
  string
> = {
  [PortfolioHrEmploymentStatusCode.ACTIVE]: '在职',
  [PortfolioHrEmploymentStatusCode.LEFT]: '离职',
  [PortfolioHrEmploymentStatusCode.RETIRED]: '退休',
  [PortfolioHrEmploymentStatusCode.TRANSFERRED_OUT]: '调出',
  [PortfolioHrEmploymentStatusCode.STUDY_LEAVE]: '访学',
  [PortfolioHrEmploymentStatusCode.SECONDMENT]: '挂职',
  [PortfolioHrEmploymentStatusCode.LONG_SICK_LEAVE]: '长期病假',
  [PortfolioHrEmploymentStatusCode.REHIRED]: '返聘',
  [PortfolioHrEmploymentStatusCode.RESUME_FROM_HOLD]: '恢复在职',
  [PortfolioHrEmploymentStatusCode.CANCEL_TRANSFER_OUT]: '撤销调出',
}
