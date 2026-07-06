/** 评价周期 - EvaluationCycleEnum */
export enum EvaluationCycleCode {
  SEMESTER = 'SEMESTER',
  YEAR = 'YEAR',
  BIENNIAL = 'BIENNIAL',
  TRIENNIAL = 'TRIENNIAL',
  PROGRAM_CYCLE = 'PROGRAM_CYCLE',
}

export const ALL_EVALUATION_CYCLE_CODES: readonly EvaluationCycleCode[] = [
  EvaluationCycleCode.SEMESTER,
  EvaluationCycleCode.YEAR,
  EvaluationCycleCode.BIENNIAL,
  EvaluationCycleCode.TRIENNIAL,
  EvaluationCycleCode.PROGRAM_CYCLE,
]

export const EvaluationCycleDescription: Record<EvaluationCycleCode, string> = {
  [EvaluationCycleCode.SEMESTER]: '按学期',
  [EvaluationCycleCode.YEAR]: '按学年',
  [EvaluationCycleCode.BIENNIAL]: '每两年',
  [EvaluationCycleCode.TRIENNIAL]: '每三年',
  [EvaluationCycleCode.PROGRAM_CYCLE]: '按培养周期',
}
