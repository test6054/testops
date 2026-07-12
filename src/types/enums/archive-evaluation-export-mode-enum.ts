/** 迎评材料包导出执行模式 */
export enum ArchiveEvaluationExportModeCode {
  SYNC = 'SYNC',
  ASYNC = 'ASYNC',
}

export const ALL_ARCHIVE_EVALUATION_EXPORT_MODE_CODES: readonly ArchiveEvaluationExportModeCode[] = [
  ArchiveEvaluationExportModeCode.SYNC,
  ArchiveEvaluationExportModeCode.ASYNC,
]

export const ArchiveEvaluationExportModeDescription: Record<ArchiveEvaluationExportModeCode, string> = {
  [ArchiveEvaluationExportModeCode.SYNC]: '同步导出',
  [ArchiveEvaluationExportModeCode.ASYNC]: '异步导出',
}
