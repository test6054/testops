/** 指标业务引用场景 - PfIndicatorBusinessReferenceSceneEnum */
export enum PfIndicatorBusinessReferenceSceneCode {
  PORTRAIT = 'PORTRAIT',
  DEVELOPMENT_PLAN = 'DEVELOPMENT_PLAN',
  EVALUATION = 'EVALUATION',
}

export const ALL_PF_INDICATOR_BUSINESS_REFERENCE_SCENE_CODES: readonly PfIndicatorBusinessReferenceSceneCode[] = [
  PfIndicatorBusinessReferenceSceneCode.PORTRAIT,
  PfIndicatorBusinessReferenceSceneCode.DEVELOPMENT_PLAN,
  PfIndicatorBusinessReferenceSceneCode.EVALUATION,
]

export const PfIndicatorBusinessReferenceSceneDescription: Record<PfIndicatorBusinessReferenceSceneCode, string> = {
  [PfIndicatorBusinessReferenceSceneCode.PORTRAIT]: '教师画像',
  [PfIndicatorBusinessReferenceSceneCode.DEVELOPMENT_PLAN]: '年度规划',
  [PfIndicatorBusinessReferenceSceneCode.EVALUATION]: '多元评价',
}
