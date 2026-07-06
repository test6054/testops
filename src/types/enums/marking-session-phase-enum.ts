/** 阅卷会话阶段 */
export enum MarkingSessionPhaseCode {
  TRIAL = 'TRIAL',
  FORMAL = 'FORMAL',
}

export const ALL_MARKING_SESSION_PHASE_CODES: readonly MarkingSessionPhaseCode[] = [
  MarkingSessionPhaseCode.TRIAL,
  MarkingSessionPhaseCode.FORMAL,
]
export const MarkingSessionPhaseDescription: Record<MarkingSessionPhaseCode, string> = {
  [MarkingSessionPhaseCode.TRIAL]: '试评',
  [MarkingSessionPhaseCode.FORMAL]: '正评',
}
