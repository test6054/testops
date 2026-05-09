/**
 * 导出格式枚举 - 与后端 ExportFormat 完全对应
 */
export enum ExportFormatEnum {
  /** PDF格式 */
  PDF = 'PDF',
  /** Word格式 */
  WORD = 'WORD',
  /** Excel格式 */
  EXCEL = 'EXCEL',
  /** ZIP压缩包格式（用于实践数据导出等需要打包多种文件的场景） */
  ZIP = 'ZIP',
}
