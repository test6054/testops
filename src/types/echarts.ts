/**
 * ECharts tooltip formatter 回调参数类型
 * 用于替代 tooltip formatter 中的 `any` 类型
 */
export interface EChartsFormatterParam {
  componentType: string
  seriesType: string
  seriesIndex: number
  seriesName: string
  name: string
  dataIndex: number
  data: unknown
  value: number | string | number[]
  color: string
  marker: string
  axisValue: string
  axisValueLabel: string
}
