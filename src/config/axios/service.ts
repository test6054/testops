/**
 * Axios服务实例
 * 提供统一的HTTP请求服务，包含认证、错误处理、重试等核心功能
 */

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ExtendedAxiosRequestConfig, InterceptorError } from './types'
import message from 'ant-design-vue/es/message'
import axios from 'axios'
import { shouldShowError, shouldUseNotification } from '@/config/error-config'
import { AUTH_STORAGE_KEYS, STORAGE_TENANT_ID } from '@/constants/storage-keys'
import { useAuthStore } from '@/stores/modules/auth'
import { isLoginPath, resolveAppPath } from '@/utils/app-path'
import { getValidToken } from '@/utils/auth'
import { getDeviceHeaders } from '@/utils/device'
import { handleAxiosError } from '@/utils/error-handler'
import {
  buildMarkScannerStationAuthHeaders,
  clearKioskAuthSession,
  hasMarkScannerJwtAuth,
  isMarkScannerStationApiUrl,
  KIOSK_BROWSER_SESSION_LOST_MESSAGE
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

/**
 * 获取租户ID
 */
function getTenantId(): string | null {
  return localStorage.getItem(STORAGE_TENANT_ID)
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
    const extendedConfig = requestConfig as ExtendedAxiosRequestConfig

    const url = requestConfig.url || ''
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
        return Promise.reject(new Error('认证失败，请重新登录'))
      }
    }

    // 移除了重复请求检测逻辑

    // 确保headers对象存在
    if (!requestConfig.headers) {
      requestConfig.headers = new axios.AxiosHeaders()
    }

    // 添加认证token（除非明确跳过）
    if (!extendedConfig.skipAuth && !isScannerStationApi) {
      // 如果认证已失败，只允许登录相关请求和公开API
      if (authRuntimeState.authFailed && !isAuthRequest && !isPublicApi) {
        return Promise.reject(new Error('认证已失败，请重新登录'))
      }

      let token = getValidToken()

      // token 过期但可能有 refresh token，尝试自动刷新
      if (!token && !isAuthRequest && !isPublicApi) {
        try {
          const authStore = useAuthStore()
          if (authStore.refreshToken) {
            const refreshed = await authStore.refreshTokenAutomatically()
            if (refreshed) {
              token = getValidToken()
            }
          }
        } catch {
          // 刷新失败，继续后续逻辑
        }
      }

      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`
      } else {
        // 对于登录请求和公开API，允许无token通过
        if (!isAuthRequest && !isPublicApi) {
          if (!authRuntimeState.isRedirecting) {
            authRuntimeState.isRedirecting = true
            authRuntimeState.authFailed = true
            cancelAllPendingRequests()
            AUTH_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
            window.location.href = resolveAppPath('login')
          }
          return Promise.reject(new Error('无有效认证信息，正在跳转登录页'))
        }
      }
    }

    // 扫描工位链路（kiosk + scan-live）使用 JWT 或 Agent push_token，不走教师登录跳转。
    if (isScannerStationApi) {
      const scannerStationAuthHeaders = buildMarkScannerStationAuthHeaders()
      if (!scannerStationAuthHeaders.Authorization) {
        return Promise.reject(new Error('扫描工位缺少鉴权，请先登录或完成一体机 Agent 激活'))
      }
      requestConfig.headers.Authorization = scannerStationAuthHeaders.Authorization
      if (scannerStationAuthHeaders['X-Tenant-Id']) {
        requestConfig.headers['X-Tenant-Id'] = scannerStationAuthHeaders['X-Tenant-Id']
      }
    }

    // 添加租户ID
    // 登录/公共接口不强制携带，其他接口缺失则重定向到登录页
    if (!isAuthRequest && !isPublicApi) {
      const tenantId = getExplicitTenantId(requestConfig) || getTenantId()
      if (!tenantId) {
        // 缺少租户信息，清除认证状态并重定向到登录页
        if (!authRuntimeState.isRedirecting) {
          authRuntimeState.isRedirecting = true
          authRuntimeState.authFailed = true
          cancelAllPendingRequests()
          AUTH_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
          window.location.href = resolveAppPath('login')
        }
        return Promise.reject(new Error('缺少租户信息，正在跳转登录页'))
      }
      requestConfig.headers['X-Tenant-Id'] = tenantId
    } else if (requestConfig.headers['X-Tenant-Id']) {
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
    if (!response.data || (response.data as unknown) === '' || typeof response.data !== 'object') {
      return Promise.reject(new Error('服务响应异常，请稍后重试'))
    }

    // 特殊处理：退出登录接口 (logout)
    const isLogoutRequest = response.config?.url?.includes('/logout')
    if (isLogoutRequest && response.status === 200) {
      if (!response.data.code || response.data.code !== config.successCode) {
        return Promise.reject(new Error('退出登录失败，请稍后重试'))
      }
    }

    // 检查业务响应码
    if (response.data && response.data.code !== config.successCode) {
      // 检查是否是认证失败的业务错误码
      if (AUTH_FAILURE_BUSINESS_CODES.includes(response.data.code)) {
        const url = response.config?.url || ''
        const isAuthRequest = url.includes('/login') || url.includes('/oauth2/refresh') || url.includes('/oauth2/token')
        const isScannerStationApi = isMarkScannerStationApiUrl(url)

        if (isAuthRequest) {
          const authError: InterceptorError = new Error(response.data.msg || '认证失败')
          authError.code = response.data.code
          authError.response = response
          authError._handledByInterceptor = true
          return Promise.reject(authError)
        }

        if (isScannerStationApi && !hasMarkScannerJwtAuth()) {
          clearKioskAuthSession()
          const kioskAuthError: InterceptorError = new Error(
            response.data.msg || KIOSK_BROWSER_SESSION_LOST_MESSAGE,
          )
          kioskAuthError.code = response.data.code
          kioskAuthError.response = response
          kioskAuthError._handledByInterceptor = true
          return Promise.reject(kioskAuthError)
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
        return Promise.reject(authError)
      }

      // 创建业务错误对象
      const businessError: InterceptorError = new Error(response.data.msg || '业务处理失败')
      const businessCode = response.data.code
      businessError.code = businessCode
      businessError.response = response

      handleAxiosError(businessError, {
        showMessage: shouldShowError(businessCode),
        useNotification: shouldUseNotification(businessCode, false),
      })
      businessError._handledByInterceptor = true

      return Promise.reject(businessError)
    }

    return response
  },
  async (error: AxiosError<ResultInfo<unknown>>) => {
    if (error.config) {
      removePendingRequest(error.config as InternalAxiosRequestConfig)
    }

    const response = error.response
    const statusCode = response?.status

    // 处理 HTTP 401: 尝试用 refresh token 自动续期
    if (statusCode && AUTH_FAILURE_STATUS.includes(statusCode)) {
      const originalConfig = error.config as InternalAxiosRequestConfig
      const url = originalConfig?.url || ''
      const isAuthRequest = url.includes('/login') || url.includes('/oauth2/refresh') || url.includes('/oauth2/token')
      const isLogoutRequest = url.includes('/logout')
      const isPublicApi = url.includes('/public/')
      const isScannerStationApi = isMarkScannerStationApiUrl(url)

      if (isAuthRequest || isLogoutRequest || isPublicApi) {
        const backendMsg = response?.data?.msg
        if (backendMsg) {
          const authError: InterceptorError = new Error(backendMsg)
          authError.code = response?.data?.code || statusCode
          authError.response = response as AxiosResponse<ResultInfo<unknown>>
          authError._handledByInterceptor = true
          return Promise.reject(authError)
        }
        ;(error as InterceptorError)._handledByInterceptor = true
        return Promise.reject(error)
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

      if (isScannerStationApi && !hasMarkScannerJwtAuth()) {
        clearKioskAuthSession()
        const kioskAuthError: InterceptorError = new Error(KIOSK_BROWSER_SESSION_LOST_MESSAGE)
        kioskAuthError.code = response?.data?.code || statusCode
        kioskAuthError.response = response as AxiosResponse<ResultInfo<unknown>>
        kioskAuthError._handledByInterceptor = true
        return Promise.reject(kioskAuthError)
      }

      // 尝试用 refresh token 自动续期
      const authStore = useAuthStore()
      if (authStore.refreshToken) {
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
        handleAxiosError(error, {
          showMessage: shouldShowError(errorStatusCode),
          useNotification: shouldUseNotification(errorStatusCode, isNetworkError)
        });
        (error as InterceptorError)._handledByInterceptor = true
      }
    }

    return Promise.reject(error)
  },
)


/**
 * 清除认证信息并跳转登录页
 */
function clearAuthAndRedirect(): void {
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
