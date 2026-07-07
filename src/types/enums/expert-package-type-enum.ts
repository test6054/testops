/** 专家材料包类型 */
export enum ExpertPackageTypeCode {
  REQUIREMENT = 'REQUIREMENT',
  PROGRAM_ACCREDITATION = 'PROGRAM_ACCREDITATION',
}

export const ALL_EXPERT_PACKAGE_TYPE_CODES: readonly ExpertPackageTypeCode[] = [
  ExpertPackageTypeCode.REQUIREMENT,
  ExpertPackageTypeCode.PROGRAM_ACCREDITATION,
]

export const ExpertPackageTypeDescription: Record<ExpertPackageTypeCode, string> = {
  [ExpertPackageTypeCode.REQUIREMENT]: '按毕业要求整包',
  [ExpertPackageTypeCode.PROGRAM_ACCREDITATION]: '按专业认证整包',
}
