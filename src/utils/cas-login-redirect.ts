import { getSafeRedirect } from '@/utils/redirect-validator'

const CAS_LOGIN_REDIRECT_KEY = 'cas-login-redirect'

/**
 * 在离开本站进入 CAS 前保存站内目标，避免外部重定向往返后丢失原业务入口。
 */
export function rememberCasLoginRedirect(redirect: unknown): void {
  const candidate = typeof redirect === 'string' ? redirect : ''
  const safeRedirect = getSafeRedirect(candidate, '')
  if (!safeRedirect) {
    sessionStorage.removeItem(CAS_LOGIN_REDIRECT_KEY)
    return
  }
  sessionStorage.setItem(CAS_LOGIN_REDIRECT_KEY, safeRedirect)
}

/**
 * CAS 登录链闭环后一次性取出目标，继续复用站内重定向安全校验。
 */
export function consumeCasLoginRedirect(fallback: string): string {
  const storedRedirect = sessionStorage.getItem(CAS_LOGIN_REDIRECT_KEY)
  sessionStorage.removeItem(CAS_LOGIN_REDIRECT_KEY)
  return getSafeRedirect(storedRedirect, fallback)
}

export function clearCasLoginRedirect(): void {
  sessionStorage.removeItem(CAS_LOGIN_REDIRECT_KEY)
}
