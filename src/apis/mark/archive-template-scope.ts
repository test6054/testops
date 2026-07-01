import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

/** 归档模板作用域 - 与后端 ArchiveTemplateScope 枚举完全一致 */
export type ArchiveTemplateScopeCode = 'PLATFORM' | 'TENANT'

export const ARCHIVE_TEMPLATE_SCOPE_CODES = ['PLATFORM', 'TENANT'] as const satisfies readonly ArchiveTemplateScopeCode[]

/** 归档模板作用域文案 - 与后端 ArchiveTemplateScope.message 完全一致 */
export const ARCHIVE_TEMPLATE_SCOPE_LABEL: Record<ArchiveTemplateScopeCode, string> = {
  PLATFORM: '平台模板',
  TENANT: '本校模板',
}

/** 归档模板作用域徽标颜色 */
export const ARCHIVE_TEMPLATE_SCOPE_TONE: Record<ArchiveTemplateScopeCode, BadgeTone> = {
  PLATFORM: 'blue',
  TENANT: 'green',
}

export function archiveTemplateScopeLabel(scope: ArchiveTemplateScopeCode): string {
  return strictEnumLabel(ARCHIVE_TEMPLATE_SCOPE_LABEL, scope, '归档模板作用域')
}

export function archiveTemplateScopeTone(scope: ArchiveTemplateScopeCode): BadgeTone {
  return strictEnumTone(ARCHIVE_TEMPLATE_SCOPE_TONE, scope, '归档模板作用域')
}
