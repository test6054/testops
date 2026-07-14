/**
 * 全局错误处理配置
 * 统一管理项目中的错误处理行为
 */

import { ErrorHandler } from '@/utils/error-handler'

/**
 * 错误处理配置选项
 */
export interface GlobalErrorConfig {
  /** 是否启用全局错误处理 */
  enabled: boolean
  /** 默认是否显示错误消息 */
  showMessage: boolean
  /** 是否使用通知形式显示错误 */
  useNotificationForErrors: boolean
  /** 网络错误是否使用通知 */
  useNotificationForNetwork: boolean
  /** 是否在控制台记录详细错误日志 */
  enableConsoleLog: boolean
  /** 特定错误码的处理配置 */
  specificErrorConfig: Record<number, {
    showMessage?: boolean
    useNotification?: boolean
    customMessage?: string
  }>
}

/**
 * 默认错误处理配置
 */
export const DEFAULT_ERROR_CONFIG: GlobalErrorConfig = {
  enabled: true,
  showMessage: true,
  useNotificationForErrors: false,
  useNotificationForNetwork: false,
  enableConsoleLog: true,
  specificErrorConfig: {
    // 认证失败 - 不显示提示（会自动跳转登录页）
    401: {
      showMessage: false
    },
    // 权限不足 - 显示后端返回的具体提示（不退出登录）
    403: {
      showMessage: true,
      useNotification: false,
    },
    405: {
      showMessage: false
    },

    // AI配额错误 - 使用通知
    4003: {
      showMessage: true,
      useNotification: false,
      customMessage: 'AI额度不足'
    },

    4290: {
      showMessage: true,
      useNotification: false,
      customMessage: 'AI额度不足'
    },

    // 网络超时 - 使用通知
    408: {
      showMessage: true,
      useNotification: false,
      customMessage: '网络异常'
    },

    // 服务器错误 - 必须中文占位，禁止空失败
    500: {
      showMessage: true,
      useNotification: false,
      customMessage: '系统繁忙'
    },

    // 网关错误
    502: {
      showMessage: true,
      useNotification: false,
      customMessage: '系统繁忙'
    },

    // 服务不可用
    503: {
      showMessage: true,
      useNotification: false,
      customMessage: '系统繁忙'
    },

    // 网关超时
    504: {
      showMessage: true,
      useNotification: false,
      customMessage: '网络异常'
    }
  }
}

/**
 * 当前错误配置
 */
let currentConfig: GlobalErrorConfig = { ...DEFAULT_ERROR_CONFIG }

/**
 * 初始化全局错误处理
 */
export function initGlobalErrorHandler(config?: Partial<GlobalErrorConfig>) {
  // 合并配置
  if (config) {
    currentConfig = {
      ...currentConfig,
      ...config,
      specificErrorConfig: {
        ...currentConfig.specificErrorConfig,
        ...config.specificErrorConfig
      }
    }
  }

  // 设置ErrorHandler的默认配置
  ErrorHandler.setDefaultConfig({
    showMessage: currentConfig.showMessage,
    useNotification: currentConfig.useNotificationForErrors,
    silent: !currentConfig.enabled
  })
}
/**
 * 获取特定错误码的配置
 */
export function getErrorCodeConfig(code: number) {
  return currentConfig.specificErrorConfig[code] || {}
}

/**
 * 是否应该显示错误消息
 */
export function shouldShowError(code: number): boolean {
  const specificConfig = getErrorCodeConfig(code)
  return specificConfig.showMessage !== undefined
    ? specificConfig.showMessage
    : currentConfig.showMessage
}

/**
 * 是否应该使用通知显示错误
 */
export function shouldUseNotification(code: number, isNetworkError: boolean = false): boolean {
  const specificConfig = getErrorCodeConfig(code)

  if (specificConfig.useNotification !== undefined) {
    return specificConfig.useNotification
  }

  if (isNetworkError) {
    return currentConfig.useNotificationForNetwork
  }

  return currentConfig.useNotificationForErrors
}

/**
 * 获取自定义错误消息
 */
export function getCustomErrorMessage(code: number): string | undefined {
  return getErrorCodeConfig(code).customMessage
}

/**
 * 检查是否应该静默处理特定错误消息
 * 某些错误虽然返回错误状态码，但实际上是业务逻辑的正常情况，不应该显示错误提示
 */
export function shouldSilenceErrorMessage(_code: number, _message: string): boolean {
  // 当前无需静默的错误
  return false
}

/**
 * 开发环境的错误配置（显示更多详细信息）
 */
export const DEV_ERROR_CONFIG: Partial<GlobalErrorConfig> = {
  enableConsoleLog: true,
  showMessage: true,
  useNotificationForErrors: false,
  useNotificationForNetwork: true
}

/**
 * 生产环境的错误配置（用户友好的错误提示）
 */
export const PROD_ERROR_CONFIG: Partial<GlobalErrorConfig> = {
  enableConsoleLog: false,
  showMessage: true,
  useNotificationForErrors: true,
  useNotificationForNetwork: true
}
