/** 批注范围 */
export enum AnnotationScopeCode {
  QUESTION = 'QUESTION',
  PAGE = 'PAGE',
}

export const ALL_ANNOTATION_SCOPE_CODES: readonly AnnotationScopeCode[] = [
  AnnotationScopeCode.QUESTION,
  AnnotationScopeCode.PAGE,
]

export const AnnotationScopeDescription: Record<AnnotationScopeCode, string> = {
  [AnnotationScopeCode.QUESTION]: '题目',
  [AnnotationScopeCode.PAGE]: '页面',
}
