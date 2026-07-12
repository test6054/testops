import { strictEnumLabel } from '@/utils/strict-enum'

/** 外部拔取排序方向 */
export enum ExternalPullSortDirectionCode {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const ALL_EXTERNAL_PULL_SORT_DIRECTION_CODES: readonly ExternalPullSortDirectionCode[] = [
  ExternalPullSortDirectionCode.ASC,
  ExternalPullSortDirectionCode.DESC,
]

export const ExternalPullSortDirectionDescription: Record<ExternalPullSortDirectionCode, string> = {
  [ExternalPullSortDirectionCode.ASC]: '升序',
  [ExternalPullSortDirectionCode.DESC]: '降序',
}

export const EXTERNAL_PULL_SORT_DIRECTION_OPTIONS: Array<{
  value: ExternalPullSortDirectionCode
  label: string
}> = ALL_EXTERNAL_PULL_SORT_DIRECTION_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ExternalPullSortDirectionDescription, value, '外部拔取排序方向'),
}))
