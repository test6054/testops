import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ArchiveTemplateScopeCode,
  ArchiveTemplateScopeDescription,
} from '@/types/enums/archive-template-scope-enum'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

export {
  ALL_ARCHIVE_TEMPLATE_SCOPE_CODES,
  ArchiveTemplateScopeCode,
  ArchiveTemplateScopeDescription,
} from '@/types/enums/archive-template-scope-enum'

/** 归档模板作用域徽标颜色 */
export const ARCHIVE_TEMPLATE_SCOPE_TONE: Record<ArchiveTemplateScopeCode, BadgeTone> = {
  [ArchiveTemplateScopeCode.PLATFORM]: 'blue',
  [ArchiveTemplateScopeCode.TENANT]: 'green',
}

export function archiveTemplateScopeLabel(scope: ArchiveTemplateScopeCode): string {
  return strictEnumLabel(ArchiveTemplateScopeDescription, scope, '归档模板作用域')
}

export function archiveTemplateScopeTone(scope: ArchiveTemplateScopeCode): BadgeTone {
  return strictEnumTone(ARCHIVE_TEMPLATE_SCOPE_TONE, scope, '归档模板作用域')
}
