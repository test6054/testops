/** 与 edu-quality AssessmentGoalWeightRules.WEIGHT_SUM_TOLERANCE 一致 */
export const WEIGHT_SUM_TOLERANCE = 1e-3

/** 判断权重求和是否接近 1，容差为 <= WEIGHT_SUM_TOLERANCE */
export function isWeightSumHealthy(sum: number): boolean {
  return Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE
}

/**
 * 配置侧可选直接/间接权重对（与 DirectIndirectWeightRules.assertOptionalConfiguredPair 一致）。
 * 双空合法；成对填写时须非负且和为 1。
 * @returns 错误文案；合法时 null
 */
export function validateOptionalDirectIndirectWeights(
  directWeight?: number | null,
  indirectWeight?: number | null,
  label = '直接 / 间接评价权重',
): string | null {
  const directMissing = directWeight == null || Number.isNaN(Number(directWeight))
  const indirectMissing = indirectWeight == null || Number.isNaN(Number(indirectWeight))
  if (directMissing && indirectMissing) {
    return null
  }
  if (directMissing || indirectMissing) {
    return `${label}须成对配置，不能只填一侧`
  }
  return validateRequiredDirectIndirectWeights(directWeight, indirectWeight, label)
}

/**
 * 必填直接/间接权重对（模板 / 算法实例；与 assertNonNegativeBalancedPair 一致）。
 * @returns 错误文案；合法时 null
 */
export function validateRequiredDirectIndirectWeights(
  directWeight?: number | null,
  indirectWeight?: number | null,
  label = '直接 / 间接评价权重',
): string | null {
  if (
    directWeight == null
    || indirectWeight == null
    || Number.isNaN(Number(directWeight))
    || Number.isNaN(Number(indirectWeight))
  ) {
    return `${label}不能为空`
  }
  if (directWeight < 0 || indirectWeight < 0) {
    return `${label}不能为负`
  }
  if (!isWeightSumHealthy(directWeight + indirectWeight)) {
    return `${label}之和必须为 1，当前为 ${(directWeight + indirectWeight).toFixed(4)}`
  }
  return null
}
