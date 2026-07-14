/** 档案支撑材料来源类型 - PortfolioArchiveSupportMaterialSourceTypeEnum */
export enum PortfolioArchiveSupportMaterialSourceTypeCode {
  LOCAL_UPLOAD = 'LOCAL_UPLOAD',
  SYNC_LINK = 'SYNC_LINK',
}

export const ALL_PORTFOLIO_ARCHIVE_SUPPORT_MATERIAL_SOURCE_TYPE_CODES:
  readonly PortfolioArchiveSupportMaterialSourceTypeCode[] = [
    PortfolioArchiveSupportMaterialSourceTypeCode.LOCAL_UPLOAD,
    PortfolioArchiveSupportMaterialSourceTypeCode.SYNC_LINK,
  ]

export const PortfolioArchiveSupportMaterialSourceTypeDescription:
  Record<PortfolioArchiveSupportMaterialSourceTypeCode, string> = {
    [PortfolioArchiveSupportMaterialSourceTypeCode.LOCAL_UPLOAD]: '本地上传',
    [PortfolioArchiveSupportMaterialSourceTypeCode.SYNC_LINK]: '关联同步材料',
  }
