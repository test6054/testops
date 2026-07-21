/** 档案字段证据引用展示：将协议约定值转为教师可读文案。 */
const PAGE_EVIDENCE_PATTERN = /^page:(\d+)(?:\s+(.+))?$/i
const MANUAL_EVIDENCE_PATTERN = /^manual(?::(.*))?$/i
const LEGACY_PROTOCOL_PATTERN = /^(AI_ANALYSIS|PROCESS_SESSION):/i
const HAS_CJK_PATTERN = /[\u3400-\u9FFF]/

/**
 * 将档案字段 evidenceRef 转为教师可读文案。
 * 扫描件页码、手工标记与中文说明合法；遗留机器协议码显式失败。
 */
export function formatPortfolioArchiveEvidenceRef(evidenceRef: string | null | undefined): string {
  const raw = evidenceRef?.trim() ?? ''
  if (!raw) {
    return '—'
  }
  if (LEGACY_PROTOCOL_PATTERN.test(raw)) {
    throw new Error(`档案证据引用仍为机器协议码，契约已失效：${raw}`)
  }
  const pageMatch = PAGE_EVIDENCE_PATTERN.exec(raw)
  if (pageMatch) {
    const pageNo = pageMatch[1]
    const region = pageMatch[2]?.trim()
    return region ? `扫描件第 ${pageNo} 页（${region}）` : `扫描件第 ${pageNo} 页`
  }
  const manualMatch = MANUAL_EVIDENCE_PATTERN.exec(raw)
  if (manualMatch) {
    const note = manualMatch[1]?.trim()
    return note ? `手工填报（${note}）` : '手工填报'
  }
  if (HAS_CJK_PATTERN.test(raw)) {
    return raw
  }
  throw new Error(`档案证据引用无法展示，请检查前后端契约：${raw}`)
}
