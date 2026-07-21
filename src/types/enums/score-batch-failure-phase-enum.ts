/** 成绩导入失败阶段 - ScoreBatchFailurePhaseEnum */
export enum ScoreBatchFailurePhaseCode {
  INIT = 'INIT',
  LOAD_RELATIONS = 'LOAD_RELATIONS',
  DOWNLOAD_FILE = 'DOWNLOAD_FILE',
  PARSE_EXCEL = 'PARSE_EXCEL',
  REWRITE_RECORDS = 'REWRITE_RECORDS',
  UPDATE_BATCH_STATUS = 'UPDATE_BATCH_STATUS',
}

export const ALL_SCORE_BATCH_FAILURE_PHASE_CODES: readonly ScoreBatchFailurePhaseCode[] = [
  ScoreBatchFailurePhaseCode.INIT,
  ScoreBatchFailurePhaseCode.LOAD_RELATIONS,
  ScoreBatchFailurePhaseCode.DOWNLOAD_FILE,
  ScoreBatchFailurePhaseCode.PARSE_EXCEL,
  ScoreBatchFailurePhaseCode.REWRITE_RECORDS,
  ScoreBatchFailurePhaseCode.UPDATE_BATCH_STATUS,
]

export const ScoreBatchFailurePhaseDescription: Record<ScoreBatchFailurePhaseCode, string> = {
  [ScoreBatchFailurePhaseCode.INIT]: '初始化',
  [ScoreBatchFailurePhaseCode.LOAD_RELATIONS]: '加载关联数据',
  [ScoreBatchFailurePhaseCode.DOWNLOAD_FILE]: '下载源文件',
  [ScoreBatchFailurePhaseCode.PARSE_EXCEL]: '解析 Excel',
  [ScoreBatchFailurePhaseCode.REWRITE_RECORDS]: '重写成绩记录',
  [ScoreBatchFailurePhaseCode.UPDATE_BATCH_STATUS]: '更新批次状态',
}
