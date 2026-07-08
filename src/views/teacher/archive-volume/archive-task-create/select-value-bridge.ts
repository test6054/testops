import type { SelectValue } from 'ant-design-vue/es/select'

/** Ant Design Select 空值为 undefined；归档任务表单可选 string 字段使用 null */
export function nullableStringToSelectValue(value: string | null | undefined): SelectValue | undefined {
  return value ?? undefined
}

/** 将 Select 变更值解析为后端 string ID；非 string 视为未选择 */
export function selectValueToNullableString(value: SelectValue): string | null {
  return typeof value === 'string' ? value : null
}
