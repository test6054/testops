/** 阅卷任务再分配模式 */
export enum MarkingReassignModeCode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export const ALL_MARKING_REASSIGN_MODE_CODES: readonly MarkingReassignModeCode[] = [
  MarkingReassignModeCode.AUTO,
  MarkingReassignModeCode.MANUAL,
]
export const MarkingReassignModeDescription: Record<MarkingReassignModeCode, string> = {
  [MarkingReassignModeCode.AUTO]: '自动再分配',
  [MarkingReassignModeCode.MANUAL]: '手动再分配',
}
