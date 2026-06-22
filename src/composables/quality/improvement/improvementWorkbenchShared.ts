import { isQualityScopeStaleError } from '@/composables/useScopeRequestGuard'
import { showUserError, toUserError } from '@/utils/error-handler'

/** 质量 selector 变更值：单选 string 或空 */
export type QualitySelectorChangeValue = string | string[] | null | undefined

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

function failRefreshMutation(
  cause: unknown,
  onLoadError: ((error: Error | null) => void) | undefined,
  fallbackMessage: string,
): never {
  const err = toUserError(cause, fallbackMessage)
  onLoadError?.(err)
  showUserError(cause, fallbackMessage)
  throw err
}

/** mutation 后刷新 SignalBand：scope 过期静默丢弃；未写入且 scope 仍有效则显式失败 */
export async function refreshWorkbenchSignalsAfterMutation(
  scope: { isStale: () => boolean },
  onWorkbenchRefresh: WorkbenchSignalRefreshHandler | undefined,
  onLoadError: ((error: Error | null) => void) | undefined,
  fallbackMessage: string,
): Promise<void> {
  try {
    const applied = await onWorkbenchRefresh?.()
    if (applied === false) {
      if (scope.isStale()) {
        return
      }
      failRefreshMutation(null, onLoadError, fallbackMessage)
    }
  } catch (refreshError) {
    if (isQualityScopeStaleError(refreshError) || scope.isStale()) {
      return
    }
    failRefreshMutation(refreshError, onLoadError, fallbackMessage)
  }
}
