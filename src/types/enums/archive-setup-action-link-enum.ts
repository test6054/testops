/** 归档租户初始化动作链接编码 */
export enum ArchiveSetupActionLinkCode {
  TEMPLATES = 'TEMPLATES',
}

export const ALL_ARCHIVE_SETUP_ACTION_LINK_CODES: readonly ArchiveSetupActionLinkCode[] = [
  ArchiveSetupActionLinkCode.TEMPLATES,
]

export const ArchiveSetupActionLinkDescription: Record<ArchiveSetupActionLinkCode, string> = {
  [ArchiveSetupActionLinkCode.TEMPLATES]: '模板配置',
}
