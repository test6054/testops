/** 阅卷任务分配模式 */
export enum MarkingAllocationModeCode {
  BY_QUESTION = 'BY_QUESTION',
  BY_CLASS = 'BY_CLASS',
  ROUND_ROBIN = 'ROUND_ROBIN',
  RANDOM = 'RANDOM',
  BY_PAPER_RANDOM = 'BY_PAPER_RANDOM',
}

export const ALL_MARKING_ALLOCATION_MODE_CODES: readonly MarkingAllocationModeCode[] = [
  MarkingAllocationModeCode.BY_QUESTION,
  MarkingAllocationModeCode.BY_CLASS,
  MarkingAllocationModeCode.ROUND_ROBIN,
  MarkingAllocationModeCode.RANDOM,
  MarkingAllocationModeCode.BY_PAPER_RANDOM,
]
export const MarkingAllocationModeDescription: Record<MarkingAllocationModeCode, string> = {
  [MarkingAllocationModeCode.BY_QUESTION]: '按题目分配',
  [MarkingAllocationModeCode.BY_CLASS]: '按班级分配',
  [MarkingAllocationModeCode.ROUND_ROBIN]: '轮询分配',
  [MarkingAllocationModeCode.RANDOM]: '随机分配',
  [MarkingAllocationModeCode.BY_PAPER_RANDOM]: '整卷随机派发',
}
