/** 与 edu-quality AssessmentGoalWeightRules.WEIGHT_SUM_TOLERANCE 一致 */
export const WEIGHT_SUM_TOLERANCE = 1e-3

/** 判断权重求和是否接近 1，容差为 <= WEIGHT_SUM_TOLERANCE */
export function isWeightSumHealthy(sum: number): boolean {
  return Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE
}
