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
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_LOGIN_CONFIG }
    }
    const rememberMe = Object.getOwnPropertyDescriptor(parsed, 'rememberMe')?.value
    const username = Object.getOwnPropertyDescriptor(parsed, 'username')?.value
    return {
      rememberMe: rememberMe !== false,
      username: typeof username === 'string' ? username : '',
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
 * 取消「记住我」时立即生效：清空已存用户名。
 */
export function clearRememberedAccount() {
  writeLoginRememberConfig({
    rememberMe: false,
    username: '',
  })
}

/**
 * 登录成功且勾选记住我时，持久化用户名。
 */
export function persistRememberedAccount(username: string) {
  writeLoginRememberConfig({
    rememberMe: true,
    username,
  })
}

/**
 * 登出时：未勾选记住我则清除已存用户名。
 */
export function syncRememberedAccountOnLogout() {
  const config = readLoginRememberConfig()
  if (!config.rememberMe) {
    writeLoginRememberConfig({
      rememberMe: false,
      username: '',
    })
  }
}
