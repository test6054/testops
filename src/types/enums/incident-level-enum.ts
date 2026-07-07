/** IncidentLevel */
export enum IncidentLevelCode {
  BLOCKING = 'BLOCKING',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export const ALL_INCIDENT_LEVEL_CODES: readonly IncidentLevelCode[] = [
  IncidentLevelCode.BLOCKING,
  IncidentLevelCode.REVIEW_REQUIRED,
  IncidentLevelCode.WARNING,
  IncidentLevelCode.INFO,
]

export const IncidentLevelDescription: Record<IncidentLevelCode, string> = {
  [IncidentLevelCode.BLOCKING]: '阻断',
  [IncidentLevelCode.REVIEW_REQUIRED]: '需复核',
  [IncidentLevelCode.WARNING]: '警告',
  [IncidentLevelCode.INFO]: '提示',
}
