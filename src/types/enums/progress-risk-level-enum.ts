/** 阅卷进度风险等级 */
export enum ProgressRiskLevelCode {
  NORMAL = 'NORMAL',
  LOW_RISK = 'LOW_RISK',
  MEDIUM_RISK = 'MEDIUM_RISK',
  HIGH_RISK = 'HIGH_RISK',
}

export const ALL_PROGRESS_RISK_LEVEL_CODES: readonly ProgressRiskLevelCode[] = [
  ProgressRiskLevelCode.NORMAL,
  ProgressRiskLevelCode.LOW_RISK,
  ProgressRiskLevelCode.MEDIUM_RISK,
  ProgressRiskLevelCode.HIGH_RISK,
]

export const ProgressRiskLevelDescription: Record<ProgressRiskLevelCode, string> = {
  [ProgressRiskLevelCode.NORMAL]: '正常',
  [ProgressRiskLevelCode.LOW_RISK]: '低风险',
  [ProgressRiskLevelCode.MEDIUM_RISK]: '中风险',
  [ProgressRiskLevelCode.HIGH_RISK]: '高风险',
}
