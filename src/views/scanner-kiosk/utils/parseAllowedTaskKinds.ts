import type { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'

const VALID_TASK_KINDS: ScanTaskKindCode[] = ['EXAM_MARKING', 'EXAM_ARCHIVE', 'PORTFOLIO_COLLECT']

/** 解析 Agent / 后端返回的 allowedTaskKinds；空值不默认注入 EXAM_MARKING。 */
export function parseAllowedTaskKinds(raw: string | undefined | null): ScanTaskKindCode[] {
  if (!raw?.trim()) {
    return []
  }
  return raw
    .split(',')
    .map(item => item.trim())
    .filter((kind): kind is ScanTaskKindCode => VALID_TASK_KINDS.includes(kind as ScanTaskKindCode))
}
