import type { UiOptionValue } from '@/components/ui-guide/ui/types'

/** UiSelect 空值为 undefined；课程考核袋表单可选 string 字段使用 null */
export function nullableStringToSelectValue(
  value: string | null | undefined,
): UiOptionValue | undefined {
  return value ?? undefined
}

/** 将选择值解析为后端 string ID；非 string 视为未选择 */
export function selectValueToNullableString(
  value: UiOptionValue | UiOptionValue[] | undefined,
): string | null {
  return typeof value === 'string' ? value : null
}
