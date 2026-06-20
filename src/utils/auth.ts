import { jwtDecode } from 'jwt-decode'
import { resetAuthState } from '@/config/axios/auth-state'
import { STORAGE_REFRESH_TOKEN, STORAGE_TOKEN, STORAGE_TOKEN_EXPIRES_AT } from '@/constants/storage-keys'

const isLogin = () => {
  return !!getValidToken()
}

const getToken = () => {
  return localStorage.getItem(STORAGE_TOKEN)
}

const hasPersistedSessionHint = (): boolean => {
  return !!getToken()
    || !!localStorage.getItem(STORAGE_REFRESH_TOKEN)
    || !!localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
}

/** 以 JWT exp 为唯一过期真源，并回写 tokenExpiresAt 修复缓存漂移 */
const healTokenExpiresAt = (token: string, jwtExp: number): void => {
  const storedExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
  const parsedStoredExp = storedExpiresAt ? Number.parseInt(storedExpiresAt) : Number.NaN
  if (parsedStoredExp !== jwtExp) {
    localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, String(jwtExp))
  }
}

/**
 * 获取有效的 access token。
 * 必须以 JWT exp 为准：tokenExpiresAt 仅作缓存，过期但 JWT 仍有效时不得判无效。
 */
const getValidToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) {
    return null
  }

  const now = Date.now() / 1000
  try {
    const claims = jwtDecode<{ exp: number }>(token)
    if (claims.exp > now) {
      healTokenExpiresAt(token, claims.exp)
      return token
    }
  } catch {
    return null
  }

  return null
}

const setToken = (token: string) => {
  localStorage.setItem(STORAGE_TOKEN, token)
  try {
    const claims = jwtDecode<{ exp: number }>(token)
    localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, String(claims.exp))
  } catch {
    localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT)
  }
  resetAuthState()
}

const clearToken = () => {
  localStorage.removeItem(STORAGE_TOKEN)
}

export { clearToken, getToken, getValidToken, hasPersistedSessionHint, healTokenExpiresAt, isLogin, setToken }
