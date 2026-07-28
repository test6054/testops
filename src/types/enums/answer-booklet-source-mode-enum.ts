/** 答题纸来源。 */
export enum AnswerBookletSourceModeCode {
  SYSTEM_GENERATED = 'SYSTEM_GENERATED',
  INSTITUTION_TEMPLATE = 'INSTITUTION_TEMPLATE',
}

export const AnswerBookletSourceModeOptions = [
  { value: AnswerBookletSourceModeCode.SYSTEM_GENERATED, label: '系统生成答题纸' },
  { value: AnswerBookletSourceModeCode.INSTITUTION_TEMPLATE, label: '学校统一答题纸' },
]
