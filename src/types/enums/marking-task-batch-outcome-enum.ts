/** 阅卷批量提交结果 */
export enum MarkingTaskBatchOutcomeCode {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  WARN = 'WARN',
}

export const ALL_MARKING_TASK_BATCH_OUTCOME_CODES: readonly MarkingTaskBatchOutcomeCode[] = [
  MarkingTaskBatchOutcomeCode.SUCCESS,
  MarkingTaskBatchOutcomeCode.FAILED,
  MarkingTaskBatchOutcomeCode.WARN,
]

export const MarkingTaskBatchOutcomeDescription: Record<MarkingTaskBatchOutcomeCode, string> = {
  [MarkingTaskBatchOutcomeCode.SUCCESS]: '全部成功',
  [MarkingTaskBatchOutcomeCode.FAILED]: '提交失败',
  [MarkingTaskBatchOutcomeCode.WARN]: '给分成功批注告警',
}

