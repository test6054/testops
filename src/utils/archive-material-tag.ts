import { message } from 'ant-design-vue'

/**
 * 规范化材料自由标签输入：去空白、去重、长度与数量校验。
 * @returns 非空标签列表；无有效标签时返回 undefined（登记场景可不传 tags）
 */
export function normalizeMaterialTagsForRegister(raw: string[]): string[] | undefined {
  const normalized = normalizeMaterialTagsCore(raw)
  if (normalized === null) {
    return undefined
  }
  return normalized.length > 0 ? normalized : undefined
}

/**
 * 规范化材料标签全量替换输入；允许空列表表示清空。
 */
export function normalizeMaterialTagsForUpdate(raw: string[]): string[] | null {
  const normalized = normalizeMaterialTagsCore(raw)
  if (normalized === null) {
    return null
  }
  return normalized
}

function normalizeMaterialTagsCore(raw: string[]): string[] | null {
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }
    if (trimmed.length > 64) {
      message.warning('标签名称不能超过 64 字符')
      return null
    }
    seen.add(trimmed)
    normalized.push(trimmed)
  }
  if (normalized.length > 32) {
    message.warning('单材料标签数量不能超过 32 个')
    return null
  }
  return normalized
}
