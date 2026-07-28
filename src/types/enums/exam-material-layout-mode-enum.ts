/** 制卷形态 - ExamMaterialLayoutMode */
export enum ExamMaterialLayoutModeCode {
  ANSWER_SHEET = 'ANSWER_SHEET',
  FULL_PAPER = 'FULL_PAPER',
}

export const ALL_EXAM_MATERIAL_LAYOUT_MODE_CODES: readonly ExamMaterialLayoutModeCode[] = [
  ExamMaterialLayoutModeCode.ANSWER_SHEET,
  ExamMaterialLayoutModeCode.FULL_PAPER,
]

export const ExamMaterialLayoutModeDescription: Record<ExamMaterialLayoutModeCode, string> = {
  [ExamMaterialLayoutModeCode.ANSWER_SHEET]: '试卷+答题页',
  [ExamMaterialLayoutModeCode.FULL_PAPER]: '单独试卷',
}
