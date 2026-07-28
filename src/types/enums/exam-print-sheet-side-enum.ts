/** 制卷物理印张面，与后端 ExamPrintSheetSide 逐值一致。 */
export enum ExamPrintSheetSideCode {
  SINGLE = 'SINGLE',
  FRONT = 'FRONT',
  BACK = 'BACK',
}

export const ExamPrintSheetSideDescription: Record<ExamPrintSheetSideCode, string> = {
  [ExamPrintSheetSideCode.SINGLE]: '单面',
  [ExamPrintSheetSideCode.FRONT]: '正面',
  [ExamPrintSheetSideCode.BACK]: '反面',
}
