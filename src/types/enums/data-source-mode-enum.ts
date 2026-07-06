/** 数据接入模式 - DataSourceModeEnum */
export enum DataSourceModeCode {
  EXCEL_IMPORT = 'EXCEL_IMPORT',
  EXTERNAL_AI_CONNECTOR = 'EXTERNAL_AI_CONNECTOR',
  READ_ONLY_DATABASE_PULL = 'READ_ONLY_DATABASE_PULL',
  MANUAL_CONFIRMATION = 'MANUAL_CONFIRMATION',
  EDU_MARK_EXAM = 'EDU_MARK_EXAM',
  EDU_MARK_FINAL_SCORE = 'EDU_MARK_FINAL_SCORE',
}

export const ALL_DATA_SOURCE_MODE_CODES: readonly DataSourceModeCode[] = [
  DataSourceModeCode.EXCEL_IMPORT,
  DataSourceModeCode.EXTERNAL_AI_CONNECTOR,
  DataSourceModeCode.READ_ONLY_DATABASE_PULL,
  DataSourceModeCode.MANUAL_CONFIRMATION,
  DataSourceModeCode.EDU_MARK_EXAM,
  DataSourceModeCode.EDU_MARK_FINAL_SCORE,
]

export const DataSourceModeDescription: Record<DataSourceModeCode, string> = {
  [DataSourceModeCode.EXCEL_IMPORT]: 'Excel 异步导入',
  [DataSourceModeCode.EXTERNAL_AI_CONNECTOR]: '外部 AI 解析草稿',
  [DataSourceModeCode.READ_ONLY_DATABASE_PULL]: '只读数据库主动拔取',
  [DataSourceModeCode.MANUAL_CONFIRMATION]: '人工录入与确认',
  [DataSourceModeCode.EDU_MARK_EXAM]: '考试阅卷环节',
  [DataSourceModeCode.EDU_MARK_FINAL_SCORE]: '考试阅卷最终成绩',
}
