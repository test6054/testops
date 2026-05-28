/**
 * 通用 Excel 导入诊断与结果类型
 *
 * 后端真源：
 * - com.nybc.quality.model.importing.ImportDiagnostic
 * - com.nybc.quality.model.importing.ImportResult
 *
 * 适用所有 edu-quality 同步 Excel 导入端点（节点记录、工作组成员等）。
 * 异步批次（成绩导入）仍走专属的 ScoreImportPreviewVO 链路，与本类型并存。
 */

/**
 * 行级诊断：表达 Excel 单行解析与业务校验的结果。
 */
export interface ImportDiagnosticField {
  /** Excel 列名 */
  columnName: string
  /** Excel 单元格原始文本 */
  cellValue: string
}

/**
 * 行级诊断：表达 Excel 单行解析与业务校验的结果。
 */
export interface ImportDiagnostic {
  /** Excel 业务行号（表头位于第 1 行，业务行从第 2 行起） */
  rowIndex: number
  /** 是否通过行级校验 */
  valid: boolean
  /** 业务可读的错误原因；valid=false 时必填 */
  invalidReason?: string
  /** 机器可读的错误码；valid=false 时必填 */
  errorCode?: string
  /** 行原始列值 */
  rowFields?: ImportDiagnosticField[]
}

/**
 * 通用 Excel 导入聚合结果。
 */
export interface ImportResult {
  /** 总行数（已解析的业务行数） */
  totalRows: number
  /** 校验通过且已写入业务表的行数 */
  successRows: number
  /** 校验失败的行数 */
  errorRows: number
  /** 错误摘要：截断展示前 N 个不同错误原因 */
  errorSummary?: string
  /** 全部行级诊断（含成功与失败） */
  diagnostics: ImportDiagnostic[]
}
