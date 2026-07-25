/** 工位派单 kiosk URL 构建（归档卷 / 档案袋共用） */

export function resolveMarkVueAppRoot(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const baseUrl = import.meta.env.BASE_URL || '/'
  if (baseUrl === '/') {
    return window.location.origin
  }
  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${window.location.origin}${normalized}`
}

export function appendUrlQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${key}=${encodeURIComponent(value)}`
}

/** 工位派单 URL 构建字段 */
export interface ScanDispatchKioskUrlTicket {
  ticketId: string
  kioskDispatchUrl?: string
}

export function buildScanDispatchKioskUrl(
  ticket: ScanDispatchKioskUrlTicket,
  returnTo?: string,
): string {
  const path = ticket.kioskDispatchUrl || `/scanner-kiosk/dispatch/${ticket.ticketId}`
  const url = `${resolveMarkVueAppRoot()}${path}`
  const trimmedReturnTo = returnTo?.trim()
  if (!trimmedReturnTo) {
    return url
  }
  return appendUrlQueryParam(url, 'returnTo', trimmedReturnTo)
}
