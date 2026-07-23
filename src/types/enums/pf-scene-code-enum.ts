/** 指标场景编码 - PfSceneCodeEnum（唯一真源） */
export enum PfSceneCode {
  DEFAULT = 'DEFAULT',
  PERFORMANCE = 'PERFORMANCE',
  TITLE = 'TITLE',
  DUAL_TEACHER = 'DUAL_TEACHER',
  DOUBLE_HIGH = 'DOUBLE_HIGH',
  PORTRAIT = 'PORTRAIT',
  DEVELOPMENT_PLAN = 'DEVELOPMENT_PLAN',
  EVALUATION = 'EVALUATION',
}

export const ALL_PF_SCENE_CODES: readonly PfSceneCode[] = [
  PfSceneCode.DEFAULT,
  PfSceneCode.PERFORMANCE,
  PfSceneCode.TITLE,
  PfSceneCode.DUAL_TEACHER,
  PfSceneCode.DOUBLE_HIGH,
  PfSceneCode.PORTRAIT,
  PfSceneCode.DEVELOPMENT_PLAN,
  PfSceneCode.EVALUATION,
]

export const PF_MODEL_SCENE_CODES: readonly PfSceneCode[] = [
  PfSceneCode.DEFAULT,
  PfSceneCode.PERFORMANCE,
  PfSceneCode.TITLE,
  PfSceneCode.DUAL_TEACHER,
  PfSceneCode.DOUBLE_HIGH,
]

export const PF_BUSINESS_REFERENCE_SCENE_CODES: readonly PfSceneCode[] = [
  PfSceneCode.PORTRAIT,
  PfSceneCode.DEVELOPMENT_PLAN,
  PfSceneCode.EVALUATION,
]

export const PfSceneCodeDescription: Record<PfSceneCode, string> = {
  [PfSceneCode.DEFAULT]: '默认',
  [PfSceneCode.PERFORMANCE]: '绩效',
  [PfSceneCode.TITLE]: '职称',
  [PfSceneCode.DUAL_TEACHER]: '双师',
  [PfSceneCode.DOUBLE_HIGH]: '双高',
  [PfSceneCode.PORTRAIT]: '教师画像',
  [PfSceneCode.DEVELOPMENT_PLAN]: '年度规划',
  [PfSceneCode.EVALUATION]: '多元评价',
}
