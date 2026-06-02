import { getValidToken } from '@/utils/auth'

const KIOSK_AUTH_STORAGE_KEY = 'mark-scanner-kiosk-auth'

export interface KioskAuthSession {
  authorizationHeader: string
  tenantId: string
}

/**
 * 一体机 / 扫描工位链路的 HTTP 路径：允许 JWT 或 Agent 激活后的 push_token 鉴权。
 */
export function isMarkScannerStationApiUrl(url: string): boolean {
  return (
    url.includes('/api/mark/scanner/kiosk/')
    || url.includes('/api/mark/sse/scan-live/')
    || url.includes('/api/mark/scan-live/')
  )
}

/** @deprecated 使用 isMarkScannerStationApiUrl */
export function isKioskApiUrl(url: string): boolean {
  return isMarkScannerStationApiUrl(url)
}

export function saveKioskAuthSession(response: {
  pushAuthorizationHeader: string
  tenantId?: string
}): void {
  if (!response.pushAuthorizationHeader) {
    throw new Error('一体机激活响应缺少 pushAuthorizationHeader')
  }
  const session: KioskAuthSession = {
    authorizationHeader: response.pushAuthorizationHeader,
    tenantId: response.tenantId || '',
  }
  sessionStorage.setItem(KIOSK_AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function getKioskAuthSession(): KioskAuthSession | null {
  const raw = sessionStorage.getItem(KIOSK_AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as KioskAuthSession
    if (!parsed?.authorizationHeader) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearKioskAuthSession(): void {
  sessionStorage.removeItem(KIOSK_AUTH_STORAGE_KEY)
}

export function hasMarkScannerJwtAuth(): boolean {
  return Boolean(getValidToken())
}

export function hasMarkScannerKioskAuth(): boolean {
  return getKioskAuthSession() !== null
}

/**
 * 扫描工位链路统一鉴权头：教师 Web 优先 JWT；一体机无登录时使用 Agent push_token。
 */
export function buildMarkScannerStationAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const jwt = getValidToken()
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`
    return headers
  }
  const kioskAuth = getKioskAuthSession()
  if (kioskAuth) {
    headers.Authorization = kioskAuth.authorizationHeader
    if (kioskAuth.tenantId) {
      headers['X-Tenant-Id'] = kioskAuth.tenantId
    }
    return headers
  }
  return headers
}

/**
 * 扫描工位链路是否具备可用鉴权（JWT 或 push_token 任一即可）。
 */
export function hasMarkScannerStationAuth(): boolean {
  return hasMarkScannerJwtAuth() || hasMarkScannerKioskAuth()
}

/** 一体机 Agent 已绑定但浏览器 sessionStorage 未缓存 push_token（常见于页面刷新）。 */
export const KIOSK_BROWSER_SESSION_LOST_MESSAGE
  = '浏览器会话已失效，请在设备设置中使用激活码重新激活一体机'

export function needsKioskBrowserReactivation(agentBound: boolean | undefined): boolean {
  return Boolean(agentBound) && !hasMarkScannerJwtAuth() && !hasMarkScannerKioskAuth()
}
