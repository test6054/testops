/** 考后材料扫描范围。 */
export enum ExamScanMaterialScopeCode {
  ANSWER_BOOKLET_ONLY = 'ANSWER_BOOKLET_ONLY',
  QUESTION_AND_ANSWER = 'QUESTION_AND_ANSWER',
  QUESTION_PAPER_ONLY = 'QUESTION_PAPER_ONLY',
}

export const ExamScanMaterialScopeOptions = [
  { value: ExamScanMaterialScopeCode.ANSWER_BOOKLET_ONLY, label: '只扫描答题纸' },
  { value: ExamScanMaterialScopeCode.QUESTION_AND_ANSWER, label: '试题卷与答题纸都扫描' },
  { value: ExamScanMaterialScopeCode.QUESTION_PAPER_ONLY, label: '只扫描试题卷' },
]
