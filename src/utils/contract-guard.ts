/**
 * 契约校验与用户可见错误：仅抛出用户可读文案，不包含字段名、契约、枚举等内部细节。
 */

/** 抛出仅含用户可读文案的 Error。 */
export function throwUserFacing(message: string): never {
  throw new Error(message)
}

/** 条件不满足时抛出用户可读文案。 */
export function assertUserFacing(condition: unknown, message: string): asserts condition {
  if (!condition) throwUserFacing(message)
}

/**
 * 执行契约校验；任意失败统一为用户 fallback，不保留原始异常文案。
 */
export function runContractGuard(action: () => void, userFallback: string): void {
  try {
    action()
  } catch {
    throwUserFacing(userFallback)
  }
}
