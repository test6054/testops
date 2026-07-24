/** 教师迁出包附件来源类型 - PortfolioTeacherTransferAttachmentSourceTypeEnum */
export enum PortfolioTeacherTransferAttachmentSourceTypeCode {
  ARCHIVE_RECORD = 'ARCHIVE_RECORD',
  MATERIAL = 'MATERIAL',
}

export const PortfolioTeacherTransferAttachmentSourceTypeDescription: Record<
  PortfolioTeacherTransferAttachmentSourceTypeCode,
  string
> = {
  [PortfolioTeacherTransferAttachmentSourceTypeCode.ARCHIVE_RECORD]: '正式档案附件',
  [PortfolioTeacherTransferAttachmentSourceTypeCode.MATERIAL]: '教师材料附件',
}
