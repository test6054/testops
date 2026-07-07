/** 本地 Scanner Agent 扫描任务状态 */
export enum LocalScanJobStatusCode {
  CREATED = 'CREATED',
  SCANNING = 'SCANNING',
  PAUSED = 'PAUSED',
  READYTOUPLOAD = 'READYTOUPLOAD',
  UPLOADING = 'UPLOADING',
  REPORTED = 'REPORTED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
}

export const ALL_LOCAL_SCAN_JOB_STATUS_CODES: readonly LocalScanJobStatusCode[] = [
  LocalScanJobStatusCode.CREATED,
  LocalScanJobStatusCode.SCANNING,
  LocalScanJobStatusCode.PAUSED,
  LocalScanJobStatusCode.READYTOUPLOAD,
  LocalScanJobStatusCode.UPLOADING,
  LocalScanJobStatusCode.REPORTED,
  LocalScanJobStatusCode.FAILED,
  LocalScanJobStatusCode.RETRYING,
  LocalScanJobStatusCode.CANCELLED,
]

/** 一体机现场操作语义文案，不直接暴露 Agent 状态编码 */
export const LocalScanJobStatusDescription: Record<LocalScanJobStatusCode, string> = {
  [LocalScanJobStatusCode.CREATED]: '已创建',
  [LocalScanJobStatusCode.SCANNING]: '扫描中',
  [LocalScanJobStatusCode.PAUSED]: '已暂停',
  [LocalScanJobStatusCode.READYTOUPLOAD]: '待上传',
  [LocalScanJobStatusCode.UPLOADING]: '上传中',
  [LocalScanJobStatusCode.REPORTED]: '已上报',
  [LocalScanJobStatusCode.FAILED]: '处理失败',
  [LocalScanJobStatusCode.RETRYING]: '重试中',
  [LocalScanJobStatusCode.CANCELLED]: '已取消',
}
