/** ArchiveTemplateScope */
export enum ArchiveTemplateScopeCode {
  PLATFORM = 'PLATFORM',
  TENANT = 'TENANT',
}

export const ALL_ARCHIVE_TEMPLATE_SCOPE_CODES: readonly ArchiveTemplateScopeCode[] = [
  ArchiveTemplateScopeCode.PLATFORM,
  ArchiveTemplateScopeCode.TENANT,
]

export const ArchiveTemplateScopeDescription: Record<ArchiveTemplateScopeCode, string> = {
  [ArchiveTemplateScopeCode.PLATFORM]: '平台模板',
  [ArchiveTemplateScopeCode.TENANT]: '本校模板',
}

