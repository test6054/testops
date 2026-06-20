import { getValidToken } from '@/utils/auth'

const KIOSK_AUTH_STORAGE_KEY = 'mark-scanner-kiosk-auth'
const KIOSK_BINDING_PROFILE_KEY = 'mark-scanner-kiosk-binding-profile'

export interface KioskAuthSession {
  authorizationHeader: string
  tenantId: string
}

export interface KioskBindingProfile {
  scannerDeviceId: string
  scannerStationId: string
  endpointName: string
  gatewayBaseUrl: string
  deviceName: string
}

export type MarkScannerStationAuthSource = 'jwt' | 'kiosk'

export interface MarkScannerStationAuth {
  headers: Record<string, string>
  source: MarkScannerStationAuthSource | null
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
  scannerDeviceId?: string
  scannerStationId?: string
  deviceName?: string
  gatewayBaseUrl?: string
  endpointName?: string
}): void {
  if (!response.pushAuthorizationHeader) {
    throw new Error('一体机激活响应缺少 pushAuthorizationHeader')
  }
  const session: KioskAuthSession = {
    authorizationHeader: response.pushAuthorizationHeader,
    tenantId: response.tenantId || '',
  }
  localStorage.setItem(KIOSK_AUTH_STORAGE_KEY, JSON.stringify(session))

  if (response.scannerDeviceId && response.scannerStationId) {
    saveKioskBindingProfile({
      scannerDeviceId: response.scannerDeviceId,
      scannerStationId: response.scannerStationId,
      endpointName: response.endpointName?.trim() || response.deviceName?.trim() || '',
      gatewayBaseUrl: response.gatewayBaseUrl?.trim() || '',
      deviceName: response.deviceName?.trim() || '',
    })
  }
}

export function getKioskAuthSession(): KioskAuthSession | null {
  const raw = localStorage.getItem(KIOSK_AUTH_STORAGE_KEY)
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

export function saveKioskBindingProfile(profile: KioskBindingProfile): void {
  localStorage.setItem(KIOSK_BINDING_PROFILE_KEY, JSON.stringify(profile))
}

export function getKioskBindingProfile(): KioskBindingProfile | null {
  const raw = localStorage.getItem(KIOSK_BINDING_PROFILE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as KioskBindingProfile
    if (!parsed?.scannerDeviceId || !parsed?.scannerStationId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearKioskAuthSession(): void {
  localStorage.removeItem(KIOSK_AUTH_STORAGE_KEY)
  localStorage.removeItem(KIOSK_BINDING_PROFILE_KEY)
}

/**
 * 教师端扫描工位 API 发起前尝试刷新 JWT，避免 access token 过期后误用残留 push_token。
 */
export async function ensureScannerStationTeacherJwt(): Promise<string | null> {
  if (isScannerKioskBrowserPage()) {
    return getValidToken()
  }
  const token = getValidToken()
  if (token) {
    return token
  }
  try {
    const { useAuthStore } = await import('@/stores/modules/auth')
    const authStore = useAuthStore()
    await authStore.refreshTokenAutomatically()
  } catch {
    // 刷新失败由后续鉴权分支显式失败
  }
  return getValidToken()
}

export function hasMarkScannerJwtAuth(): boolean {
  return Boolean(getValidToken())
}

export function hasMarkScannerKioskAuth(): boolean {
  return getKioskAuthSession() !== null
}

/**
 * 判断当前页面是否运行在扫描一体机工作台。
 *
 * 一体机页面部署在 /mark/scanner-kiosk/* 时，浏览器 pathname 会带上部署前缀；
 * 因此按路径片段判断，而不是按 Vue Router 内部 path 判断。
 */
export function isScannerKioskBrowserPage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const pathname = window.location.pathname
  return pathname === '/scanner-kiosk' || pathname.includes('/scanner-kiosk/')
}

/**
 * 扫描工位链路统一鉴权头。
 *
 * 业务约束：扫描一体机页面必须使用 Agent 激活后下发的 push_token，不能被浏览器里残留的教师
 * JWT 覆盖；教师端扫描看板仍优先使用教师 JWT，以保留教师租户视野和 token 续期能力。
 */
export function resolveMarkScannerStationAuthHeaders(
  extra: Record<string, string> = {},
): MarkScannerStationAuth {
  const headers: Record<string, string> = { ...extra }
  const kioskAuth = getKioskAuthSession()
  const jwt = getValidToken()

  if (isScannerKioskBrowserPage()) {
    if (kioskAuth) {
      headers.Authorization = kioskAuth.authorizationHeader
      if (kioskAuth.tenantId) {
        headers['X-Tenant-Id'] = kioskAuth.tenantId
      }
      return { headers, source: 'kiosk' }
    }
    return { headers, source: null }
  }

  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`
    return { headers, source: 'jwt' }
  }

  // 教师端禁止回退到一体机 push_token，避免浏览器残留 token 触发无效鉴权与重复弹窗。
  return { headers, source: null }
}

/**
 * 扫描工位链路统一鉴权头：一体机页面优先 Agent push_token，教师页面优先 JWT。
 */
export function buildMarkScannerStationAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return resolveMarkScannerStationAuthHeaders(extra).headers
}

/**
 * 扫描工位链路是否具备可用鉴权（JWT 或 push_token 任一即可）。
 */
export function hasMarkScannerStationAuth(): boolean {
  return resolveMarkScannerStationAuthHeaders().source !== null
}

/** 一体机 Agent 已绑定但浏览器未缓存 push_token（常见于页面刷新）。 */
export const KIOSK_BROWSER_SESSION_LOST_MESSAGE
  = '浏览器会话已失效，请使用激活码重新激活一体机'

export function needsKioskBrowserReactivation(agentBound: boolean | undefined): boolean {
  if (isScannerKioskBrowserPage()) {
    return Boolean(agentBound) && !hasMarkScannerKioskAuth()
  }
  return Boolean(agentBound) && !hasMarkScannerJwtAuth() && !hasMarkScannerKioskAuth()
}
