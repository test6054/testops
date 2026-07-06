export function strictEnumLabel<TCode extends string>(
  labels: Record<TCode, string>,
  code: TCode,
  _fieldName: string,
): string {
  return labels[code]
}

export function strictEnumTone<TCode extends string, TTone extends string>(
  tones: Record<TCode, TTone>,
  code: TCode,
  _fieldName: string,
): TTone {
  return tones[code]
}

export function strictEnumValue<TCode extends string, TValue>(
  values: Record<TCode, TValue>,
  code: TCode,
  _fieldName: string,
): TValue {
  return values[code]
}
