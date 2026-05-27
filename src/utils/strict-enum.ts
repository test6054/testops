export function strictEnumLabel<TCode extends string>(
  labels: Record<TCode, string>,
  code: TCode | undefined | null,
  fieldName: string,
): string {
  if (!code) {
    throw new Error(`${fieldName}不能为空`)
  }
  const label = labels[code]
  if (!label) {
    throw new Error(`${fieldName}存在未定义枚举值：${code}`)
  }
  return label
}

export function strictEnumTone<TCode extends string, TTone extends string>(
  tones: Record<TCode, TTone>,
  code: TCode | undefined | null,
  fieldName: string,
): TTone {
  if (!code) {
    throw new Error(`${fieldName}不能为空`)
  }
  const tone = tones[code]
  if (!tone) {
    throw new Error(`${fieldName}存在未定义枚举值：${code}`)
  }
  return tone
}

export function strictJsonArray<TItem = unknown>(
  payload: string | undefined | null,
  fieldName: string,
): TItem[] {
  if (!payload) {
    return []
  }
  const parsed = JSON.parse(payload)
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${fieldName}必须是 JSON 数组`)
  }
  return parsed as TItem[]
}

export function strictJsonObject<TObject extends object>(
  payload: string | undefined | null,
  fieldName: string,
): TObject | null {
  if (!payload) {
    return null
  }
  const parsed = JSON.parse(payload)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldName}必须是 JSON 对象`)
  }
  return parsed as TObject
}

export interface StrictAuditChangeDetails {
  beforeValue?: string
  afterValue?: string
}

function stringifyAuditChangeValue(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  const serialized = JSON.stringify(value, null, 2)
  if (serialized === undefined) {
    throw new Error(`${fieldName}不是可展示的 JSON 值`)
  }
  return serialized
}

export function strictAuditChangeDetails(
  payload: string | undefined | null,
  fieldName: string,
): StrictAuditChangeDetails {
  const parsed = strictJsonObject<Record<string, unknown>>(payload, fieldName)
  if (!parsed) {
    return {}
  }
  const hasBefore = Object.prototype.hasOwnProperty.call(parsed, 'before')
  const hasAfter = Object.prototype.hasOwnProperty.call(parsed, 'after')
  if (!hasBefore && !hasAfter) {
    throw new Error(`${fieldName}缺少 before/after 字段`)
  }
  return {
    beforeValue: stringifyAuditChangeValue(parsed.before, `${fieldName}.before`),
    afterValue: stringifyAuditChangeValue(parsed.after, `${fieldName}.after`),
  }
}
