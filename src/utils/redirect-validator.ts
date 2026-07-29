/**
 * 重定向路径安全校验
 * 防止开放重定向攻击（Open Redirect），只允许站内相对路径跳转
 */

/**
 * 校验重定向路径是否安全（仅允许相对路径，禁止协议前缀和双斜杠）
 *
 * @param path 待校验的重定向路径
 * @return 路径安全返回 true，否则返回 false
 */
export function isValidRedirect(path: string): boolean {
  if (!path) {
    return false
  }

  const trimmed = path.trim()

  // 禁止空路径
  if (trimmed.length === 0) {
    return false
  }

  // 必须以单个 / 开头（相对路径）
  if (!trimmed.startsWith('/')) {
    return false
  }

  // 禁止双斜杠开头（协议相对URL，如 //evil.com）
  if (trimmed.startsWith('//')) {
    return false
  }

  // 禁止包含协议前缀（如 javascript:、data:、http:、https:）
  if (/[a-z]+:/i.test(trimmed)) {
    return false
  }

  // 禁止包含反斜杠（某些浏览器会将 /\ 解析为 //）
  if (trimmed.includes('\\')) {
    return false
  }

  // 禁止包含换行符等控制字符（防止 header injection）
  return !/[\r\n\t]/.test(trimmed)
}

/**
 * 获取安全的重定向路径，不安全时返回默认路径
 *
 * @param path 待校验的重定向路径
 * @param fallback 校验失败时的默认路径
 * @return 安全的重定向路径
 */
export function getSafeRedirect(path: string | undefined | null, fallback: string = '/'): string {
  if (!path) {
    return fallback
  }
  try {
    const decoded = decodeURIComponent(path)
    return isValidRedirect(decoded) ? decoded : fallback
  } catch {
    return fallback
  }
}
