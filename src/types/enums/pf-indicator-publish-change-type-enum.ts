/** 指标发布影响变更类型 - PfIndicatorPublishChangeTypeEnum */
export enum PfIndicatorPublishChangeTypeCode {
  ADDED = 'ADDED',
  CHANGED = 'CHANGED',
  REMOVED = 'REMOVED',
}

export const ALL_PF_INDICATOR_PUBLISH_CHANGE_TYPE_CODES: readonly PfIndicatorPublishChangeTypeCode[] = [
  PfIndicatorPublishChangeTypeCode.ADDED,
  PfIndicatorPublishChangeTypeCode.CHANGED,
  PfIndicatorPublishChangeTypeCode.REMOVED,
]

export const PfIndicatorPublishChangeTypeDescription: Record<PfIndicatorPublishChangeTypeCode, string> = {
  [PfIndicatorPublishChangeTypeCode.ADDED]: '新增',
  [PfIndicatorPublishChangeTypeCode.CHANGED]: '变更',
  [PfIndicatorPublishChangeTypeCode.REMOVED]: '删除',
}
