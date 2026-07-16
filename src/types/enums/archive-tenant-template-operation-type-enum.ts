import { strictEnumLabel } from '@/utils/strict-enum'

/** 租户模板套审计操作类型，与后端 ArchiveTenantTemplateOperationType 一致 */
export enum ArchiveTenantTemplateOperationTypeCode {
  SAVE = 'SAVE',
  COPY_OVERRIDE = 'COPY_OVERRIDE',
  RESYNC = 'RESYNC',
  RESTORE = 'RESTORE',
}

export const ALL_ARCHIVE_TENANT_TEMPLATE_OPERATION_TYPE_CODES = [
  ArchiveTenantTemplateOperationTypeCode.SAVE,
  ArchiveTenantTemplateOperationTypeCode.COPY_OVERRIDE,
  ArchiveTenantTemplateOperationTypeCode.RESYNC,
  ArchiveTenantTemplateOperationTypeCode.RESTORE,
] as const

export const ArchiveTenantTemplateOperationTypeDescription: Record<
  ArchiveTenantTemplateOperationTypeCode,
  string
> = {
  [ArchiveTenantTemplateOperationTypeCode.SAVE]: '保存模板',
  [ArchiveTenantTemplateOperationTypeCode.COPY_OVERRIDE]: '覆盖复制平台模板',
  [ArchiveTenantTemplateOperationTypeCode.RESYNC]: '重新同步模板',
  [ArchiveTenantTemplateOperationTypeCode.RESTORE]: '从快照恢复',
}

export function archiveTenantTemplateOperationTypeLabel(
  code: ArchiveTenantTemplateOperationTypeCode,
): string {
  return strictEnumLabel(ArchiveTenantTemplateOperationTypeDescription, code, 'operationType')
}
