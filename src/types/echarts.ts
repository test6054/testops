/** ECharts tooltip formatter 参数最小契约 */
export interface EChartsFormatterParam {
  seriesName?: string
  name?: string
  value?: number | string | (number | string)[]
  marker?: string
  data?: unknown
  dataIndex?: number
}
