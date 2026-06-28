/**
 * 平台文件 / Excel 导入 API 类型（与 edu-common 契约一致）。
 */
export type ExcelImportExecutionMode = 'SYNC' | 'ASYNC'

export interface ExcelImportRowField {
  columnName: string
  cellValue: string
}

export interface ExcelImportRowDiagnostic {
  rowIndex: number
  valid: boolean
  invalidReason?: string
  errorCode?: string
  rowFields?: ExcelImportRowField[]
}

/** 名册 Excel 导入预览行（MARK_ROSTER_EXCEL 正式契约） */
export type ExcelImportRosterImportAction = 'EXISTING_STUDENT' | 'CREATE_STUDENT'

export interface ExcelImportRosterPreviewRow {
  rowNo: number
  departmentName?: string
  className?: string
  studentNo?: string
  studentName?: string
  classId?: string
  studentUserId?: string
  resolvedStudentNo?: string
  resolvedStudentName?: string
  resolvedClassName?: string
  importAction?: ExcelImportRosterImportAction
  valid: boolean
  errorMessage?: string
}

export interface ExcelImportResult {
  totalRows?: number
  successRows?: number
  errorRows?: number
  errorSummary?: string
  diagnostics: ExcelImportRowDiagnostic[]
  executionMode?: ExcelImportExecutionMode
  batchId?: string
  batchNo?: string
  batchStatus?: string
  asyncStatus?: string
  /** true 表示 preview 阶段尚未 commit */
  previewOnly?: boolean
  rosterPreviewRows?: ExcelImportRosterPreviewRow[]
}

export interface PlatformFileStageVO {
  fileNodeId: string
  fileName: string
  fileSize: number
  sceneKey: string
}

export interface ExcelImportTemplateVO {
  fileNodeId: string
  fileName: string
  sampleRowCount?: number
}

export interface ExcelImportTemplateRequest {
  sceneKey: string
  context?: Record<string, unknown>
}

export interface ExcelImportSubmitRequest {
  sceneKey: string
  fileNodeId: string
  context?: Record<string, unknown>
}

export interface ExcelImportGetRequest {
  batchId: string
  sceneKey: string
}
