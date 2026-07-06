/** 指标场景编码 */
export enum PfSceneCode {
  DEFAULT = 'DEFAULT',
  PERFORMANCE = 'PERFORMANCE',
  TITLE = 'TITLE',
  DUAL_TEACHER = 'DUAL_TEACHER',
  DOUBLE_HIGH = 'DOUBLE_HIGH',
}

export const ALL_PF_SCENE_CODES: readonly PfSceneCode[] = [
  PfSceneCode.DEFAULT,
  PfSceneCode.PERFORMANCE,
  PfSceneCode.TITLE,
  PfSceneCode.DUAL_TEACHER,
  PfSceneCode.DOUBLE_HIGH,
]

export const PfSceneCodeDescription: Record<PfSceneCode, string> = {
  [PfSceneCode.DEFAULT]: '默认',
  [PfSceneCode.PERFORMANCE]: '绩效',
  [PfSceneCode.TITLE]: '职称',
  [PfSceneCode.DUAL_TEACHER]: '双师',
  [PfSceneCode.DOUBLE_HIGH]: '双高',
}
