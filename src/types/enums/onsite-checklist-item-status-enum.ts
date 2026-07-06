/** 现场考查清单项状态 - OnsiteChecklistItemStatusEnum */
export enum OnsiteChecklistItemStatusCode {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export const ALL_ONSITE_CHECKLIST_ITEM_STATUS_CODES: readonly OnsiteChecklistItemStatusCode[] = [
  OnsiteChecklistItemStatusCode.PENDING,
  OnsiteChecklistItemStatusCode.IN_PROGRESS,
  OnsiteChecklistItemStatusCode.COMPLETED,
  OnsiteChecklistItemStatusCode.NOT_APPLICABLE,
]

export const OnsiteChecklistItemStatusDescription: Record<OnsiteChecklistItemStatusCode, string> = {
  [OnsiteChecklistItemStatusCode.PENDING]: '待准备',
  [OnsiteChecklistItemStatusCode.IN_PROGRESS]: '准备中',
  [OnsiteChecklistItemStatusCode.COMPLETED]: '已完成',
  [OnsiteChecklistItemStatusCode.NOT_APPLICABLE]: '不适用',
}

