/** 聚合函数 - AggregationFunctionEnum */
export enum AggregationFunctionCode {
  WEIGHTED_SUM = 'WEIGHTED_SUM',
  MINIMUM = 'MINIMUM',
  DIRECT_INDIRECT_WEIGHTED = 'DIRECT_INDIRECT_WEIGHTED',
}

export const ALL_AGGREGATION_FUNCTION_CODES: readonly AggregationFunctionCode[] = [
  AggregationFunctionCode.WEIGHTED_SUM,
  AggregationFunctionCode.MINIMUM,
  AggregationFunctionCode.DIRECT_INDIRECT_WEIGHTED,
]

export const AggregationFunctionDescription: Record<AggregationFunctionCode, string> = {
  [AggregationFunctionCode.WEIGHTED_SUM]: '加权求和',
  [AggregationFunctionCode.MINIMUM]: '取最小值',
  [AggregationFunctionCode.DIRECT_INDIRECT_WEIGHTED]: '直接间接加权',
}
