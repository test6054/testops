/** 评价工作组层级 - WorkgroupLevelEnum */
export enum WorkgroupLevelCode {
  UNIVERSITY = 'UNIVERSITY',
  COLLEGE = 'COLLEGE',
  PROGRAM = 'PROGRAM',
  INDUSTRY = 'INDUSTRY',
}

export const ALL_WORKGROUP_LEVEL_CODES: readonly WorkgroupLevelCode[] = [
  WorkgroupLevelCode.UNIVERSITY,
  WorkgroupLevelCode.COLLEGE,
  WorkgroupLevelCode.PROGRAM,
  WorkgroupLevelCode.INDUSTRY,
]

export const WorkgroupLevelDescription: Record<WorkgroupLevelCode, string> = {
  [WorkgroupLevelCode.UNIVERSITY]: '学校级',
  [WorkgroupLevelCode.COLLEGE]: '学院级',
  [WorkgroupLevelCode.PROGRAM]: '专业级',
  [WorkgroupLevelCode.INDUSTRY]: '行业企业专家组',
}
