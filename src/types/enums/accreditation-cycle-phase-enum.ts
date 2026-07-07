/** 认证周期阶段 - AccreditationCyclePhaseEnum */
export enum AccreditationCyclePhaseCode {
  SELF_EVALUATION = 'SELF_EVALUATION',
  SELF_ASSESSMENT_REVIEW = 'SELF_ASSESSMENT_REVIEW',
  ONSITE_VISIT = 'ONSITE_VISIT',
  CONCLUSION = 'CONCLUSION',
  MAINTENANCE = 'MAINTENANCE',
}

export const ALL_ACCREDITATION_CYCLE_PHASE_CODES: readonly AccreditationCyclePhaseCode[] = [
  AccreditationCyclePhaseCode.SELF_EVALUATION,
  AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW,
  AccreditationCyclePhaseCode.ONSITE_VISIT,
  AccreditationCyclePhaseCode.CONCLUSION,
  AccreditationCyclePhaseCode.MAINTENANCE,
]

export const AccreditationCyclePhaseDescription: Record<AccreditationCyclePhaseCode, string> = {
  [AccreditationCyclePhaseCode.SELF_EVALUATION]: '校内自评',
  [AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW]: '自评审阅',
  [AccreditationCyclePhaseCode.ONSITE_VISIT]: '现场考查',
  [AccreditationCyclePhaseCode.CONCLUSION]: '认证结论',
  [AccreditationCyclePhaseCode.MAINTENANCE]: '保持改进',
}
