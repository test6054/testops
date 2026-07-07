/** 归档材料 OCR 状态 */
export enum ArchiveMaterialOcrStatusCode {
  NONE = 'NONE',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_ARCHIVE_MATERIAL_OCR_STATUS_CODES: readonly ArchiveMaterialOcrStatusCode[] = [
  ArchiveMaterialOcrStatusCode.NONE,
  ArchiveMaterialOcrStatusCode.PENDING,
  ArchiveMaterialOcrStatusCode.RUNNING,
  ArchiveMaterialOcrStatusCode.COMPLETED,
  ArchiveMaterialOcrStatusCode.FAILED,
]

export const ArchiveMaterialOcrStatusDescription: Record<ArchiveMaterialOcrStatusCode, string> = {
  [ArchiveMaterialOcrStatusCode.NONE]: '未识别',
  [ArchiveMaterialOcrStatusCode.PENDING]: '待识别',
  [ArchiveMaterialOcrStatusCode.RUNNING]: '识别中',
  [ArchiveMaterialOcrStatusCode.COMPLETED]: '识别完成',
  [ArchiveMaterialOcrStatusCode.FAILED]: '识别失败',
}

