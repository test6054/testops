/** 抽检结论 */
export enum SpotCheckConclusionCode {
  PASSED = 'PASSED',
  ABNORMAL = 'ABNORMAL',
}

export const ALL_SPOT_CHECK_CONCLUSION_CODES: readonly SpotCheckConclusionCode[] = [
  SpotCheckConclusionCode.PASSED,
  SpotCheckConclusionCode.ABNORMAL,
]

export const SpotCheckConclusionDescription: Record<SpotCheckConclusionCode, string> = {
  [SpotCheckConclusionCode.PASSED]: '一致通过',
  [SpotCheckConclusionCode.ABNORMAL]: '判分异常',
}

