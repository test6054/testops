import type { PageResult } from '@/types'

function parsePageResultTotal(total: unknown): number {
  if (typeof total === 'number') {
    if (!Number.isFinite(total) || total < 0) {
      throw new Error(`PageResult.total 契约异常: ${total}`)
    }
    return total
  }
  if (typeof total === 'string') {
    const parsed = Number(total)
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`PageResult.total 契约异常: ${total}`)
    }
    return parsed
  }
  throw new Error(`PageResult.total 契约异常: ${String(total)}`)
}

function isPageResultPayload(value: Record<string, unknown>): boolean {
  return Array.isArray(value.list) && 'total' in value
}

/**
 * HTTP 解包边界：FastJson WriteLongAsString 会把 PageResult.total 序列化为 string，
 * 在此统一转为 number，业务层与 PageResult 类型契约只消费 number。
 */
export function normalizePageResultPayload<T>(payload: T): T {
  if (payload == null || typeof payload !== 'object') {
    return payload
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizePageResultPayload(item)) as T
  }
  const record = payload as Record<string, unknown>
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === 'total' && isPageResultPayload(record)) {
      normalized.total = parsePageResultTotal(value)
      continue
    }
    normalized[key] = normalizePageResultPayload(value)
  }
  return normalized as T
}

export async function readAllPages<T>(
  loadPage: (pageNum: number) => Promise<PageResult<T>>,
  _userFallback: string,
): Promise<T[]> {
  const items: T[] = []
  let pageNum = 1
  while (true) {
    const page = await loadPage(pageNum)
    items.push(...page.list)
    if (pageNum >= page.pages || page.pages === 0) {
      return items
    }
    pageNum += 1
  }
}
