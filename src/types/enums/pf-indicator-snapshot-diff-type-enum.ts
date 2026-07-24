/** 指标快照 diff 变更类型 - PfIndicatorSnapshotDiffTypeEnum */
export enum PfIndicatorSnapshotDiffTypeCode {
  SAME = 'SAME',
  CHANGED = 'CHANGED',
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
}

export const PfIndicatorSnapshotDiffTypeDescription: Record<PfIndicatorSnapshotDiffTypeCode, string> = {
  [PfIndicatorSnapshotDiffTypeCode.SAME]: '未变化',
  [PfIndicatorSnapshotDiffTypeCode.CHANGED]: '变更',
  [PfIndicatorSnapshotDiffTypeCode.ADDED]: '新增',
  [PfIndicatorSnapshotDiffTypeCode.REMOVED]: '删除',
}
