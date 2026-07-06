/** 归档卷自动建卷待重试队列状态 */
export enum ArchiveVolumeAutoCreatePendingStatusCode {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
}
