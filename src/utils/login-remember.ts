import {
  STORAGE_REMEMBER_ME,
  STORAGE_REMEMBERED_USERNAME,
} from '@/constants/storage-keys'

/** 账号登录页「记住我」配置，仅持久化用户名，不存密码 */
export interface LoginRememberConfig {
  rememberMe: boolean
  username: string
}

const LOGIN_CONFIG_KEY = 'login-config'

const DEFAULT_LOGIN_CONFIG: LoginRememberConfig = {
  rememberMe: true,
  username: '',
}

/**
 * 读取 login-config；解析失败时返回默认配置。
 */
export function readLoginRememberConfig(): LoginRememberConfig {
  try {
    const raw = localStorage.getItem(LOGIN_CONFIG_KEY)
    if (!raw) {
      return { ...DEFAULT_LOGIN_CONFIG }
    }
    const parsed = JSON.parse(raw) as Partial<LoginRememberConfig>
    return {
      rememberMe: parsed.rememberMe !== false,
      username: typeof parsed.username === 'string' ? parsed.username : '',
    }
  } catch {
    return { ...DEFAULT_LOGIN_CONFIG }
  }
}

/**
 * 写入 login-config。
 */
export function writeLoginRememberConfig(config: LoginRememberConfig) {
  localStorage.setItem(LOGIN_CONFIG_KEY, JSON.stringify(config))
}

/**
 * 清除历史遗留的 rememberedUsername / rememberMe 键。
 */
export function clearLegacyRememberKeys() {
  localStorage.removeItem(STORAGE_REMEMBERED_USERNAME)
  localStorage.removeItem(STORAGE_REMEMBER_ME)
}

/**
 * 取消「记住我」时立即生效：清空已存用户名并移除遗留键。
 */
export function clearRememberedAccount() {
  writeLoginRememberConfig({
    rememberMe: false,
    username: '',
  })
  clearLegacyRememberKeys()
}

/**
 * 登录成功且勾选记住我时，持久化用户名。
 */
export function persistRememberedAccount(username: string) {
  writeLoginRememberConfig({
    rememberMe: true,
    username,
  })
  clearLegacyRememberKeys()
}

/**
 * 将旧版 rememberedUsername 迁移进 login-config（一次性）。
 */
export function migrateLegacyRememberedAccount(): LoginRememberConfig {
  const config = readLoginRememberConfig()
  if (config.username || !config.rememberMe) {
    clearLegacyRememberKeys()
    return config
  }
  const legacyUsername = localStorage.getItem(STORAGE_REMEMBERED_USERNAME)
  if (!legacyUsername) {
    clearLegacyRememberKeys()
    return config
  }
  const merged: LoginRememberConfig = {
    rememberMe: true,
    username: legacyUsername,
  }
  writeLoginRememberConfig(merged)
  clearLegacyRememberKeys()
  return merged
}

/**
 * 登出时：未勾选记住我则清除已存用户名；始终清理遗留键。
 */
export function syncRememberedAccountOnLogout() {
  const config = readLoginRememberConfig()
  if (!config.rememberMe) {
    writeLoginRememberConfig({
      rememberMe: false,
      username: '',
    })
  }
  clearLegacyRememberKeys()
}
