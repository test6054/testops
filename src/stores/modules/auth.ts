import type { LocationQuery } from 'vue-router'
import type {
  LoginRequest,
  LoginSuccessResponse,
  PhoneLoginRequest,
  StudentLoginRequest,
} from '@/apis/auth'
import { passwordLogin, phoneLogin, refreshToken, studentLogin, wechatCallback } from '@/apis/auth'
import type { RefreshTokenResponse } from '@/types/auth'
import { jwtDecode } from 'jwt-decode'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clearAllGradingDrafts } from '@/composables/useGradingDraftPersist'
import { resetAuthState } from '@/config/axios/auth-state'
import {
  STORAGE_REFRESH_TOKEN,
  STORAGE_TOKEN,
  STORAGE_TOKEN_EXPIRES_AT,
} from '@/constants/storage-keys'
import { resetRouter } from '@/router'
import { resetHasMenuFlag } from '@/router/guard'
import { RoleEnum } from '@/types/enums'
import { clearToken, getToken, getValidToken, healTokenExpiresAt, setToken } from '@/utils/auth'
import { getDeviceId } from '@/utils/device'
import { syncRememberedAccountOnLogout } from '@/utils/login-remember'
import mittBus from '@/utils/mitt'
import { useTenantStore } from './tenant'
import { useUserStore } from './user'

// 类型定义
export interface AccountLoginReq {
  username: string
  password: string
  captchaVerification?: string // AJ-Captcha验证码令牌
}

export interface StudentLoginReq {
  studentNo: string
  password: string
  schoolName: string // 学校名称（后端根据名称查找租户）
  captchaVerification?: string // AJ-Captcha验证码令牌
}

interface JwtClaims {
  sub: string // 用户ID
  username: string // 用户名
  role: string // 用户角色（单角色）
  permissions: string[] // 权限列表
  tenantId?: string // 租户ID
  iat: number // 签发时间
  exp: number // 过期时间
  jti: string // JWT ID
}

type RefreshTokenError = Error & {
  response?: { status: number }
  code?: string
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const userStore = useUserStore()
    const tenantStore = useTenantStore()

    const token = ref(getToken() || '')
    const refreshTokenState = ref<string | null>(localStorage.getItem(STORAGE_REFRESH_TOKEN))
    const tokenExpiresAt = ref<number | null>(null)
    const pwdExpiredShow = ref<boolean>(true)

    // 角色和权限ref（单角色模式）
    const role = ref<string>('') // 单角色
    const permissions = ref<string[]>([])

    // Token自动刷新相关
    const refreshTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const refreshPromise = ref<Promise<RefreshTokenResponse> | null>(null)
    const refreshingToken = ref(false)
    /** 刷新操作单飞 Promise：定时器 / 路由守卫 / axios / SSE 共用，避免 refresh token 轮换竞态 */
    let refreshOperationPromise: Promise<boolean> | null = null
    /** initializeAuth 单飞，避免路由守卫并发触发多次刷新 */
    let initializeAuthPromise: Promise<void> | null = null
    /** runInitializeAuth 单飞：initializeAuth 超时返回后后台恢复仍共用同一 Promise */
    let runInitializeAuthPromise: Promise<void> | null = null
    /** 首屏与路由守卫等待会话恢复的上限，避免 refresh 重试把页面卡在静态 loading */
    const AUTH_INITIALIZATION_TIMEOUT_MS = 10000
    /** 后台预刷新取消信号；destroyAuth / 登出时 abort，避免登出后还有残留 retry 跑 */
    let scheduledRefreshAbort: AbortController | null = null

    const isLoading = ref(false)

    // 认证和权限相关计算属性
    const isAuthenticated = computed(() => {
      const currentToken = getToken() || token.value
      if (!currentToken) {
        return false
      }
      try {
        const claims = jwtDecode<{ exp: number }>(currentToken)
        return claims.exp > Date.now() / 1000
      } catch {
        return false
      }
    })

    // 用户角色
    const userRole = computed(() => role.value)

    // 角色检查 - 使用统一枚举
    const isAdmin = computed(() => userRole.value === RoleEnum.SUPER_ADMIN)
    const isTeacher = computed(
      () => userRole.value === RoleEnum.SCH_TECH || userRole.value === RoleEnum.SUPER_ADMIN,
    )
    const isStudent = computed(() => userRole.value === RoleEnum.SCH_STU)

    const isTokenExpiringSoon = computed(() => {
      if (!tokenExpiresAt.value) return false
      const now = Date.now() / 1000
      return tokenExpiresAt.value - now < 300 // 5分钟
    })

    const isTokenExpired = computed(() => {
      if (!tokenExpiresAt.value) return false
      const now = Date.now() / 1000
      return tokenExpiresAt.value <= now
    })

    // JWT相关方法
    const decodeToken = (tokenStr?: string): JwtClaims => {
      const targetToken = tokenStr || token.value
      if (!targetToken) {
        throw new Error('登录状态已失效，请重新登录')
      }
      try {
        return jwtDecode<JwtClaims>(targetToken)
      } catch {
        throw new Error('登录状态已失效，请重新登录')
      }
    }

    const isTokenExpiredCheck = (tokenStr?: string): boolean => {
      try {
        const tokenClaims = decodeToken(tokenStr)
        const now = Date.now() / 1000
        return tokenClaims.exp <= now
      } catch {
        return true
      }
    }

    const hasRole = (targetRole: string): boolean => {
      return role.value === targetRole
    }

    const hasAnyRole = (roleList: string[]): boolean => {
      return roleList.includes(role.value)
    }

    const hasPermission = (permission: string): boolean => {
      return permissions.value.includes(permission)
    }

    const hasAnyPermission = (permissionList: string[]): boolean => {
      return permissionList.some((permission) => permissions.value.includes(permission))
    }

    // 重置token
    const resetToken = () => {
      token.value = ''
      refreshTokenState.value = null
      tokenExpiresAt.value = null
      clearToken()
      localStorage.removeItem(STORAGE_REFRESH_TOKEN)
      localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT)
      clearRefreshTimer()
      resetHasMenuFlag()
    }

    const setTokenWithExpiry = (newToken: string, _expiresIn?: number) => {
      void _expiresIn
      if (!newToken) {
        resetToken()
        return
      }

      try {
        const tokenClaims = decodeToken(newToken)
        token.value = newToken
        setToken(newToken)

        const expireTime = tokenClaims.exp * 1000
        tokenExpiresAt.value = tokenClaims.exp
        healTokenExpiresAt(newToken, tokenClaims.exp)

        scheduleTokenRefresh(expireTime)
      } catch {
        resetToken()
      }
    }

    const setRefreshToken = (newRefreshToken: string) => {
      refreshTokenState.value = newRefreshToken
      localStorage.setItem(STORAGE_REFRESH_TOKEN, newRefreshToken)
    }

    const clearRefreshTimer = () => {
      if (refreshTimer.value) {
        clearTimeout(refreshTimer.value)
        refreshTimer.value = null
      }
      if (scheduledRefreshAbort) {
        scheduledRefreshAbort.abort()
        scheduledRefreshAbort = null
      }
    }

    const syncTokenStateFromStorage = (): boolean => {
      let storedToken = localStorage.getItem(STORAGE_TOKEN) || ''
      let storedTokenExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
      const storedRefreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN)

      // 修复 pinia 与 localStorage 双写漂移：内存/pinia 有有效 token 但 'token' key 被清空时回写
      if (!storedToken && token.value && !isTokenExpiredCheck(token.value)) {
        setToken(token.value)
        storedToken = token.value
        if (!storedTokenExpiresAt) {
          if (tokenExpiresAt.value) {
            storedTokenExpiresAt = tokenExpiresAt.value.toString()
            localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, storedTokenExpiresAt)
          } else {
            try {
              const claims = decodeToken(token.value)
              tokenExpiresAt.value = claims.exp
              storedTokenExpiresAt = claims.exp.toString()
              localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, storedTokenExpiresAt)
            } catch {
              /* 无效 token 不在此修复 */
            }
          }
        }
      }

      const parsedExpiresAt = storedTokenExpiresAt ? Number.parseInt(storedTokenExpiresAt) : null
      const normalizedExpiresAt =
        parsedExpiresAt !== null && !Number.isNaN(parsedExpiresAt) ? parsedExpiresAt : null
      const hasChanged =
        token.value !== storedToken ||
        refreshTokenState.value !== storedRefreshToken ||
        tokenExpiresAt.value !== normalizedExpiresAt

      if (!hasChanged) {
        return false
      }

      token.value = storedToken
      refreshTokenState.value = storedRefreshToken
      tokenExpiresAt.value = normalizedExpiresAt

      if (storedToken && normalizedExpiresAt) {
        scheduleTokenRefresh(normalizedExpiresAt * 1000)
      } else if (storedToken) {
        try {
          const claims = decodeToken(storedToken)
          tokenExpiresAt.value = claims.exp
          localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, claims.exp.toString())
          scheduleTokenRefresh(claims.exp * 1000)
        } catch {
          clearRefreshTimer()
        }
      } else {
        clearRefreshTimer()
      }

      return true
    }

    const scheduleTokenRefresh = (expireTime: number) => {
      clearRefreshTimer()
      const now = Date.now()
      const timeUntilRefresh = expireTime - now - 5 * 60 * 1000

      if (timeUntilRefresh > 0) {
        const abort = new AbortController()
        scheduledRefreshAbort = abort

        refreshTimer.value = setTimeout(async () => {
          let retries = 0
          const maxRetries = 3
          while (retries < maxRetries) {
            if (abort.signal.aborted) return
            try {
              const success = await refreshTokenAutomatically()
              if (success) return
            } catch {
              /* 下次重试 */
            }
            retries++
            if (retries < maxRetries) {
              await new Promise<void>((resolve) => {
                if (abort.signal.aborted) {
                  resolve()
                  return
                }
                const delayTimer = setTimeout(resolve, retries * 2000)
                abort.signal.addEventListener(
                  'abort',
                  () => {
                    clearTimeout(delayTimer)
                    resolve()
                  },
                  { once: true },
                )
              })
            }
          }
        }, timeUntilRefresh)
      }
    }

    const hasValidAccessToken = (): boolean => {
      syncTokenStateFromStorage()
      return !!getValidToken()
    }

    const isRetryableError = (error: RefreshTokenError): boolean => {
      if (!error.response && error.code !== 'ECONNABORTED') return true
      if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) return true
      if (error.response !== undefined && error.response.status >= 500) return true
      const retryableStatus = [408, 429, 502, 503, 504]
      return !!(error.response?.status && retryableStatus.includes(error.response.status))
    }

    const isNonFatalRefreshError = (error: RefreshTokenError | null): boolean => {
      if (!error) {
        return false
      }
      if (isRetryableError(error)) {
        return true
      }
      return error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED'
    }

    const executeRefreshTokenAutomatically = async (): Promise<boolean> => {
      try {
        if (hasValidAccessToken()) {
          return true
        }

        if (!refreshTokenState.value) {
          return false
        }

        const maxRetries = 3
        let lastError: RefreshTokenError | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (hasValidAccessToken()) {
            return true
          }

          const attemptedRefreshToken: string | null = refreshTokenState.value
          if (!attemptedRefreshToken) {
            return false
          }

          try {
            refreshingToken.value = true
            refreshPromise.value = refreshToken({ refreshToken: attemptedRefreshToken })
            const refreshData = await refreshPromise.value

            if (!refreshData?.accessToken) {
              continue
            }

            setTokenWithExpiry(refreshData.accessToken, refreshData.expiresIn)
            if (refreshData.refreshToken) {
              setRefreshToken(refreshData.refreshToken)
            }
            if (token.value) {
              mittBus.emit('auth:token-refreshed', {
                tokenExpiresAt: tokenExpiresAt.value ?? undefined,
              })
            }
            return true
          } catch (error) {
            const refreshError: RefreshTokenError =
              error instanceof Error ? error : new Error(String(error))
            lastError = refreshError

            if (hasValidAccessToken()) {
              return true
            }

            if (refreshTokenState.value && refreshTokenState.value !== attemptedRefreshToken) {
              continue
            }

            const shouldRetry = attempt < maxRetries && isRetryableError(refreshError)
            if (shouldRetry) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
            } else {
              break
            }
          }
        }

        if (hasValidAccessToken()) {
          return true
        }

        if (isNonFatalRefreshError(lastError)) {
          return false
        }

        await logoutCallBack()
        return false
      } finally {
        refreshingToken.value = false
        refreshPromise.value = null
      }
    }

    const refreshTokenAutomatically = async (): Promise<boolean> => {
      if (refreshOperationPromise) {
        return refreshOperationPromise
      }

      refreshOperationPromise = executeRefreshTokenAutomatically()
      try {
        return await refreshOperationPromise
      } finally {
        refreshOperationPromise = null
      }
    }

    const checkAndRefreshToken = async (): Promise<boolean> => {
      if (!token.value) return false
      try {
        const tokenClaims = decodeToken(token.value)
        const now = Date.now() / 1000
        if (tokenClaims.exp <= now) return await refreshTokenAutomatically()
        const timeUntilExpiry = tokenClaims.exp - now
        if (timeUntilExpiry <= 300 && !refreshingToken.value) {
          return await refreshTokenAutomatically()
        }
        return true
      } catch {
        return await refreshTokenAutomatically()
      }
    }

    const applyLoginUserData = (res: LoginSuccessResponse) => {
      if (!res.userInfo) return

      const userData = res.userInfo
      // Set role and permissions in auth store
      if (userData.roleKey) {
        role.value = userData.roleKey
      }
      if (userData.authorities) {
        permissions.value = userData.authorities.map((auth: string | { authority: string }) =>
          typeof auth === 'string' ? auth : auth.authority,
        )
      }

      // Pass user data to UserStore
      userStore.setUserInfo(userData)
      // Pass tenant data to UserStore (it handles syncing to TenantStore if needed, or we do it here)
      // Actually userStore has setTenantInfo logic implicitly in applyLoginUserData in the old code.
      // Let's call userStore to handle the rest.
    }

    const accountLogin = async (req: AccountLoginReq) => {
      try {
        isLoading.value = true
        resetAuthState()

        const loginReq: LoginRequest = {
          userName: req.username,
          password: req.password,
          loginType: 'passwordLogin',
          captchaVerification: req.captchaVerification,
        }
        const res = await passwordLogin(loginReq)

        setTokenWithExpiry(res.accessToken, res.expiresIn)
        if (res.refreshToken) {
          setRefreshToken(res.refreshToken)
        }

        // Initialize stores with data
        if (res.tenantInfo?.id) {
          tenantStore.setTenantId(res.tenantInfo.id)
          // 立即同步租户信息（含 logoUrl），让侧边栏 Logo 尽早显示
          tenantStore.setTenantInfo({
            id: res.tenantInfo.id,
            tenantName: res.tenantInfo.tenantName || '',
            logoUrl: res.tenantInfo.logoUrl || '',
          })
        }

        applyLoginUserData(res)
        userStore.userInfo.isTenantAdmin = undefined
        resetHasMenuFlag()

        // Critical tasks
        const criticalTasks: Promise<void>[] = []
        criticalTasks.push(userStore.fetchTenantAdminPermission().catch(() => {}))
        await Promise.all(criticalTasks)

        // Async tasks
        if (res.tenantInfo?.id) {
          tenantStore.fetchTenantInfo(res.tenantInfo.id).catch(() => {})
        }
      } finally {
        isLoading.value = false
      }
    }

    const phoneLoginMethod = async (req: { phone: string; captcha: string }) => {
      try {
        isLoading.value = true
        const phoneLoginReq: PhoneLoginRequest = {
          userName: req.phone,
          password: req.captcha,
          loginType: 'smsCaptcha',
        }
        const res = await phoneLogin(phoneLoginReq)
        setTokenWithExpiry(res.accessToken, res.expiresIn)
        if (res.refreshToken) {
          setRefreshToken(res.refreshToken)
        }

        if (res.tenantInfo?.id) {
          tenantStore.setTenantId(res.tenantInfo.id)
          tenantStore.setTenantInfo({
            id: res.tenantInfo.id,
            tenantName: res.tenantInfo.tenantName || '',
            logoUrl: res.tenantInfo.logoUrl || '',
          })
          tenantStore.fetchTenantInfo(res.tenantInfo.id).catch(() => {})
        }
        // Note: Phone login
        // The original code didn't call applyLoginUserData for phone login, only tenant info.
        // Let's stick to original behavior for now, or check if res has user info.
      } finally {
        isLoading.value = false
      }
    }

    /**
     * 邮箱验证码登录
     * 登录后需调用方通过 userStore.getInfo() 获取完整用户信息
     */
    const emailLogin = async (req: { email: string; captcha: string }) => {
      try {
        isLoading.value = true
        const loginReq: LoginRequest = {
          userName: req.email,
          password: req.captcha,
          loginType: 'emailCaptcha',
        }
        const res = await passwordLogin(loginReq)
        setTokenWithExpiry(res.accessToken, res.expiresIn)
        if (res.refreshToken) {
          setRefreshToken(res.refreshToken)
        }
        if (res.tenantInfo?.id) {
          tenantStore.setTenantId(res.tenantInfo.id)
          tenantStore.setTenantInfo({
            id: res.tenantInfo.id,
            tenantName: res.tenantInfo.tenantName || '',
            logoUrl: res.tenantInfo.logoUrl || '',
          })
          tenantStore.fetchTenantInfo(res.tenantInfo.id).catch(() => {})
        }
        applyLoginUserData(res)
      } finally {
        isLoading.value = false
      }
    }

    const studentNoLogin = async (req: StudentLoginReq) => {
      try {
        isLoading.value = true
        resetAuthState()

        const studentLoginReq: StudentLoginRequest = {
          userName: req.studentNo,
          password: req.password,
          loginType: 'studentNoLogin',
          schoolName: req.schoolName,
          captchaVerification: req.captchaVerification,
        }
        const res = await studentLogin(studentLoginReq)

        setTokenWithExpiry(res.accessToken, res.expiresIn)
        if (res.refreshToken) {
          setRefreshToken(res.refreshToken)
        }

        if (res.tenantInfo?.id) {
          tenantStore.setTenantId(res.tenantInfo.id)
          tenantStore.setTenantInfo({
            id: res.tenantInfo.id,
            tenantName: res.tenantInfo.tenantName || '',
            logoUrl: res.tenantInfo.logoUrl || '',
          })
        }

        applyLoginUserData(res)

        await userStore.fetchTenantAdminPermission().catch(() => {})

        if (res.tenantInfo?.id) {
          tenantStore.fetchTenantInfo(res.tenantInfo.id).catch(() => {})
        }
      } finally {
        isLoading.value = false
      }
    }

    const queryStringValue = (value: LocationQuery[string]) => {
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
      if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
        return value[0].trim()
      }
      throw new Error('微信登录失败，请重新发起授权')
    }

    const socialLogin = async (source: string, req: LocationQuery) => {
      if (source.toLowerCase() === 'wechat' || source.toLowerCase() === 'weixin') {
        try {
          isLoading.value = true
          resetAuthState()

          const result = await wechatCallback({
            code: queryStringValue(req.code),
            state: queryStringValue(req.state),
          })

          if (result.status !== 'success' || !result.accessToken) {
            throw new Error(result.errorMessage || result.message || '微信账号尚未绑定平台账号')
          }

          setTokenWithExpiry(result.accessToken)
          if (result.refreshToken) {
            setRefreshToken(result.refreshToken)
          }

          await userStore.getInfo(true)
        } finally {
          isLoading.value = false
        }
        return
      }
      throw new Error('当前登录方式暂不可用，请重新选择')
    }

    const logoutCallBack = async () => {
      try {
        await logout()
      } catch {
        // Silent fail
      }

      role.value = ''
      permissions.value = []
      pwdExpiredShow.value = true

      userStore.clearUserInfo()
      resetToken()
      await clearAllGradingDrafts()

      syncRememberedAccountOnLogout()

      resetRouter()
      tenantStore.resetTenantId()
    }

    const logout = async () => {
      try {
        await logoutCallBack()
        return true
      } catch {
        return false
      }
    }

    const getTokenRefreshStatus = () => {
      const now = Math.floor(Date.now() / 1000)
      return {
        isRefreshing: refreshingToken.value,
        hasRefreshPromise: !!refreshPromise.value,
        hasToken: !!token.value,
        hasRefreshToken: !!refreshTokenState.value,
        tokenExpiresAt: tokenExpiresAt.value,
        timeUntilExpiry: tokenExpiresAt.value ? Math.max(0, tokenExpiresAt.value - now) : 0,
        isTokenExpired: tokenExpiresAt.value ? now >= tokenExpiresAt.value : false,
      }
    }

    const refreshTokenMethod = async (refreshTokenValue: string) => {
      const refreshData = await refreshToken({
        refreshToken: refreshTokenValue,
        deviceId: getDeviceId(),
      })
      if (refreshData && refreshData.accessToken) {
        setTokenWithExpiry(refreshData.accessToken, refreshData.expiresIn)
        if (refreshData.refreshToken) {
          setRefreshToken(refreshData.refreshToken)
        }
      } else {
        throw new Error('登录状态已失效，请重新登录')
      }
      return refreshData
    }

    let visibilityListenerRegistered = false
    let storageListenerRegistered = false

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (!token.value && !refreshTokenState.value) return

      try {
        await checkAndRefreshToken()
      } catch {
        /* 非致命 */
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return
      if (
        event.key !== null &&
        event.key !== STORAGE_TOKEN &&
        event.key !== STORAGE_REFRESH_TOKEN &&
        event.key !== STORAGE_TOKEN_EXPIRES_AT
      ) {
        return
      }
      syncTokenStateFromStorage()
    }

    const runInitializeAuth = async () => {
      syncTokenStateFromStorage()
      const storedTokenExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)

      if (storedTokenExpiresAt) {
        try {
          tokenExpiresAt.value = Number.parseInt(storedTokenExpiresAt)
        } catch {
          localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT)
        }
      }

      if (!visibilityListenerRegistered && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange)
        visibilityListenerRegistered = true
      }

      if (!storageListenerRegistered && typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange)
        storageListenerRegistered = true
      }

      if (token.value && !isTokenExpiredCheck(token.value)) {
        try {
          const tokenClaims = jwtDecode<{ exp: number }>(token.value)
          tokenExpiresAt.value = tokenClaims.exp
          healTokenExpiresAt(token.value, tokenClaims.exp)
          scheduleTokenRefresh(tokenClaims.exp * 1000)
        } catch {
          resetToken()
          return
        }

        try {
          await checkAndRefreshToken()
        } catch {
          // Token 快到期时的预刷新失败不影响启动
        }
        return
      }

      if (refreshTokenState.value) {
        const refreshed = await refreshTokenAutomatically()
        if (!refreshed && !hasValidAccessToken()) {
          resetToken()
        }
      } else if (token.value && isTokenExpiredCheck(token.value)) {
        resetToken()
      }
    }

    const runInitializeAuthOnce = (): Promise<void> => {
      if (!runInitializeAuthPromise) {
        runInitializeAuthPromise = runInitializeAuth().finally(() => {
          runInitializeAuthPromise = null
        })
      }
      return runInitializeAuthPromise
    }

    const initializeAuth = async () => {
      if (initializeAuthPromise) {
        return initializeAuthPromise
      }

      initializeAuthPromise = Promise.race([
        runInitializeAuthOnce(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, AUTH_INITIALIZATION_TIMEOUT_MS)
        }),
      ])

      try {
        await initializeAuthPromise
      } finally {
        initializeAuthPromise = null
      }
    }

    const cleanup = () => {
      const currentToken = token.value
      if (currentToken && isTokenExpiredCheck(currentToken)) {
        // 只清除过期的 access token，保留 refresh token 用于续期
        token.value = ''
        tokenExpiresAt.value = null
        clearToken()
        localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT)
        clearRefreshTimer()
      }
    }

    const destroyAuth = () => {
      clearRefreshTimer()
      refreshPromise.value = null
      refreshOperationPromise = null
      initializeAuthPromise = null
      runInitializeAuthPromise = null
      if (visibilityListenerRegistered && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        visibilityListenerRegistered = false
      }
      if (storageListenerRegistered && typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
        storageListenerRegistered = false
      }
    }

    // Setters for external use if needed (e.g. from userStore if it refreshes data)
    const setRole = (newRole: string) => (role.value = newRole)
    const setPermissions = (newPermissions: string[]) => (permissions.value = newPermissions)

    return {
      token,
      refreshToken: refreshTokenState,
      tokenExpiresAt,
      role,
      permissions,
      pwdExpiredShow,
      isLoading,
      refreshingToken,

      isAuthenticated,
      userRole,
      isAdmin,
      isTeacher,
      isStudent,
      isTokenExpiringSoon,
      isTokenExpired,

      accountLogin,
      phoneLogin: phoneLoginMethod,
      emailLogin,
      studentNoLogin,
      socialLogin,
      logout,
      logoutCallBack,

      resetToken,
      decodeToken,
      isTokenExpiredCheck,
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,

      setTokenWithExpiry,
      setRefreshToken,
      refreshTokenAutomatically,
      checkAndRefreshToken,

      initializeAuth,
      cleanup,
      destroyAuth,

      getTokenRefreshStatus,
      refreshTokenMethod,

      setRole,
      setPermissions,
    }
  },
  {
    persist: {
      // token 只存 localStorage(STORAGE_TOKEN)，避免与 pinia 双写漂移
      pick: ['role', 'permissions', 'pwdExpiredShow'],
      storage: localStorage,
    },
  },
)
