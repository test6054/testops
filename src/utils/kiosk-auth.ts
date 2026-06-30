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
 * 一体机 / 扫描工位链路的 HTTP 路径：一体机走 Agent push_token；教师 Web 扫描看板可走 JWT。
 */
export function isMarkScannerStationApiUrl(url: string): boolean {
  return (
    url.includes('/api/mark/scanner/kiosk/')
    || url.includes('/api/mark/scanner/work-order/')
    || url.includes('/api/mark/scanner/dispatch/')
    || url.includes('/api/mark/scanner/exception/')
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
 * 从本机 Agent DeviceBinding 同步 push_token 到浏览器会话。
 * @returns 是否写入了新的 push_token
 */
export async function syncKioskAuthFromLocalAgent(): Promise<boolean> {
  const { getAgentKioskBrowserAuth } = await import('@/apis/mark/scanner-agent-local')
  const session = await getAgentKioskBrowserAuth()
  const existing = getKioskAuthSession()
  if (existing?.authorizationHeader === session.pushAuthorizationHeader) {
    return false
  }
  saveKioskAuthSession({
    pushAuthorizationHeader: session.pushAuthorizationHeader,
    tenantId: session.tenantId,
    scannerDeviceId: session.scannerDeviceId,
    scannerStationId: session.scannerStationId,
    deviceName: session.deviceName,
    gatewayBaseUrl: session.gatewayBaseUrl,
    endpointName: getKioskBindingProfile()?.endpointName,
  })
  return true
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
 * 业务约束：/scanner-kiosk/* 页面只能使用 Agent 激活后的 push_token，不得使用教师 JWT；
 * 教师端扫描看板（非一体机页面）仍优先使用教师 JWT。
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

/** Agent 已绑定但浏览器未缓存 push_token，应从本机 Agent 同步，不等于未激活。 */
export function needsKioskBrowserSessionSync(agentBound: boolean | undefined): boolean {
  return Boolean(agentBound) && !hasMarkScannerKioskAuth()
}

/**
 * @deprecated 一体机页面请用 {@link needsKioskBrowserSessionSync}；仅教师端扫描看板保留。
 */
export function needsKioskBrowserReactivation(agentBound: boolean | undefined): boolean {
  if (isScannerKioskBrowserPage()) {
    return needsKioskBrowserSessionSync(agentBound)
  }
  return Boolean(agentBound) && !hasMarkScannerJwtAuth() && !hasMarkScannerKioskAuth()
}

/** 本机 Agent 已绑定，正在或需要从 DeviceBinding 同步 push_token 到浏览器。 */
export const KIOSK_BROWSER_SESSION_SYNC_MESSAGE
  = '正在从本机 Agent 同步会话，请稍候'

/** 无法从本机 Agent 拉取 push_token（Agent 未启动、未绑定或版本过旧）。 */
export const KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE
  = '无法从本机 Agent 同步会话，请确认 Agent 已启动并完成激活；仍无法恢复时请重新输入激活码'

/** Agent 同步后服务端仍拒绝 push_token，凭证已失效。 */
export const KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE
  = '扫描工位凭证已失效，请重新输入激活码完成绑定'

/**
 * 从本机 Agent DeviceBinding 恢复浏览器 push_token 会话。
 * @returns 是否已具备可用 kiosk 鉴权
 */
export async function recoverKioskBrowserSessionFromAgent(): Promise<boolean> {
  try {
    await syncKioskAuthFromLocalAgent()
  } catch {
    // Agent 未绑定或本地 API 不可用时由调用方按激活流程处理
  }
  return hasMarkScannerKioskAuth()
}
