import type { TableProps } from 'ant-design-vue/es/table'

export type UiDataTableOnChange<RecordType = Record<string, unknown>> = NonNullable<
  TableProps<RecordType>['onChange']
>

export interface UiDataTableChangeEvent<RecordType = Record<string, unknown>> {
  pagination: Parameters<UiDataTableOnChange<RecordType>>[0]
  filters: Parameters<UiDataTableOnChange<RecordType>>[1]
  sorter: Parameters<UiDataTableOnChange<RecordType>>[2]
  extra: Parameters<UiDataTableOnChange<RecordType>>[3]
}
