import { throwUserFacing } from '@/utils/contract-guard'

const ENUM_DATA_FALLBACK = '数据异常，请刷新后重试'

export function strictEnumLabel<TCode extends string>(
  labels: Record<TCode, string>,
  code: TCode | undefined | null,
  _fieldName: string,
): string {
  if (!code || !labels[code]) {
    throwUserFacing(ENUM_DATA_FALLBACK)
  }
  return labels[code]
}

export function strictEnumTone<TCode extends string, TTone extends string>(
  tones: Record<TCode, TTone>,
  code: TCode | undefined | null,
  _fieldName: string,
): TTone {
  if (!code || tones[code] === undefined) {
    throwUserFacing(ENUM_DATA_FALLBACK)
  }
  return tones[code]
}

export function strictEnumValue<TCode extends string, TValue>(
  values: Record<TCode, TValue>,
  code: TCode | undefined | null,
  _fieldName: string,
): TValue {
  if (!code || values[code] === undefined) {
    throwUserFacing(ENUM_DATA_FALLBACK)
  }
  return values[code]
}
