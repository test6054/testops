/**
 * 枚举展示合同：前后端 code 与 label 必须一致。
 * 页面禁止直接展示枚举码；未知 code 显式抛错，禁止「未知」灰标签兜底。
 */

function assertDisplayLabel(label: string, fieldName: string, code: string): string {
  const trimmed = label.trim()
  if (!trimmed) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}（展示文案为空）`)
  }
  if (trimmed === code) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}（展示文案不得与枚举码相同）`)
  }
  return trimmed
}

export function strictEnumLabel<TCode extends string>(
  labels: Record<TCode, string>,
  code: TCode,
  fieldName: string,
): string {
  const label = labels[code]
  if (label === undefined) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}`)
  }
  return assertDisplayLabel(label, fieldName, String(code))
}

export function strictEnumTone<TCode extends string, TTone extends string>(
  tones: Record<TCode, TTone>,
  code: TCode,
  fieldName: string,
): TTone {
  const tone = tones[code]
  if (tone === undefined) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}`)
  }
  return tone
}

export function strictEnumValue<TCode extends string, TValue>(
  values: Record<TCode, TValue>,
  code: TCode,
  fieldName: string,
): TValue {
  const value = values[code]
  if (value === undefined) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}`)
  }
  return value
}
