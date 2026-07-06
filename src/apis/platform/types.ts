/**
 * 平台文件 / Excel 导入 API 类型（与 edu-common 契约一致）。
 * Excel 批量导入真源契约；业务域 apis/* 不重复定义 import Request/Result。
 */
import type { ExcelImportSceneKey, FileUploadSceneKey } from './scene-keys'

/** Excel 导入执行模式 - 与平台 Excel 导入返回契约对齐。 */
export enum ExcelImportExecutionMode {
  SYNC = 'SYNC',
  ASYNC = 'ASYNC',
}

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
export enum ExcelImportRosterImportAction {
  EXISTING_STUDENT = 'EXISTING_STUDENT',
  CREATE_STUDENT = 'CREATE_STUDENT',
}

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
  /** upsert 类 scene 填充：新建记录数 */
  createdCount?: number
  /** upsert 类 scene 填充：更新记录数 */
  updatedCount?: number
}

export interface PlatformFileStageVO {
  fileNodeId: string
  fileName: string
  fileSize: number
  sceneKey: FileUploadSceneKey
}

export interface ExcelImportTemplateVO {
  fileNodeId: string
  fileName: string
  sampleRowCount?: number
}

/** 平台 Excel 导入域上下文 JSON - 对齐后端 FastJson2 JSONObject */
export type PlatformJsonPrimitive = string | number | boolean | null

export interface PlatformJsonObject {
  [key: string]: PlatformJsonValue | undefined
}

export type PlatformJsonValue = PlatformJsonPrimitive | PlatformJsonObject | PlatformJsonValue[]

export interface ExcelImportTemplateRequest {
  sceneKey: ExcelImportSceneKey
  context?: PlatformJsonObject
}

export interface ExcelImportSubmitRequest {
  sceneKey: ExcelImportSceneKey
  fileNodeId: string
  context?: PlatformJsonObject
}

export interface ExcelImportGetRequest {
  batchId: string
  sceneKey: ExcelImportSceneKey
}
