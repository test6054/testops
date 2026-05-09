import type { LocationQuery } from 'vue-router'
import type {
  LoginRequest,
  LoginResponse,
  PhoneLoginRequest,
  StudentLoginRequest,
} from '@/apis/auth'
import type { RefreshTokenResponse } from '@/types/auth'
import { jwtDecode } from 'jwt-decode'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/apis/auth'
import { resetAuthState } from '@/config/axios/auth-state'
import {
  STORAGE_REFRESH_TOKEN,
  STORAGE_REMEMBER_ME,
  STORAGE_REMEMBERED_USERNAME,
  STORAGE_TOKEN,
  STORAGE_TOKEN_EXPIRES_AT,
} from '@/constants/storage-keys'
import { resetRouter } from '@/router'
import { resetHasMenuFlag } from '@/router/guard'
import { RoleEnum } from '@/types/enums'
import { clearToken, getToken, setToken } from '@/utils/auth'
import { getDeviceId } from '@/utils/device'
import { useTenantStore } from './tenant'
import { useUserStore } from './user'

// 类型定义
export interface AccountLoginReq {
  username: string
  password: string
  captchaVerification?: string // AJ-Captcha验证码令牌
  rememberMe?: boolean
}

export interface StudentLoginReq {
  studentNo: string
  password: string
  schoolName: string // 学校名称（后端根据名称查找租户）
  captchaVerification?: string // AJ-Captcha验证码令牌
}

// JWT载荷接口（单角色模式）
interface JWTPayload {
  sub: string // 用户ID
  username: string // 用户名
  role: string // 用户角色（单角色）
  permissions: string[] // 权限列表
  tenantId?: string // 租户ID
  iat: number // 签发时间
  exp: number // 过期时间
  jti: string // JWT ID
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const userStore = useUserStore()
    const tenantStore = useTenantStore()

    const token = ref(getToken() || '')
    const refreshToken = ref<string | null>(localStorage.getItem(STORAGE_REFRESH_TOKEN))
    const tokenExpiresAt = ref<number | null>(null)
    const pwdExpiredShow = ref<boolean>(true)

    // 角色和权限ref（单角色模式）
    const role = ref<string>('') // 单角色
    const permissions = ref<string[]>([])

    // Token自动刷新相关
    const refreshTimer = ref<ReturnType<typeof setTimeout> | null>(null)
    const refreshPromise = ref<Promise<RefreshTokenResponse> | null>(null)
    const refreshingToken = ref(false)

    // 记住我功能相关
    const rememberMe = ref<boolean>(localStorage.getItem(STORAGE_REMEMBER_ME) === 'true')
    const isLoading = ref(false)

    // 认证和权限相关计算属性
    const isAuthenticated = computed(() => {
      if (!token.value) return false
      try {
        const payload = decodeToken(token.value)
        const now = Date.now() / 1000
        return payload.exp > now
      } catch {
        return false
      }
    })

    // 用户角色
    const userRole = computed(() => role.value)

    // 角色检查 - 使用统一枚举
    const isAdmin = computed(() => userRole.value === RoleEnum.SUPER_ADMIN)
    const isTeacher = computed(() =>
      [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER, RoleEnum.SUPER_ADMIN].includes(
        userRole.value as RoleEnum,
      ),
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
    const decodeToken = (tokenStr?: string): JWTPayload => {
      const targetToken = tokenStr || token.value
      if (!targetToken) {
        throw new Error('令牌不存在')
      }
      try {
        return jwtDecode<JWTPayload>(targetToken)
      } catch {
        throw new Error('令牌格式无效')
      }
    }

    const isTokenExpiredCheck = (tokenStr?: string): boolean => {
      try {
        const payload = decodeToken(tokenStr)
        const now = Date.now() / 1000
        return payload.exp <= now
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
      refreshToken.value = null
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
        const payload = decodeToken(newToken)
        token.value = newToken
        setToken(newToken)

        const expireTime = payload.exp * 1000
        tokenExpiresAt.value = payload.exp
        localStorage.setItem(STORAGE_TOKEN_EXPIRES_AT, payload.exp.toString())

        scheduleTokenRefresh(expireTime)
      } catch {
        resetToken()
      }
    }

    const setRefreshToken = (newRefreshToken: string) => {
      refreshToken.value = newRefreshToken
      localStorage.setItem(STORAGE_REFRESH_TOKEN, newRefreshToken)
    }

    const clearRefreshTimer = () => {
      if (refreshTimer.value) {
        clearTimeout(refreshTimer.value)
        refreshTimer.value = null
      }
    }

    const syncTokenStateFromStorage = (): boolean => {
      const storedToken = localStorage.getItem(STORAGE_TOKEN) || ''
      const storedRefreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN)
      const storedTokenExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
      const parsedExpiresAt = storedTokenExpiresAt ? Number.parseInt(storedTokenExpiresAt) : null
      const normalizedExpiresAt
        = parsedExpiresAt !== null && !Number.isNaN(parsedExpiresAt) ? parsedExpiresAt : null

      const hasChanged
        = token.value !== storedToken
          || refreshToken.value !== storedRefreshToken
          || tokenExpiresAt.value !== normalizedExpiresAt

      if (!hasChanged) {
        return false
      }

      token.value = storedToken
      refreshToken.value = storedRefreshToken
      tokenExpiresAt.value = normalizedExpiresAt

      if (storedToken && normalizedExpiresAt) {
        scheduleTokenRefresh(normalizedExpiresAt * 1000)
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
        refreshTimer.value = setTimeout(async () => {
          let retries = 0
          const maxRetries = 3
          while (retries < maxRetries) {
            try {
              const success = await refreshTokenAutomatically()
              if (success) return
            } catch {
              /* 下次重试 */
            }
            retries++
            if (retries < maxRetries) {
              await new Promise((r) => setTimeout(r, retries * 2000))
            }
          }
        }, timeUntilRefresh)
      }
    }

    const isRetryableError = (error: {
      response?: { status: number }
      code?: string
      message?: string
    }): boolean => {
      if (!error.response && error.code !== 'ECONNABORTED') return true
      if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) return true
      if (error.response !== undefined && error.response.status >= 500) return true
      const retryableStatus = [408, 429, 502, 503, 504]
      return !!(error.response?.status && retryableStatus.includes(error.response.status))
    }

    const refreshTokenAutomatically = async (): Promise<boolean> => {
      try {
        if (refreshPromise.value) {
          try {
            await refreshPromise.value
            return true
          } catch {
            return false
          }
        }

        if (refreshingToken.value) {
          let retryCount = 0
          const maxRetries = 30
          while (refreshingToken.value && retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            retryCount++
          }
          return !refreshingToken.value && token.value !== ''
        }

        const syncedFromStorage = syncTokenStateFromStorage()
        if (syncedFromStorage && token.value && !isTokenExpiredCheck(token.value)) {
          return true
        }

        if (!refreshToken.value) return false

        const maxRetries = 3
        let lastError: { code?: string, response?: { status: number } } | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          let attemptedRefreshToken: string | null = null
          try {
            const latestTokenSynced = syncTokenStateFromStorage()
            if (latestTokenSynced && token.value && !isTokenExpiredCheck(token.value)) {
              return true
            }

            attemptedRefreshToken = refreshToken.value
            if (!attemptedRefreshToken) {
              return false
            }

            refreshingToken.value = true
            refreshPromise.value = authApi.refreshToken({ refreshToken: attemptedRefreshToken })
            const refreshData = await refreshPromise.value

            if (!refreshData || !refreshData.accessToken) continue

            setTokenWithExpiry(refreshData.accessToken, refreshData.expiresIn)
            if (refreshData.refreshToken) {
              setRefreshToken(refreshData.refreshToken)
            }
            return true
          } catch (error: unknown) {
            const err = error as { response?: { status: number }, code?: string, message?: string }
            lastError = err

            const syncedFromOtherContext = syncTokenStateFromStorage()
            if (syncedFromOtherContext && token.value && !isTokenExpiredCheck(token.value)) {
              return true
            }

            if (
              attemptedRefreshToken
              && refreshToken.value
              && refreshToken.value !== attemptedRefreshToken
            ) {
              continue
            }

            const shouldRetry = attempt < maxRetries && isRetryableError(err)
            if (shouldRetry) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
            } else {
              break
            }
          }
        }

        if (
          lastError?.code === 'NETWORK_ERROR'
          || (lastError?.response !== undefined && lastError.response.status >= 500)
        ) {
          return false
        }

        await logoutCallBack()
        return false
      } finally {
        refreshingToken.value = false
        refreshPromise.value = null
      }
    }

    const checkAndRefreshToken = async (): Promise<boolean> => {
      if (!token.value) return false
      try {
        const payload = decodeToken(token.value)
        const now = Date.now() / 1000
        if (payload.exp <= now) return await refreshTokenAutomatically()
        const timeUntilExpiry = payload.exp - now
        if (timeUntilExpiry <= 300 && !refreshingToken.value) {
          return await refreshTokenAutomatically()
        }
        return true
      } catch {
        return await refreshTokenAutomatically()
      }
    }

    const applyLoginUserData = (res: LoginResponse['data']) => {
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

        if (req.rememberMe) {
          rememberMe.value = true
          localStorage.setItem(STORAGE_REMEMBER_ME, 'true')
        } else {
          rememberMe.value = false
          localStorage.setItem(STORAGE_REMEMBER_ME, 'false')
        }

        const loginReq: LoginRequest = {
          userName: req.username,
          password: req.password,
          loginType: 'passwordLogin',
          rememberMe: req.rememberMe || false,
          captchaVerification: req.captchaVerification,
        }
        const res = await authApi.passwordLogin(loginReq)

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

    const phoneLoginMethod = async (req: { phone: string, captcha: string }) => {
      try {
        isLoading.value = true
        const phoneLoginReq: PhoneLoginRequest = {
          userName: req.phone,
          password: req.captcha,
          loginType: 'smsCaptcha',
        }
        const res = await authApi.phoneLogin(phoneLoginReq)
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
    const emailLogin = async (req: { email: string, captcha: string }) => {
      try {
        isLoading.value = true
        const loginReq: LoginRequest = {
          userName: req.email,
          password: req.captcha,
          loginType: 'emailCaptcha',
        }
        const res = await authApi.passwordLogin(loginReq)
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
        const res = await authApi.studentLogin(studentLoginReq)

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

    const socialLogin = async (source: string, _req: LocationQuery) => {
      void _req
      if (source.toLowerCase() === 'wechat' || source.toLowerCase() === 'weixin') {
        throw new Error('微信登录回调处理功能待实现')
      } else {
        throw new Error(`只支持微信登录，不支持: ${source}`)
      }
    }

    const logoutCallBack = async () => {
      try {
        await authApi.logout()
      } catch {
        // Silent fail
      }

      role.value = ''
      permissions.value = []
      pwdExpiredShow.value = true

      userStore.clearUserInfo()
      resetToken()

      if (!rememberMe.value) {
        localStorage.removeItem(STORAGE_REMEMBERED_USERNAME)
        localStorage.removeItem(STORAGE_REMEMBER_ME)
      }

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
        hasRefreshToken: !!refreshToken.value,
        tokenExpiresAt: tokenExpiresAt.value,
        timeUntilExpiry: tokenExpiresAt.value ? Math.max(0, tokenExpiresAt.value - now) : 0,
        isTokenExpired: tokenExpiresAt.value ? now >= tokenExpiresAt.value : false,
      }
    }

    const refreshTokenMethod = async (refreshTokenValue: string) => {
      const refreshData = await authApi.refreshToken({
        refreshToken: refreshTokenValue,
        deviceId: getDeviceId(),
      })
      if (refreshData && refreshData.accessToken) {
        setTokenWithExpiry(refreshData.accessToken, refreshData.expiresIn)
        if (refreshData.refreshToken) {
          setRefreshToken(refreshData.refreshToken)
        }
      } else {
        throw new Error('Token刷新响应数据无效')
      }
      return refreshData
    }

    let visibilityListenerRegistered = false
    let storageListenerRegistered = false

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (!token.value && !refreshToken.value) return

      try {
        await checkAndRefreshToken()
      } catch {
        /* 非致命 */
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return
      if (
        event.key !== null
        && event.key !== STORAGE_TOKEN
        && event.key !== STORAGE_REFRESH_TOKEN
        && event.key !== STORAGE_TOKEN_EXPIRES_AT
      ) {
        return
      }
      syncTokenStateFromStorage()
    }

    const initializeAuth = async () => {
      const storedTokenExpiresAt = localStorage.getItem(STORAGE_TOKEN_EXPIRES_AT)
      const storedRememberMe = localStorage.getItem(STORAGE_REMEMBER_ME)

      if (storedTokenExpiresAt) {
        try {
          tokenExpiresAt.value = Number.parseInt(storedTokenExpiresAt)
        } catch {
          localStorage.removeItem(STORAGE_TOKEN_EXPIRES_AT)
        }
      }

      if (storedRememberMe) {
        rememberMe.value = storedRememberMe === 'true'
      }

      // 注册 visibilitychange 监听（仅一次）
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
          const payload = decodeToken(token.value)
          scheduleTokenRefresh(payload.exp * 1000)
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

      // access token 不存在或已过期，尝试用 refresh token 续期
      if (refreshToken.value) {
        const refreshed = await refreshTokenAutomatically()
        if (!refreshed) {
          resetToken()
        }
      } else {
        // 无 refresh token，彻底清除
        if (token.value) {
          resetToken()
        }
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
      refreshToken,
      tokenExpiresAt,
      role,
      permissions,
      pwdExpiredShow,
      isLoading,
      refreshingToken,
      rememberMe,

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
      pick: ['token', 'role', 'permissions', 'pwdExpiredShow'],
      storage: localStorage,
    },
  },
)
