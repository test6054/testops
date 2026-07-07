/** 重大事件类型 */
export enum IncidentTypeCode {
  DUPLICATE_DETECTED = 'DUPLICATE_DETECTED',
  BINDING_CONFLICT = 'BINDING_CONFLICT',
  SCAN_BATCH_REPROCESS = 'SCAN_BATCH_REPROCESS',
  SCORE_ANOMALY = 'SCORE_ANOMALY',
  MISSING_SCAN_PAGE = 'MISSING_SCAN_PAGE',
  EXTRA_SCAN_PAGE = 'EXTRA_SCAN_PAGE',
  MISSING_CANDIDATE_BINDING = 'MISSING_CANDIDATE_BINDING',
  MESSAGE_DELIVERY_FAILED = 'MESSAGE_DELIVERY_FAILED',
}

export const ALL_INCIDENT_TYPE_CODES: readonly IncidentTypeCode[] = [
  IncidentTypeCode.DUPLICATE_DETECTED,
  IncidentTypeCode.BINDING_CONFLICT,
  IncidentTypeCode.SCAN_BATCH_REPROCESS,
  IncidentTypeCode.SCORE_ANOMALY,
  IncidentTypeCode.MISSING_SCAN_PAGE,
  IncidentTypeCode.EXTRA_SCAN_PAGE,
  IncidentTypeCode.MISSING_CANDIDATE_BINDING,
  IncidentTypeCode.MESSAGE_DELIVERY_FAILED,
]

export const IncidentTypeDescription: Record<IncidentTypeCode, string> = {
  [IncidentTypeCode.DUPLICATE_DETECTED]: '重复检测',
  [IncidentTypeCode.BINDING_CONFLICT]: '绑定冲突',
  [IncidentTypeCode.SCAN_BATCH_REPROCESS]: '异常批次重处理',
  [IncidentTypeCode.SCORE_ANOMALY]: '分数异常',
  [IncidentTypeCode.MISSING_SCAN_PAGE]: '扫描页缺失',
  [IncidentTypeCode.EXTRA_SCAN_PAGE]: '扫描页超出',
  [IncidentTypeCode.MISSING_CANDIDATE_BINDING]: '考生未绑定',
  [IncidentTypeCode.MESSAGE_DELIVERY_FAILED]: '通知投递失败',
}

