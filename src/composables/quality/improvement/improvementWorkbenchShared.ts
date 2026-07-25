import { isQualityScopeStaleError } from '@/composables/useScopeRequestGuard'
import { showUserError, toUserError } from '@/utils/error-handler'

/** 质量 selector 变更值：单选 string 或空 */
export type QualitySelectorChangeValue = string | string[] | null | undefined

/**
 * mutation 后刷新结算结果。
 * applied=已写入当前 scope；failed=同步失败但业务写入已成功；stale=scope 已过期丢弃。
 */
export type WorkbenchRefreshOutcome = 'applied' | 'failed' | 'stale'

export type WorkbenchSignalRefreshHandler = () => boolean | Promise<boolean | void> | void

export function selectedId(value: string | null | undefined): string {
  return value ?? ''
}

export function normalizeTextareaLineItems(value: string | null | undefined): string[] {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** mutation 后刷新 SignalBand：不抛错；返回 applied/failed/stale */
export async function refreshWorkbenchSignalsAfterMutation(
  scope: { isStale: () => boolean },
  onWorkbenchRefresh: WorkbenchSignalRefreshHandler | undefined,
  onLoadError: ((error: Error | null) => void) | undefined,
  fallbackMessage: string,
): Promise<WorkbenchRefreshOutcome> {
  try {
    const applied = await onWorkbenchRefresh?.()
    if (scope.isStale()) {
      return 'stale'
    }
    if (applied === false) {
      const err = toUserError(null, fallbackMessage)
      onLoadError?.(err)
      showUserError(null, fallbackMessage)
      return 'failed'
    }
    return 'applied'
  } catch (refreshError) {
    if (isQualityScopeStaleError(refreshError) || scope.isStale()) {
      return 'stale'
    }
    const err = toUserError(refreshError, fallbackMessage)
    onLoadError?.(err)
    showUserError(refreshError, fallbackMessage)
    return 'failed'
  }
}
