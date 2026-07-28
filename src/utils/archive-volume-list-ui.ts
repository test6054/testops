/** 判断归档截止是否已逾期 */
export function isArchiveDueOverdue(archiveDueTime?: string): boolean {
  if (!archiveDueTime) return false
  return new Date(archiveDueTime).getTime() < Date.now()
}

/** 按后端院系时限策略判断归档截止是否临期。 */
export function isArchiveDueSoon(archiveDueTime: string | undefined, leadDays: number | undefined): boolean {
  if (!archiveDueTime || leadDays == null || leadDays <= 0 || isArchiveDueOverdue(archiveDueTime)) return false
  const dueMs = new Date(archiveDueTime).getTime()
  const leadMs = leadDays * 24 * 60 * 60 * 1000
  return dueMs - Date.now() <= leadMs
}
