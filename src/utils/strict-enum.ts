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

export function strictEnumValue<TCode extends string, TValue>(
  values: Record<TCode, TValue>,
  code: TCode | undefined | null,
  fieldName: string,
): TValue {
  if (!code) {
    throw new Error(`${fieldName}不能为空`)
  }
  const value = values[code]
  if (value === undefined) {
    throw new Error(`${fieldName}存在未定义枚举值：${code}`)
  }
  return value
}
