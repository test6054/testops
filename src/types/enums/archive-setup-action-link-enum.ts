/** 归档租户初始化动作链接编码 */
export enum ArchiveSetupActionLinkCode {
  ROLES = 'ROLES',
  TEMPLATES = 'TEMPLATES',
  DUTIES = 'DUTIES',
}

export const ALL_ARCHIVE_SETUP_ACTION_LINK_CODES: readonly ArchiveSetupActionLinkCode[] = [
  ArchiveSetupActionLinkCode.ROLES,
  ArchiveSetupActionLinkCode.TEMPLATES,
  ArchiveSetupActionLinkCode.DUTIES,
]

export const ArchiveSetupActionLinkDescription: Record<ArchiveSetupActionLinkCode, string> = {
  [ArchiveSetupActionLinkCode.ROLES]: '角色配置',
  [ArchiveSetupActionLinkCode.TEMPLATES]: '模板配置',
  [ArchiveSetupActionLinkCode.DUTIES]: '职责授权',
}

