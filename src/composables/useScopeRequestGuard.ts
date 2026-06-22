import { useQualityStore } from '@/stores/modules/quality'

/** 质量模块范围快照：用于并发请求返回时校验是否仍对应当前筛选条件 */
export interface QualityScopeSnapshot {
  epoch: number
  programId: string
  trainingPlanId: string
  qualityCourseId: string
}

/** 捕获当前质量范围上下文（主键均为 string，对齐后端 Long→JSON string） */
export function captureQualityScope(): QualityScopeSnapshot {
  const store = useQualityStore()
  return {
    epoch: store.scopeChangeEpoch,
    programId: store.currentProgramId,
    trainingPlanId: store.currentTrainingPlanId,
    qualityCourseId: store.currentQualityCourseId,
  }
}

/** 判断捕获的快照是否已落后于当前 Store 范围 */
export function isQualityScopeStale(snapshot: QualityScopeSnapshot): boolean {
  const store = useQualityStore()
  return snapshot.epoch !== store.scopeChangeEpoch
    || snapshot.programId !== store.currentProgramId
    || snapshot.trainingPlanId !== store.currentTrainingPlanId
    || snapshot.qualityCourseId !== store.currentQualityCourseId
}

/** 单次请求 scope 令牌：在 await 之后调用 isStale() 丢弃过期响应 */
export interface QualityScopeRequestToken {
  isStale: () => boolean
}

/** scope 已过期时抛出，供并行 load 链中断并避免 Tab/Signal 不一致 */
export class QualityScopeStaleError extends Error {
  constructor() {
    super('质量范围已变更，丢弃过期响应')
    this.name = 'QualityScopeStaleError'
  }
}

export function isQualityScopeStaleError(error: unknown): error is QualityScopeStaleError {
  return error instanceof QualityScopeStaleError
}

/** await 之后校验 scope；过期则抛 QualityScopeStaleError，阻止静默成功 */
export function assertQualityScopeFresh(scope: QualityScopeRequestToken): void {
  if (scope.isStale()) {
    throw new QualityScopeStaleError()
  }
}

/**
 * 在发起质量域异步请求前调用；响应落地前用 isStale() 判断是否丢弃。
 * 不改变 API 契约，仅协调前端并发范围切换。
 */
export function beginQualityScopeRequest(): QualityScopeRequestToken {
  const snapshot = captureQualityScope()
  return {
    isStale: () => isQualityScopeStale(snapshot),
  }
}

/** 异步结果写入 ref 前校验：scope 已过期则跳过赋值 */
export function applyIfQualityScopeFresh<T>(
  scope: QualityScopeRequestToken,
  value: T,
  apply: (next: T) => void,
): boolean {
  if (scope.isStale()) {
    return false
  }
  apply(value)
  return true
}
