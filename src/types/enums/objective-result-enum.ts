/** 客观题判定结果 */
export enum ObjectiveResultCode {
  CORRECT = 'CORRECT',
  WRONG = 'WRONG',
  NEED_REVIEW = 'NEED_REVIEW',
}

export const ALL_OBJECTIVE_RESULT_CODES: readonly ObjectiveResultCode[] = [
  ObjectiveResultCode.CORRECT,
  ObjectiveResultCode.WRONG,
  ObjectiveResultCode.NEED_REVIEW,
]

export const ObjectiveResultDescription: Record<ObjectiveResultCode, string> = {
  [ObjectiveResultCode.CORRECT]: '正确',
  [ObjectiveResultCode.WRONG]: '错误',
  [ObjectiveResultCode.NEED_REVIEW]: '待复核',
}

