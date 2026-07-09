/** 专业师资与支持条件档案状态 - ProgramSupportProfileStatusEnum */
export enum ProgramSupportProfileStatusCode {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

export const ALL_PROGRAM_SUPPORT_PROFILE_STATUS_CODES: readonly ProgramSupportProfileStatusCode[] = [
  ProgramSupportProfileStatusCode.DRAFT,
  ProgramSupportProfileStatusCode.CONFIRMED,
]

export const ProgramSupportProfileStatusDescription: Record<ProgramSupportProfileStatusCode, string> = {
  [ProgramSupportProfileStatusCode.DRAFT]: '草稿',
  [ProgramSupportProfileStatusCode.CONFIRMED]: '已确认',
}
