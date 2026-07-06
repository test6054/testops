/** 阅卷分配单元 */
export enum AllocationUnitCode {
  WHOLE_PAPER = 'WHOLE_PAPER',
  SELECTED_QUESTIONS = 'SELECTED_QUESTIONS',
  RANDOM_QUESTIONS = 'RANDOM_QUESTIONS',
}

export const ALL_ALLOCATION_UNIT_CODES: readonly AllocationUnitCode[] = [
  AllocationUnitCode.WHOLE_PAPER,
  AllocationUnitCode.SELECTED_QUESTIONS,
  AllocationUnitCode.RANDOM_QUESTIONS,
]
export const AllocationUnitDescription: Record<AllocationUnitCode, string> = {
  [AllocationUnitCode.WHOLE_PAPER]: '整卷批阅',
  [AllocationUnitCode.SELECTED_QUESTIONS]: '选中试题批阅',
  [AllocationUnitCode.RANDOM_QUESTIONS]: '随机题目批阅',
}
