/** 考生状态 */
export enum CandidateStatusCode {
  ACTIVE = 'ACTIVE',
  ABSENT = 'ABSENT',
}

export const ALL_CANDIDATE_STATUS_CODES: readonly CandidateStatusCode[] = [
  CandidateStatusCode.ACTIVE,
  CandidateStatusCode.ABSENT,
]

export const CandidateStatusDescription: Record<CandidateStatusCode, string> = {
  [CandidateStatusCode.ACTIVE]: '有效',
  [CandidateStatusCode.ABSENT]: '缺考',
}
