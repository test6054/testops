import type {
  ExamScannerPageLedgerItemVO,
  ExamScannerPageLedgerRequest,
  ExamScannerPageLedgerVO,
} from '@/apis/mark/scanner-kiosk'
import { fetchScannerPageLedger } from '@/apis/mark/scanner-kiosk'

const HISTORY_LEDGER_PAGE_SIZE = 500

/** 账本页条目合并键：优先 localPageId，否则 pageNo。 */
export function ledgerItemMergeKey(item: ExamScannerPageLedgerItemVO): string {
  if (item.localPageId) {
    return `id:${item.localPageId}`
  }
  return `page:${item.pageNo}`
}

/** 合并增量或分页 items，按 pageNo 升序。 */
export function mergeLedgerItems(
  existing: ExamScannerPageLedgerItemVO[],
  incoming: ExamScannerPageLedgerItemVO[],
): ExamScannerPageLedgerItemVO[] {
  if (incoming.length === 0) {
    return existing
  }
  const merged = new Map<string, ExamScannerPageLedgerItemVO>()
  for (const item of existing) {
    merged.set(ledgerItemMergeKey(item), item)
  }
  for (const item of incoming) {
    merged.set(ledgerItemMergeKey(item), item)
  }
  return [...merged.values()].sort((left, right) => left.pageNo - right.pageNo)
}

/** 取 items 中最晚 occurredAt，供 sincePageUpdateTime 增量游标。 */
export function resolveLedgerMaxPageUpdateTime(
  items: ExamScannerPageLedgerItemVO[],
): string | undefined {
  let maxTime: string | undefined
  for (const item of items) {
    if (!item.occurredAt) {
      continue
    }
    if (!maxTime || item.occurredAt > maxTime) {
      maxTime = item.occurredAt
    }
  }
  return maxTime
}

/** 将服务端账本片段合并进客户端缓存。 */
export function applyLedgerResponse(
  previous: ExamScannerPageLedgerVO | null,
  incoming: ExamScannerPageLedgerVO,
): ExamScannerPageLedgerVO {
  if (incoming.notModified && previous) {
    return {
      ...previous,
      ledgerVersion: incoming.ledgerVersion ?? previous.ledgerVersion,
      pendingCount: incoming.pendingCount,
      registeredCount: incoming.registeredCount,
      attentionCount: incoming.attentionCount,
      totalPageCount: incoming.totalPageCount ?? previous.totalPageCount,
      notModified: true,
      incremental: false,
    }
  }
  if (incoming.incremental && previous) {
    return {
      ...previous,
      ...incoming,
      items: mergeLedgerItems(previous.items, incoming.items),
      attentionItems:
        incoming.attentionItems.length > 0
          ? incoming.attentionItems
          : incoming.attentionCount === previous.attentionCount
            ? previous.attentionItems
            : incoming.attentionItems,
      notModified: false,
    }
  }
  if (
    previous
    && incoming.attentionItems.length === 0
    && incoming.attentionCount === previous.attentionCount
  ) {
    return {
      ...incoming,
      attentionItems: previous.attentionItems,
    }
  }
  return incoming
}

/** 历史 / ARCHIVE 大批次：分页拉取并合并为完整快照。 */
export async function fetchPagedHistoryLedgerSnapshot(
  baseRequest: ExamScannerPageLedgerRequest,
): Promise<ExamScannerPageLedgerVO> {
  let pageNum = 1
  let snapshot: ExamScannerPageLedgerVO | null = null
  while (true) {
    const chunk = await fetchScannerPageLedger({
      ...baseRequest,
      fullSnapshot: true,
      itemsPageNum: pageNum,
      itemsPageSize: HISTORY_LEDGER_PAGE_SIZE,
    })
    if (!snapshot) {
      snapshot = chunk
    } else {
      snapshot = applyLedgerResponse(snapshot, {
        ...chunk,
        incremental: true,
      })
    }
    if (!chunk.itemsPages || pageNum >= chunk.itemsPages) {
      break
    }
    pageNum += 1
  }
  if (!snapshot) {
    throw new Error('历史批次账本为空')
  }
  return snapshot
}
