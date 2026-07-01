/** 质量评价页上下文维度（路由 meta.scopeProfile） */
export type QualityScopeProfile
  = | 'none'
    | 'program'
    | 'plan'
    | 'plan-period'
    | 'plan-course'
    | 'accreditation'

/** Publish 类路由门控（与 scopeProfile 正交） */
export type QualityGate = 'plan-confirmed'

export type QualityStoreScopeField
  = | 'currentProgramId'
    | 'currentTrainingPlanId'
    | 'currentSchoolYear'
    | 'currentSemester'
    | 'currentQualityCourseId'

export const DEFAULT_SCOPE_WATCH_FIELDS: Record<QualityScopeProfile, QualityStoreScopeField[]> = {
  none: [],
  program: ['currentProgramId'],
  plan: ['currentProgramId', 'currentTrainingPlanId'],
  'plan-period': [
    'currentProgramId',
    'currentTrainingPlanId',
    'currentSchoolYear',
    'currentSemester',
  ],
  'plan-course': [
    'currentProgramId',
    'currentTrainingPlanId',
    'currentSchoolYear',
    'currentSemester',
    'currentQualityCourseId',
  ],
  accreditation: ['currentProgramId', 'currentTrainingPlanId'],
}

/** 含 plan 维度的 profile，用于 qualityGate 契约校验 */
export const PLAN_DIMENSION_PROFILES: QualityScopeProfile[] = [
  'plan',
  'plan-period',
  'plan-course',
  'accreditation',
]

export function scopeProfileShowsChrome(profile: QualityScopeProfile): boolean {
  return profile !== 'none'
}

export function scopeProfileNeedsPlan(profile: QualityScopeProfile): boolean {
  return PLAN_DIMENSION_PROFILES.includes(profile)
}

export const SEMESTER_OPTIONS = [
  { value: '1', label: '秋季学期' },
  { value: '2', label: '春季学期' },
  { value: '3', label: '夏季短学期' },
] as const
