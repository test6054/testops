import { resetAuthState } from '@/config/axios/auth-state'
import { STORAGE_TOKEN, STORAGE_TOKEN_EXPIRES_AT } from '@/constants/storage-keys'

const isLogin = () => {
  return !!getValidToken()
}

const getToken = () => {
  return localStorage.getItem(STORAGE_TOKEN)
}

/**
 * 获取有效的 token（检查过期时间）
 * 如果 token 过期，会自动清除认证相关存储
 */
const getValidToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (!token) return null

  const tokenExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
  if (!tokenExpiresAt) return null

  const expiresAtTime = Number.parseInt(tokenExpiresAt)
  const now = Date.now() / 1000
  if (expiresAtTime <= now) {
    return null
  }

  return token
}

const setToken = (token: string) => {
  localStorage.setItem(STORAGE_TOKEN, token)
  // 设置 token 成功后重置认证状态
  resetAuthState()
}

const clearToken = () => {
  localStorage.removeItem(STORAGE_TOKEN)
}

export { clearToken, getToken, getValidToken, isLogin, setToken }
