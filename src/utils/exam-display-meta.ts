/**
 * 考试列表副行展示：编号 · 院系。
 * Web 考试列表与一体机绑定考试卡片共用，避免识别信息分叉。
 */
export function formatExamSubMeta(examNo?: string | null, departmentName?: string | null): string {
  const parts: string[] = []
  if (examNo?.trim()) {
    parts.push(examNo.trim())
  }
  if (departmentName?.trim()) {
    parts.push(departmentName.trim())
  }
  return parts.join(' · ')
}

/** 考试起止时间展示；缺省一端时只展示已有端。 */
export function formatExamTimeRange(start?: string | null, end?: string | null): string {
  const formatPart = (value?: string | null) => {
    const trimmed = value?.trim()
    if (!trimmed) return ''
    return trimmed.length >= 16 ? trimmed.slice(0, 16) : trimmed
  }
  const startText = formatPart(start)
  const endText = formatPart(end)
  if (startText && endText) return `${startText} — ${endText}`
  return startText || endText
}
