export function strictEnumLabel<TCode extends string>(
  labels: Record<TCode, string>,
  code: TCode,
  fieldName: string,
): string {
  const label = labels[code]
  if (label === undefined) {
    throw new Error(`枚举合同不同步：${fieldName}=${code}`)
  }
  return label
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
