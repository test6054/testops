/** OBE 旅程步骤键 - ObeJourneyStepKeyEnum */
export enum ObeJourneyStepKeyCode {
  CONFIG = 'CONFIG',
  PLAN = 'PLAN',
  DATA = 'DATA',
  CALC = 'CALC',
  AUDIT = 'AUDIT',
  IMPROVE = 'IMPROVE',
  ARCHIVE = 'ARCHIVE',
}

export const ALL_OBE_JOURNEY_STEP_KEY_CODES: readonly ObeJourneyStepKeyCode[] = [
  ObeJourneyStepKeyCode.CONFIG,
  ObeJourneyStepKeyCode.PLAN,
  ObeJourneyStepKeyCode.DATA,
  ObeJourneyStepKeyCode.CALC,
  ObeJourneyStepKeyCode.AUDIT,
  ObeJourneyStepKeyCode.IMPROVE,
  ObeJourneyStepKeyCode.ARCHIVE,
]

export const ObeJourneyStepKeyDescription: Record<ObeJourneyStepKeyCode, string> = {
  [ObeJourneyStepKeyCode.CONFIG]: '专业配置',
  [ObeJourneyStepKeyCode.PLAN]: '培养方案',
  [ObeJourneyStepKeyCode.DATA]: '数据接入',
  [ObeJourneyStepKeyCode.CALC]: '达成度计算',
  [ObeJourneyStepKeyCode.AUDIT]: '审核确认',
  [ObeJourneyStepKeyCode.IMPROVE]: '持续改进',
  [ObeJourneyStepKeyCode.ARCHIVE]: '材料归档',
}
