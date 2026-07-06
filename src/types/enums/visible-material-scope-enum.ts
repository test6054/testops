/** 学生可见材料范围 */
export enum VisibleMaterialScopeCode {
  SCORE_ONLY = 'SCORE_ONLY',
  SCORE_AND_ANNOTATION = 'SCORE_AND_ANNOTATION',
  FULL = 'FULL',
}

export const ALL_VISIBLE_MATERIAL_SCOPE_CODES: readonly VisibleMaterialScopeCode[] = [
  VisibleMaterialScopeCode.SCORE_ONLY,
  VisibleMaterialScopeCode.SCORE_AND_ANNOTATION,
  VisibleMaterialScopeCode.FULL,
]

export const VisibleMaterialScopeDescription: Record<VisibleMaterialScopeCode, string> = {
  [VisibleMaterialScopeCode.SCORE_ONLY]: '仅成绩',
  [VisibleMaterialScopeCode.SCORE_AND_ANNOTATION]: '成绩和批注',
  [VisibleMaterialScopeCode.FULL]: '完整信息',
}
