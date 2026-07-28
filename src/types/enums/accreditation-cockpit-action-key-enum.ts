/**
 * 认证驾驶舱条款整改动作键 — 对齐后端 AccreditationCockpitActionKeyEnum
 */
export enum AccreditationCockpitActionKeyCode {
  OPEN_TRAINING_PLAN_WORKBENCH = 'OPEN_TRAINING_PLAN_WORKBENCH',
  OPEN_COURSE_MATRIX = 'OPEN_COURSE_MATRIX',
  OPEN_SUPPORT_TAB = 'OPEN_SUPPORT_TAB',
  OPEN_IMPROVEMENT = 'OPEN_IMPROVEMENT',
  OPEN_EVIDENCE_TAB = 'OPEN_EVIDENCE_TAB',
  NONE = 'NONE',
}

export const ALL_ACCREDITATION_COCKPIT_ACTION_KEY_CODES
  = [
    AccreditationCockpitActionKeyCode.OPEN_TRAINING_PLAN_WORKBENCH,
    AccreditationCockpitActionKeyCode.OPEN_COURSE_MATRIX,
    AccreditationCockpitActionKeyCode.OPEN_SUPPORT_TAB,
    AccreditationCockpitActionKeyCode.OPEN_IMPROVEMENT,
    AccreditationCockpitActionKeyCode.OPEN_EVIDENCE_TAB,
    AccreditationCockpitActionKeyCode.NONE,
  ] as const

export const AccreditationCockpitActionKeyDescription: Record<
  AccreditationCockpitActionKeyCode,
  string
> = {
  [AccreditationCockpitActionKeyCode.OPEN_TRAINING_PLAN_WORKBENCH]: '培养方案工作台',
  [AccreditationCockpitActionKeyCode.OPEN_COURSE_MATRIX]: '课程矩阵',
  [AccreditationCockpitActionKeyCode.OPEN_SUPPORT_TAB]: '师资与支持',
  [AccreditationCockpitActionKeyCode.OPEN_IMPROVEMENT]: '持续改进',
  [AccreditationCockpitActionKeyCode.OPEN_EVIDENCE_TAB]: '专家材料证据',
  [AccreditationCockpitActionKeyCode.NONE]: '无动作',
}
