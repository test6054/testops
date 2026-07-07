/** 重大事件来源类型 */
export enum IncidentSourceTypeCode {
  IMAGE_LEDGER = 'IMAGE_LEDGER',
  SCAN_BATCH = 'SCAN_BATCH',
  SCANNED_PAGE = 'SCANNED_PAGE',
  PROCESSING_TASK = 'PROCESSING_TASK',
  DUPLICATE_RESOLUTION = 'DUPLICATE_RESOLUTION',
  GRADE_RESULT = 'GRADE_RESULT',
  MESSAGE_NOTIFICATION = 'MESSAGE_NOTIFICATION',
  PAPER_INSTANCE = 'PAPER_INSTANCE',
}

export const ALL_INCIDENT_SOURCE_TYPE_CODES: readonly IncidentSourceTypeCode[] = [
  IncidentSourceTypeCode.IMAGE_LEDGER,
  IncidentSourceTypeCode.SCAN_BATCH,
  IncidentSourceTypeCode.SCANNED_PAGE,
  IncidentSourceTypeCode.PROCESSING_TASK,
  IncidentSourceTypeCode.DUPLICATE_RESOLUTION,
  IncidentSourceTypeCode.GRADE_RESULT,
  IncidentSourceTypeCode.MESSAGE_NOTIFICATION,
  IncidentSourceTypeCode.PAPER_INSTANCE,
]

export const IncidentSourceTypeDescription: Record<IncidentSourceTypeCode, string> = {
  [IncidentSourceTypeCode.IMAGE_LEDGER]: '影像账本',
  [IncidentSourceTypeCode.SCAN_BATCH]: '扫描批次',
  [IncidentSourceTypeCode.SCANNED_PAGE]: '扫描页',
  [IncidentSourceTypeCode.PROCESSING_TASK]: '处理任务',
  [IncidentSourceTypeCode.DUPLICATE_RESOLUTION]: '重复页处置',
  [IncidentSourceTypeCode.GRADE_RESULT]: '评分结果',
  [IncidentSourceTypeCode.MESSAGE_NOTIFICATION]: '站内信通知',
  [IncidentSourceTypeCode.PAPER_INSTANCE]: '试卷实例',
}

