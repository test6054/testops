/** 指标数据来源采集通道 - PfIndicatorDataSourceChannelEnum */
export enum PfIndicatorDataSourceChannelCode {
  ARCHIVE_BAG = 'ARCHIVE_BAG',
  EVALUATION_FORM = 'EVALUATION_FORM',
  DEVELOPMENT_RECORD = 'DEVELOPMENT_RECORD',
  IMPORT_BATCH = 'IMPORT_BATCH',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  INTERNAL_LEDGER = 'INTERNAL_LEDGER',
  HR_SYSTEM = 'HR_SYSTEM',
  EDU_AFFAIRS = 'EDU_AFFAIRS',
  RESEARCH_SYSTEM = 'RESEARCH_SYSTEM',
  MOBILE_APP = 'MOBILE_APP',
}

export const ALL_PF_INDICATOR_DATA_SOURCE_CHANNEL_CODES: readonly PfIndicatorDataSourceChannelCode[] = [
  PfIndicatorDataSourceChannelCode.ARCHIVE_BAG,
  PfIndicatorDataSourceChannelCode.EVALUATION_FORM,
  PfIndicatorDataSourceChannelCode.DEVELOPMENT_RECORD,
  PfIndicatorDataSourceChannelCode.IMPORT_BATCH,
  PfIndicatorDataSourceChannelCode.MANUAL_ENTRY,
  PfIndicatorDataSourceChannelCode.INTERNAL_LEDGER,
  PfIndicatorDataSourceChannelCode.HR_SYSTEM,
  PfIndicatorDataSourceChannelCode.EDU_AFFAIRS,
  PfIndicatorDataSourceChannelCode.RESEARCH_SYSTEM,
  PfIndicatorDataSourceChannelCode.MOBILE_APP,
]

export const PfIndicatorDataSourceChannelDescription: Record<PfIndicatorDataSourceChannelCode, string> = {
  [PfIndicatorDataSourceChannelCode.ARCHIVE_BAG]: '教学档案袋',
  [PfIndicatorDataSourceChannelCode.EVALUATION_FORM]: '多元评价表',
  [PfIndicatorDataSourceChannelCode.DEVELOPMENT_RECORD]: '发展档案/成果库',
  [PfIndicatorDataSourceChannelCode.IMPORT_BATCH]: '批量导入',
  [PfIndicatorDataSourceChannelCode.MANUAL_ENTRY]: '手工录入',
  [PfIndicatorDataSourceChannelCode.INTERNAL_LEDGER]: '本域台账',
  [PfIndicatorDataSourceChannelCode.HR_SYSTEM]: '人事系统',
  [PfIndicatorDataSourceChannelCode.EDU_AFFAIRS]: '教务系统',
  [PfIndicatorDataSourceChannelCode.RESEARCH_SYSTEM]: '科研系统',
  [PfIndicatorDataSourceChannelCode.MOBILE_APP]: '移动 APP',
}
