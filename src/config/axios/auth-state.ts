/**
 * 认证运行时状态
 * 供 axios 拦截器、认证 store、认证工具共享，避免相互直接依赖。
 */

interface AuthRuntimeState {
  authFailed: boolean
  isRedirecting: boolean
  redirectTimeoutTimer: ReturnType<typeof setTimeout> | null
}

export const authRuntimeState: AuthRuntimeState = {
  authFailed: false,
  isRedirecting: false,
  redirectTimeoutTimer: null,
}

export function resetAuthState(): void {
  authRuntimeState.authFailed = false
  authRuntimeState.isRedirecting = false
  if (authRuntimeState.redirectTimeoutTimer) {
    clearTimeout(authRuntimeState.redirectTimeoutTimer)
    authRuntimeState.redirectTimeoutTimer = null
  }
}
