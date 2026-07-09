/**
 * Axios服务实例
 * 提供统一的HTTP请求服务，包含认证、错误处理、重试等核心功能
 */

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ExtendedAxiosRequestConfig, InterceptorError } from './types'
import message from 'ant-design-vue/es/message'
import axios from 'axios'
import { shouldShowError, shouldUseNotification } from '@/config/error-config'
import { AUTH_STORAGE_KEYS, STORAGE_REFRESH_TOKEN, STORAGE_TENANT_ID } from '@/constants/storage-keys'
import { useAuthStore } from '@/stores/modules/auth'
import { useTenantStore } from '@/stores/modules/tenant'
import { useUserStore } from '@/stores/modules/user'
import { isLoginPath, resolveAppPath } from '@/utils/app-path'
import { getToken, getValidToken } from '@/utils/auth'
import { getDeviceHeaders } from '@/utils/device'
import { handleAxiosError } from '@/utils/error-handler'
import {
  clearKioskAuthSession,
  ensureScannerStationTeacherJwt,
  getKioskTenantId,
  hasMarkScannerKioskAuth,
  isMarkScannerStationApiUrl,
  isScannerKioskBrowserPage,
  KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE,
  KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE,
  recoverKioskBrowserSessionFromAgent,
  redirectToKioskHub,
  resolveMarkScannerStationAuthHeaders
} from '@/utils/kiosk-auth'
import { getTraceHeaders } from '@/utils/trace'
import { authRuntimeState } from './auth-state'
import { AUTH_FAILURE_BUSINESS_CODES, AUTH_FAILURE_STATUS, BUSINESS_CODE, config } from './config'


/**
 * 创建axios实例
 */
const service: AxiosInstance = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  withCredentials: false,
})

type RuntimeAxiosRequestConfig = InternalAxiosRequestConfig & ExtendedAxiosRequestConfig

function runtimeRequestConfig(requestConfig: InternalAxiosRequestConfig): RuntimeAxiosRequestConfig {
  return requestConfig
}

function markInterceptorHandled(error: InterceptorError): void {
  error._handledByInterceptor = true
}

/** 一体机未激活时，扫描工位 API 的失败属于预期状态，不弹全局「网络异常」。 */
function shouldSuppressKioskPreActivationAxiosError(
  error: AxiosError<ResultInfo<unknown>>,
): boolean {
  if (!isScannerKioskBrowserPage() || hasMarkScannerKioskAuth()) {
    return false
  }
  const url = error.config?.url || ''
  if (isMarkScannerStationApiUrl(url)) {
    return true
  }
  return !error.response
}

/**
 * 获取租户ID：优先 localStorage，回退 pinia 缓存并回写
 */
function getTenantId(): string | null {
  const storedTenantId = localStorage.getItem(STORAGE_TENANT_ID)
  if (storedTenantId) {
    return storedTenantId
  }

  try {
    const tenantStore = useTenantStore()
    if (tenantStore.tenantId) {
      localStorage.setItem(STORAGE_TENANT_ID, tenantStore.tenantId)
      return tenantStore.tenantId
    }

    const userStore = useUserStore()
    if (userStore.userInfo.tenantId) {
      localStorage.setItem(STORAGE_TENANT_ID, userStore.userInfo.tenantId)
      return userStore.userInfo.tenantId
    }
  } catch {
    return null
  }

  return null
}

/**
 * 获取请求中显式传入的租户ID
 */
function getExplicitTenantId(requestConfig: InternalAxiosRequestConfig): string | null {
  const tenantHeader = requestConfig.headers?.['X-Tenant-Id']
  if (typeof tenantHeader !== 'string') {
    return null
  }
  const normalizedTenantId = tenantHeader.trim()
  return normalizedTenantId || null
}

// 基于 AbortController 的请求取消机制
const pendingRequests = new Map<string, AbortController>()

/**
 * 生成请求唯一标识
 */
function generateRequestKey(config: InternalAxiosRequestConfig): string {
  const { method, url } = config
  return `${method}:${url}`
}

/**
 * 注册待处理请求的 AbortController
 */
function addPendingRequest(config: InternalAxiosRequestConfig): void {
  const key = generateRequestKey(config)
  if (!config.signal) {
    const controller = new AbortController()
    config.signal = controller.signal
    pendingRequests.set(key, controller)
  }
}

/**
 * 移除已完成的请求记录
 */
function removePendingRequest(config: InternalAxiosRequestConfig): void {
  const key = generateRequestKey(config)
  pendingRequests.delete(key)
}

/**
 * 取消所有正在进行的请求
 */
function cancelAllPendingRequests(): void {
  pendingRequests.forEach((controller) => {
    controller.abort()
  })
  pendingRequests.clear()
}

service.interceptors.request.use(
  async (requestConfig: InternalAxiosRequestConfig) => {
    const extendedConfig = runtimeRequestConfig(requestConfig)

    const url = requestConfig.url || ''
    const onKioskPage = isScannerKioskBrowserPage()
    const isAuthRequest = url.includes('/login') || url.includes('/oauth2/refresh') || url.includes('/oauth2/token')
    const isScannerStationApi = isMarkScannerStationApiUrl(url)
    // 公开接口白名单：不需要认证的API
    const isPublicApi = url.includes('/public/')
      || url.includes('/api/auth/tenant-list') // 租户列表（学号登录学校选择器）
      || url.includes('/api/auth/tenant-by-code') // 租户编码查询（网关子域名解析）
      || url.includes('/api/auth/tenants-by-student-no') // 学号查询租户（学号登录学校选择）
      || url.includes('/captcha/') // 验证码
      || isScannerStationApi

    // 如果认证已失败，拒绝所有非登录相关和非公开的请求
    if (authRuntimeState.authFailed && !extendedConfig.skipAuth) {
      if (!isAuthRequest && !isPublicApi) {
        const message = onKioskPage
          ? '扫描工位凭证已失效，请重新激活'
          : '认证失败，请重新登录'
        return Promise.reject(new Error(message))
      }
    }

    // 移除了重复请求检测逻辑

    // 确保headers对象存在
    if (!requestConfig.headers) {
      requestConfig.headers = new axios.AxiosHeaders()
    }

    // 扫描工位 API：一体机走 push_token，教师 Web 扫描看板可走 JWT。
    if (!extendedConfig.skipAuth && isScannerStationApi) {
      if (!onKioskPage) {
        await ensureScannerStationTeacherJwt()
      }
      const scannerStationAuth = resolveMarkScannerStationAuthHeaders()
      extendedConfig.markScannerStationAuthSource = scannerStationAuth.source || undefined
      if (!scannerStationAuth.headers.Authorization) {
        const authError: InterceptorError = new Error(
          onKioskPage
            ? '扫描工位缺少鉴权，请先完成一体机 Agent 激活'
            : '扫描工位缺少鉴权，请先登录或完成一体机 Agent 激活',
        )
        authError._handledByInterceptor = onKioskPage
        return Promise.reject(authError)
      }
      requestConfig.headers.Authorization = scannerStationAuth.headers.Authorization
      const scannerTenantId = getExplicitTenantId(requestConfig)
        || scannerStationAuth.headers['X-Tenant-Id']
        || (onKioskPage ? getKioskTenantId() : null)
        || getTenantId()
      if (!scannerTenantId) {
        const tenantError = onKioskPage
          ? '缺少租户信息，请重新完成一体机激活'
          : '缺少租户信息，请重新登录后重试'
        return Promise.reject(new Error(tenantError))
      }
      requestConfig.headers['X-Tenant-Id'] = scannerTenantId
    } else if (!extendedConfig.skipAuth && !isAuthRequest && !isPublicApi && onKioskPage) {
      const authError: InterceptorError = new Error('一体机页面不支持该接口，请使用扫描工位能力')
      authError._handledByInterceptor = true
      return Promise.reject(authError)
    } else if (!extendedConfig.skipAuth && !isScannerStationApi) {
      // 教师 Web 链路：JWT + refresh
      if (authRuntimeState.authFailed && !isAuthRequest && !isPublicApi) {
        return Promise.reject(new Error('认证已失败，请重新登录'))
      }

      let token = getValidToken()

      if (!token && !isAuthRequest && !isPublicApi) {
        try {
          const authStore = useAuthStore()
          await authStore.refreshTokenAutomatically()
          token = getValidToken()
        } catch {
          // 刷新失败，继续后续逻辑
        }
      }

      if (!token) {
        token = getValidToken()
      }

      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`
      } else if (!isAuthRequest && !isPublicApi) {
        const authStore = useAuthStore()
        if (authStore.refreshingToken) {
          return Promise.reject(new Error('认证刷新中，请稍后重试'))
        }
        const hasSessionRecoveryHint = !!getToken() || !!localStorage.getItem(STORAGE_REFRESH_TOKEN)
        if (!hasSessionRecoveryHint && !authRuntimeState.isRedirecting) {
          clearAuthAndRedirect()
          return Promise.reject(new Error('无有效认证信息，正在跳转登录页'))
        }
        return Promise.reject(new Error('登录状态恢复中，请稍后重试'))
      }
    }

    // 添加租户ID
    // 登录/公共接口不强制携带，其他接口缺失则重定向到登录页
    if (!isAuthRequest && !isPublicApi) {
      const tenantId = getExplicitTenantId(requestConfig)
        || (onKioskPage ? getKioskTenantId() : null)
        || getTenantId()
      if (!tenantId) {
        const tenantError = onKioskPage
          ? '缺少租户信息，请重新完成一体机激活'
          : '缺少租户信息，请重新登录后重试'
        return Promise.reject(new Error(tenantError))
      }
      requestConfig.headers['X-Tenant-Id'] = tenantId
    } else if (!isScannerStationApi && requestConfig.headers['X-Tenant-Id']) {
      delete requestConfig.headers['X-Tenant-Id']
    }

    // 添加请求时间戳
    const now = Date.now();
    requestConfig.headers['X-Request-Time'] = now.toString();
    Object.assign(requestConfig.headers, getTraceHeaders())

    // [START] 多点登录限制：添加设备ID和客户端类型请求头
    const deviceHeaders = getDeviceHeaders()
    Object.assign(requestConfig.headers, deviceHeaders)

    // 注册请求的 AbortController，用于认证失败时批量取消
    addPendingRequest(requestConfig)

    return requestConfig
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  },
)

let isRefreshingByInterceptor = false
let failedRequestsQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  config: InternalAxiosRequestConfig
}> = []

function processFailedQueue(success: boolean): void {
  failedRequestsQueue.forEach(({ resolve, reject, config }) => {
    if (success) {
      resolve(service(config))
    } else {
      reject(new Error('登录状态已失效，请重新登录'))
    }
  })
  failedRequestsQueue = []
}

/**
 * 一体机 push_token 失效时先从本机 Agent 同步并重试一次，避免 SSE/401 误清激活态。
 */
async function retryKioskRequestAfterAgentSync(
  requestConfig: InternalAxiosRequestConfig,
): Promise<AxiosResponse<ResultInfo<unknown>> | null> {
  const extended = runtimeRequestConfig(requestConfig)
  if (extended.kioskAuthRetried || !isScannerKioskBrowserPage()) {
    return null
  }
  extended.kioskAuthRetried = true
  const recovered = await recoverKioskBrowserSessionFromAgent()
  if (!recovered) {
    return null
  }
  const auth = resolveMarkScannerStationAuthHeaders()
  if (!auth.headers.Authorization) {
    return null
  }
  requestConfig.headers = requestConfig.headers ?? {}
  requestConfig.headers.Authorization = auth.headers.Authorization
  if (auth.headers['X-Tenant-Id']) {
    requestConfig.headers['X-Tenant-Id'] = auth.headers['X-Tenant-Id']
  }
  extended.markScannerStationAuthSource = auth.source ?? undefined
  return service(requestConfig)
}

service.interceptors.response.use(
  (response: AxiosResponse<ResultInfo<unknown>>) => {
    // 清理已完成请求的记录
    removePendingRequest(response.config)

    // 处理304 Not Modified状态码
    if (response.status === 304) {
      return Promise.reject(new Error('服务响应异常，请稍后重试'))
    }

    // 如果是blob响应（文件下载），直接返回，不进行JSON解析
    if (response.config.responseType === 'blob') {
      return response
    }

    // 处理空响应体的情况（如logout返回204或200但无内容）
    if (!response.data || typeof response.data !== 'object') {
      return Promise.reject(new Error('服务响应异常，请稍后重试'))
    }

    // 特殊处理：退出登录接口 (logout)
    const isLogoutRequest = response.config?.url?.includes('/logout')
    if (isLogoutRequest && response.status === 200) {
      if (!response.data.code || response.data.code !== config.successCode) {
        return Promise.reject(new Error('退出登录失败，请稍后重试'))
      }
    }

    // AJ-Captcha 返回 ResponseModel（repCode/repMsg/repData），不是 ResultInfo
    const requestUrl = response.config?.url || ''
    const isAjCaptchaResponse
      = (requestUrl.includes('/captcha/get') || requestUrl.includes('/captcha/check'))
        && typeof response.data === 'object'
        && response.data !== null
        && 'repCode' in response.data
    if (isAjCaptchaResponse) {
      return response
    }

    // 检查业务响应码
    if (response.data && response.data.code !== config.successCode) {
      // 检查是否是认证失败的业务错误码
      if (AUTH_FAILURE_BUSINESS_CODES.includes(response.data.code)) {
        const url = response.config?.url || ''
        const isAuthRequest = url.includes('/login') || url.includes('/oauth2/refresh') || url.includes('/oauth2/token')
        const isScannerStationApi = isMarkScannerStationApiUrl(url)
        const scannerStationAuthSource = runtimeRequestConfig(response.config).markScannerStationAuthSource

        if (isAuthRequest) {
          const authError: InterceptorError = new Error(response.data.msg || '认证失败')
          authError.code = response.data.code
          authError.response = response
          authError._handledByInterceptor = true
          return Promise.reject(authError)
        }

        if (isScannerKioskBrowserPage() || (isScannerStationApi && scannerStationAuthSource === 'kiosk')) {
          return retryKioskRequestAfterAgentSync(response.config).then((retried) => {
            if (retried) {
              return retried
            }
            if (isScannerKioskBrowserPage() && hasMarkScannerKioskAuth()) {
              const kioskAuthError: InterceptorError = new Error(
                response.data.msg || KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE,
              )
              kioskAuthError.code = response.data.code
              kioskAuthError.response = response
              kioskAuthError._handledByInterceptor = true
              return Promise.reject(kioskAuthError)
            }
            clearKioskAuthSession()
            const kioskAuthError: InterceptorError = new Error(
              response.data.msg || KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE,
            )
            kioskAuthError.code = response.data.code
            kioskAuthError.response = response
            kioskAuthError._handledByInterceptor = true
            return Promise.reject(kioskAuthError)
          })
        }

        // TOKEN_KICKED 特殊处理：被踢出不可恢复，直接清除
        if (response.data.code === BUSINESS_CODE.TOKEN_KICKED) {
          message.warning({
            content: response.data.msg || '您的账号已在其他设备登录，当前会话已失效',
            duration: 3,
          })
          clearAuthAndRedirect()
          const authError: InterceptorError = new Error(response.data.msg || '认证失败')
          authError.code = response.data.code
          authError.response = response
          return Promise.reject(authError)
        }

        clearAuthAndRedirect()

        const authError: InterceptorError = new Error(response.data.msg || '认证失败')
        authError.code = response.data.code
        authError.response = response
        authError._handledByInterceptor = true
        return Promise.reject(authError)
      }

      // 创建业务错误对象
      const businessError: InterceptorError = new Error(response.data.msg || '业务处理失败')
      const businessCode = response.data.code
      businessError.code = businessCode
      businessError.response = response

      const extendedConfig = runtimeRequestConfig(response.config)
      const skipErrorHandler = extendedConfig.skipErrorHandler === true
      const suppressErrorMessage = extendedConfig.showErrorMessage === false
      if (!skipErrorHandler && !suppressErrorMessage) {
        handleAxiosError(businessError, {
          showMessage: shouldShowError(businessCode),
          useNotification: shouldUseNotification(businessCode, false),
        })
      }
      businessError._handledByInterceptor = true

      return Promise.reject(businessError)
    }

    return response
  },
  async (error: AxiosError<ResultInfo<unknown>>) => {
    if (error.config) {
      removePendingRequest(error.config)
    }

    const response = error.response
    const statusCode = response?.status

    // 处理 HTTP 401: 尝试用 refresh token 自动续期
    if (statusCode && response && error.config && AUTH_FAILURE_STATUS.includes(statusCode)) {
      const originalConfig = error.config
      const url = originalConfig?.url || ''
      const isAuthRequest = url.includes('/login') || url.includes('/oauth2/refresh') || url.includes('/oauth2/token')
      const isLogoutRequest = url.includes('/logout')
      const isPublicApi = url.includes('/public/')
      const isScannerStationApi = isMarkScannerStationApiUrl(url)
      const scannerStationAuthSource = runtimeRequestConfig(originalConfig).markScannerStationAuthSource

      if (isAuthRequest || isLogoutRequest || isPublicApi) {
        const backendMsg = response?.data?.msg
        if (backendMsg) {
          const authError: InterceptorError = new Error(backendMsg)
          authError.code = response?.data?.code || statusCode
          authError.response = response
          markInterceptorHandled(authError)
          return Promise.reject(authError)
        }
        const interceptorError: InterceptorError = error
        markInterceptorHandled(interceptorError)
        return Promise.reject(error)
      }

      if (isScannerKioskBrowserPage() || (isScannerStationApi && scannerStationAuthSource === 'kiosk')) {
        return retryKioskRequestAfterAgentSync(originalConfig).then((retried) => {
          if (retried) {
            return retried
          }
          if (isScannerKioskBrowserPage() && hasMarkScannerKioskAuth()) {
            const kioskAuthError: InterceptorError = new Error(KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE)
            kioskAuthError.code = response?.data?.code || statusCode
            kioskAuthError.response = response
            markInterceptorHandled(kioskAuthError)
            return Promise.reject(kioskAuthError)
          }
          clearKioskAuthSession()
          const kioskAuthError: InterceptorError = new Error(KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE)
          kioskAuthError.code = response?.data?.code || statusCode
          kioskAuthError.response = response
          markInterceptorHandled(kioskAuthError)
          return Promise.reject(kioskAuthError)
        })
      }

      // TOKEN_KICKED(4007) 不可恢复，直接登出
      const bodyCode = response?.data?.code
      if (bodyCode === BUSINESS_CODE.TOKEN_KICKED) {
        message.warning({
          content: response?.data?.msg || '您的账号已在其他设备登录，当前会话已失效',
          duration: 3,
        })
        clearAuthAndRedirect()
        return Promise.reject(error)
      }

      // 一体机页面不走教师 JWT 刷新链
      if (isScannerKioskBrowserPage()) {
        if (!authRuntimeState.authFailed) {
          authRuntimeState.authFailed = true
          handleKioskAuthSessionLost()
        }
        return Promise.reject(error)
      }

      // 尝试用 refresh token 自动续期
      const authStore = useAuthStore()
      if (authStore.refreshToken || authStore.refreshingToken) {
        // 如果已经在刷新，把请求加入队列等待
        if (isRefreshingByInterceptor) {
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({ resolve, reject, config: originalConfig })
          })
        }

        isRefreshingByInterceptor = true

        try {
          const refreshed = await authStore.refreshTokenAutomatically()
          if (refreshed) {
            // 刷新成功，更新原请求的 Authorization 头并重试
            const newToken = getValidToken()
            if (newToken && originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${newToken}`
            }
            processFailedQueue(true)
            return service(originalConfig)
          }
        } catch {
          processFailedQueue(false)
        } finally {
          isRefreshingByInterceptor = false
        }
      }

      const recoveredToken = getValidToken()
      if (recoveredToken) {
        if (originalConfig.headers) {
          originalConfig.headers.Authorization = `Bearer ${recoveredToken}`
        }
        return service(originalConfig)
      }

      // refresh token 不存在或刷新失败，清除认证并跳转
      if (!authRuntimeState.authFailed) {
        authRuntimeState.authFailed = true
        clearAuthAndRedirect()
      }
      return Promise.reject(error)
    }

    // 统一处理其他错误（网络错误、系统错误等）
    if (!authRuntimeState.authFailed) {
      const errorStatusCode = response?.status || 0
      const isNetworkError = !response

      if (isNetworkError || errorStatusCode >= 500) {
        if (!shouldSuppressKioskPreActivationAxiosError(error)) {
          handleAxiosError(error, {
            showMessage: shouldShowError(errorStatusCode),
            useNotification: shouldUseNotification(errorStatusCode, isNetworkError)
          });
        }
        const interceptorError: InterceptorError = error
        markInterceptorHandled(interceptorError)
      }
    }

    return Promise.reject(error)
  },
)


/**
 * 一体机鉴权失效：清 push_token 并回 Hub，禁止跳转教师登录页。
 */
function handleKioskAuthSessionLost(): void {
  if (authRuntimeState.isRedirecting) {
    return
  }
  authRuntimeState.isRedirecting = true
  cancelAllPendingRequests()
  clearKioskAuthSession()
  authRuntimeState.authFailed = false
  setTimeout(() => {
    authRuntimeState.isRedirecting = false
    redirectToKioskHub()
  }, 100)
}

/**
 * 清除认证信息并跳转登录页
 */
function clearAuthAndRedirect(): void {
  if (isScannerKioskBrowserPage()) {
    handleKioskAuthSessionLost()
    return
  }

  if (getValidToken()) {
    authRuntimeState.authFailed = false
    authRuntimeState.isRedirecting = false
    return
  }

  // 防止重复重定向
  if (authRuntimeState.isRedirecting) {
    return
  }

  authRuntimeState.isRedirecting = true

  // 超时保护：确保 isRedirecting 标记在一定时间后重置，防止页面跳转失败导致永久阻塞
  if (authRuntimeState.redirectTimeoutTimer) {
    clearTimeout(authRuntimeState.redirectTimeoutTimer)
  }
  authRuntimeState.redirectTimeoutTimer = setTimeout(() => {
    authRuntimeState.isRedirecting = false
    authRuntimeState.authFailed = false
    authRuntimeState.redirectTimeoutTimer = null
  }, 5000)

  // 取消所有正在进行的请求
  cancelAllPendingRequests()

  // 清除所有认证相关的本地存储
  AUTH_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch {
      // 清理失败不影响主流程
    }
  })

  // 通知用户store清理状态
  try {
    const authStore = useAuthStore()
    authStore.resetToken()
  } catch {
    // store状态清理失败不影响重定向
  }

  // 跳转到登录页，保留当前路径用于登录后重定向
  const loginPath = resolveAppPath('login')
  const currentPath = window.location.pathname + window.location.search
  const redirectPath = !isLoginPath(window.location.pathname) ? `?redirect=${encodeURIComponent(currentPath)}` : ''

  // 延迟一小段时间，确保所有请求都被取消
  setTimeout(() => {
    window.location.href = `${loginPath}${redirectPath}`
  }, 100)
}

export default service
