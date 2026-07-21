/** §8.51 材料版本业务引用范围（与后端 PortfolioMaterialRefScopeEnum 逐值一致） */
export enum PortfolioMaterialRefScopeCode {
  /** 评价任务四冻结材料钉版本 */
  EVALUATION_TASK = 'EVALUATION_TASK',
  /** 教学档案袋材料包导出钉版本 */
  BAG_EXPORT = 'BAG_EXPORT',
  /** 分析/上报报表材料包钉版本 */
  REPORT_PACKAGE = 'REPORT_PACKAGE',
  /** 正式档案支撑材料链接钉版本 */
  ARCHIVE_LINK = 'ARCHIVE_LINK',
}

export const ALL_PORTFOLIO_MATERIAL_REF_SCOPE_CODES: readonly PortfolioMaterialRefScopeCode[] = [
  PortfolioMaterialRefScopeCode.EVALUATION_TASK,
  PortfolioMaterialRefScopeCode.BAG_EXPORT,
  PortfolioMaterialRefScopeCode.REPORT_PACKAGE,
  PortfolioMaterialRefScopeCode.ARCHIVE_LINK,
]

export const PortfolioMaterialRefScopeDescription: Record<PortfolioMaterialRefScopeCode, string> = {
  [PortfolioMaterialRefScopeCode.EVALUATION_TASK]: '评价任务',
  [PortfolioMaterialRefScopeCode.BAG_EXPORT]: '材料包导出',
  [PortfolioMaterialRefScopeCode.REPORT_PACKAGE]: '报表材料包',
  [PortfolioMaterialRefScopeCode.ARCHIVE_LINK]: '档案支撑引用',
}
