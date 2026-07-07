/**
 * 统一错误处理工具
 * 提供一致的错误提示和处理逻辑
 */

import CloseCircleOutlined from '@ant-design/icons-vue/CloseCircleOutlined'
import CloudOutlined from '@ant-design/icons-vue/CloudOutlined'
import LockOutlined from '@ant-design/icons-vue/LockOutlined'
import QuestionCircleOutlined from '@ant-design/icons-vue/QuestionCircleOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import StopOutlined from '@ant-design/icons-vue/StopOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import { h } from 'vue'
import {
  getCustomErrorMessage,
  shouldShowError,
  shouldSilenceErrorMessage,
  shouldUseNotification
} from '@/config/error-config'
import { message, notification } from '@/utils/feedback'

/**
 * 可处理的错误类型
 * 覆盖 AxiosError、拦截器扩展错误、普通 Error
 */
export interface HandledError {
  message?: string
  code?: number | string
  response?: {
    status: number
    data?: {
      code?: number
      msg?: string
      message?: string
    }
  }
  _handledByInterceptor?: boolean
}

/**
 * 错误处理配置
 */
interface ErrorHandlerConfig {
  /** 是否显示错误提示 */
  showMessage?: boolean
  /** 是否显示在通知中（否则显示在Message中） */
  useNotification?: boolean
  /** 自定义错误标题 */
  title?: string
  /** 自定义错误消息 */
  customMessage?: string
  /** 是否静默处理（不显示任何提示） */
  silent?: boolean
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK', // 网络错误
  AUTH = 'AUTH', // 认证错误
  PERMISSION = 'PERMISSION', // 权限错误
  VALIDATION = 'VALIDATION', // 验证错误
  BUSINESS = 'BUSINESS', // 业务错误
  AI_QUOTA = 'AI_QUOTA', // AI配额错误
  SYSTEM = 'SYSTEM', // 系统错误
  UNKNOWN = 'UNKNOWN' // 无响应体或无业务码时的协议/网络异常
}

/**
 * 标准错误信息
 */
export interface StandardError {
  type: ErrorType
  code: number | string
  message: string
  detail?: string
  timestamp: number
}

/**
 * 错误码到错误类型的映射
 */
const ERROR_CODE_TYPE_MAP: Record<number, ErrorType> = {
  // HTTP状态码
  401: ErrorType.AUTH,
  403: ErrorType.PERMISSION,
  404: ErrorType.SYSTEM,
  405: ErrorType.AUTH,
  408: ErrorType.NETWORK,
  429: ErrorType.SYSTEM,
  500: ErrorType.SYSTEM,
  502: ErrorType.NETWORK,
  503: ErrorType.SYSTEM,
  504: ErrorType.NETWORK,

  // 业务错误码
  400: ErrorType.VALIDATION,
  4003: ErrorType.AI_QUOTA,
  4290: ErrorType.AI_QUOTA,
}

/**
 * 默认错误消息
 */
const DEFAULT_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接异常，请检查网络后重试',
  [ErrorType.AUTH]: '认证失败，请重新登录',
  [ErrorType.PERMISSION]: '权限不足，请联系管理员',
  [ErrorType.VALIDATION]: '请求参数有误，请检查后重试',
  [ErrorType.BUSINESS]: '业务处理失败',
  [ErrorType.AI_QUOTA]: 'AI资源不足，请联系老师',
  [ErrorType.SYSTEM]: '系统繁忙，请稍后重试',
  [ErrorType.UNKNOWN]: '操作未完成，请稍后重试或联系管理员'
}

/**
 * 错误消息标题
 * 与 ERROR_TYPE_ICONS 配合使用，作为通知/Message 的标题文案
 */
const ERROR_TYPE_TITLES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络异常',
  [ErrorType.AUTH]: '认证失败',
  [ErrorType.PERMISSION]: '权限不足',
  [ErrorType.VALIDATION]: '参数有误',
  [ErrorType.BUSINESS]: '业务异常',
  [ErrorType.AI_QUOTA]: 'AI 资源不足',
  [ErrorType.SYSTEM]: '系统繁忙',
  [ErrorType.UNKNOWN]: '操作失败'
}

/**
 * 错误类型图标组件
 * 使用 Ant Design Icons 保持与全站图标体系一致，避免跨 OS 渲染差异
 */
const ERROR_TYPE_ICONS: Record<ErrorType, ReturnType<typeof h>> = {
  [ErrorType.NETWORK]: h(CloudOutlined, { style: 'color: #f59e0b' }),
  [ErrorType.AUTH]: h(LockOutlined, { style: 'color: #2563eb' }),
  [ErrorType.PERMISSION]: h(StopOutlined, { style: 'color: #ef4444' }),
  [ErrorType.VALIDATION]: h(WarningOutlined, { style: 'color: #f59e0b' }),
  [ErrorType.BUSINESS]: h(CloseCircleOutlined, { style: 'color: #ef4444' }),
  [ErrorType.AI_QUOTA]: h(RobotOutlined, { style: 'color: #7c3aed' }),
  [ErrorType.SYSTEM]: h(SettingOutlined, { style: 'color: #ef4444' }),
  [ErrorType.UNKNOWN]: h(QuestionCircleOutlined, { style: 'color: #64748b' })
}

/**
 * 解析错误类型
 */
function parseErrorType(error: HandledError): ErrorType {
  // 网络错误
  if (!error.response) {
    return ErrorType.NETWORK
  }

  const statusCode = error.response?.status
  const businessCode = error.code ?? error.response?.data?.code

  // 优先使用业务错误码：凡后端返回 ResultCodeEnum 均按 BUSINESS 展示后端 msg
  if (businessCode != null) {
    const numCode = Number(businessCode)
    if (!Number.isNaN(numCode)) {
      return ERROR_CODE_TYPE_MAP[numCode] ?? ErrorType.BUSINESS
    }
  }

  // 使用 HTTP 状态码
  if (statusCode != null && ERROR_CODE_TYPE_MAP[statusCode]) {
    return ERROR_CODE_TYPE_MAP[statusCode]
  }

  return ErrorType.UNKNOWN
}

/**
 * 获取错误消息
 */
function getErrorMessage(error: HandledError, errorType: ErrorType): string {
  const statusCode = error.response?.status
  const backendMessage = error.response?.data?.msg
    ?? error.response?.data?.message

  // 对于系统级错误（5xx），优先使用友好的中文消息
  if (statusCode != null && statusCode >= 500) {
    return DEFAULT_ERROR_MESSAGES[errorType]
  }

  // 1. 使用后端返回的具体消息（仅对业务错误）
  if (backendMessage && statusCode != null && statusCode < 500) {
    return backendMessage
  }

  // 2. 对于网络错误，使用友好消息
  if (!error.response || error.message?.includes('Network Error')) {
    return DEFAULT_ERROR_MESSAGES[ErrorType.NETWORK]
  }

  // 3. 使用默认消息
  return DEFAULT_ERROR_MESSAGES[errorType]
}

function getResponseMessage(error: unknown): string | undefined {
  if (error == null || typeof error !== 'object') return undefined
  const directMsg = readProperty(error, 'msg')
  if (typeof directMsg === 'string' && directMsg.trim()) return directMsg

  const response = readProperty(error, 'response')
  if (response == null || typeof response !== 'object') return undefined
  const data = readProperty(response, 'data')
  if (data == null || typeof data !== 'object') return undefined
  const backendMsg = readProperty(data, 'msg') ?? readProperty(data, 'message')
  return typeof backendMsg === 'string' && backendMsg.trim() ? backendMsg : undefined
}

function readProperty(source: object, key: string): unknown {
  return Object.getOwnPropertyDescriptor(source, key)?.value
}

/**
 * 读取后端 ResultInfo.code（ResultCodeEnum 数值）。
 * 有响应体时必须返回已定义业务码；无响应体时返回 undefined。
 */
export function readBusinessResultCode(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object') {
    return undefined
  }
  const directCode = readProperty(error, 'code')
  if (typeof directCode === 'number' && Number.isFinite(directCode)) {
    return directCode
  }
  if (typeof directCode === 'string' && directCode.trim()) {
    const parsed = Number(directCode)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  const response = readProperty(error, 'response')
  if (response == null || typeof response !== 'object') {
    return undefined
  }
  const data = readProperty(response, 'data')
  if (data == null || typeof data !== 'object') {
    return undefined
  }
  const code = readProperty(data, 'code')
  if (typeof code === 'number' && Number.isFinite(code)) {
    return code
  }
  if (typeof code === 'string' && code.trim()) {
    const parsed = Number(code)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

/**
 * 提取用户可见错误文案。
 * 仅使用后端业务消息或调用方提供的 fallback，不展示前端 Error.message。
 */
export function getUserErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  const backendMessage = getResponseMessage(error)
  if (backendMessage) {
    return backendMessage
  }

  return fallback
}

/**
 * 将协议边界捕获到的异常收敛为页面错误态可直接持有的 Error。
 */
export function toUserError(error: unknown, fallback = '操作失败，请稍后重试'): Error {
  return new Error(getUserErrorMessage(error, fallback))
}

/**
 * 提取异步任务、导出任务、AI 分析记录中的用户可见处理说明。
 * 这类字段是持久化失败原因，默认比普通接口业务错误更保守，避免把堆栈、字段名、路径或接口合同诊断展示给用户。
 */
export function getUserProcessFailureMessage(
  _messageText: string | undefined | null,
  fallback = '处理未完成，请稍后重试或联系管理员',
): string {
  return fallback
}

/**
 * 显示用户可见错误提示。
 * 已由 Axios 拦截器提示过的错误不重复弹出。
 */
export function showUserError(error: unknown, fallback = '操作失败，请稍后重试') {
  if (isErrorHandled(error)) return
  message.error(getUserErrorMessage(error, fallback))
}

/**
 * 格式化错误码显示。
 * 不向用户显示错误码，只依赖后端返回的业务消息。
 */
function formatErrorCode(_error: HandledError): string {
  // 用户体验优化：错误码对普通用户没有意义，只显示后端返回的业务消息
  return ''
}

/**
 * 将 unknown 类型的 catch 错误安全转为 HandledError
 */
function toHandledError(error: unknown): HandledError {
  if (error instanceof Error) {
    const extended = error as HandledError
    return {
      message: error.message,
      code: extended.code,
      response: extended.response,
      _handledByInterceptor: extended._handledByInterceptor,
    }
  }
  if (error != null && typeof error === 'object') {
    const code = readProperty(error, 'code')
    const response = readProperty(error, 'response')
    const handledByInterceptor = readProperty(error, '_handledByInterceptor')
    return {
      message: readMessage(error),
      code: typeof code === 'number' || typeof code === 'string' ? code : undefined,
      response: isHandledErrorResponse(response) ? response : undefined,
      _handledByInterceptor: handledByInterceptor === true,
    }
  }
  if (typeof error === 'string') return { message: '操作未完成，请稍后重试' }
  return { message: '操作未完成，请稍后重试' }
}

function readMessage(error: object): string {
  const message = readProperty(error, 'message')
  return typeof message === 'string' && message.trim() ? message : '操作未完成，请稍后重试'
}

function isHandledErrorResponse(value: unknown): value is HandledError['response'] {
  return typeof value === 'object' && value !== null
}

function resolveErrorCode(error: HandledError): number | string {
  const code = error.code ?? error.response?.data?.code ?? error.response?.status ?? error.message
  return code == null || code === '' ? ErrorType.UNKNOWN : code
}

/**
 * 标准化错误对象
 */
export function standardizeError(error: unknown): StandardError {
  const handled = toHandledError(error)
  const errorType = parseErrorType(handled)
  const message = getErrorMessage(handled, errorType)
  const code = resolveErrorCode(handled)

  return {
    type: errorType,
    code,
    message,
    detail: formatErrorCode(handled),
    timestamp: Date.now()
  }
}

/**
 * 显示错误提示
 */
export function showErrorMessage(standardError: StandardError, config: ErrorHandlerConfig = {}) {
  const errorCode = typeof standardError.code === 'number' ? standardError.code : 0
  const isNetworkError = standardError.type === ErrorType.NETWORK

  // 检查是否应该静默处理特定错误消息（业务逻辑的正常情况）
  if (shouldSilenceErrorMessage(errorCode, standardError.message)) {
    return
  }

  const {
    showMessage = shouldShowError(errorCode),
    useNotification = shouldUseNotification(errorCode, isNetworkError),
    title,
    customMessage = getCustomErrorMessage(errorCode),
    silent = false
  } = config

  if (silent || !showMessage) {
    return
  }

  const iconVNode = ERROR_TYPE_ICONS[standardError.type]
  const displayMessage = customMessage || standardError.message
  const displayTitle = title || ERROR_TYPE_TITLES[standardError.type]

  if (useNotification) {
    // 如果有详细信息，将其附加到内容中
    const notificationContent = standardError.detail
      ? `${displayMessage}\n${standardError.detail}`
      : displayMessage

    notification.error({
      message: displayTitle,
      description: notificationContent,
      icon: () => iconVNode,
      duration: 5,
      placement: 'topRight',
    })
  } else {
    const content = standardError.detail
      ? `${displayMessage}\n${standardError.detail}`
      : displayMessage

    message.error({
      content,
      icon: () => iconVNode,
      duration: 4,
    })
  }
}

/**
 * 统一错误处理函数
 */
export function handleError(error: unknown, config: ErrorHandlerConfig = {}): StandardError {
  const handled = toHandledError(error)
  // 检查错误是否已被拦截器处理
  if (handled._handledByInterceptor) {
    // 已被拦截器处理的错误，静默返回，不打印日志和提示
    return standardizeError(handled)
  }

  // 标准化错误
  const standardError = standardizeError(handled)

  // 显示错误提示
  showErrorMessage(standardError, config)

  return standardError
}

/**
 * 处理Axios错误的专用函数
 */
export function handleAxiosError(error: unknown, config: ErrorHandlerConfig = {}): StandardError {
  return handleError(error, config)
}
/**
 * 检查错误是否已被处理
 */
export function isErrorHandled(error: unknown): boolean {
  const handled = toHandledError(error)
  return Boolean(handled._handledByInterceptor)
}

/**
 * 智能错误处理 - 检查是否已被拦截器处理
 * 如果已被处理则跳过，否则显示错误
 */
export function handleErrorSmart(error: unknown, config: ErrorHandlerConfig = {}): StandardError {
  // 如果错误已被拦截器处理，直接返回标准化错误，不再重复显示消息
  if (isErrorHandled(error)) {
    return standardizeError(error)
  }

  // 错误未被处理，显示错误消息
  return handleError(error, { ...config, showMessage: config.showMessage ?? true })
}

/**
 * 从 unknown 类型的错误中安全提取消息文本
 * 用于 catch (error) 块中替代 error.message 的直接访问
 */
export function getErrMsg(error: unknown, fallback = '操作失败'): string {
  return getUserErrorMessage(error, fallback)
}

/**
 * 错误处理工具类
 */
export class ErrorHandler {
  private static defaultConfig: ErrorHandlerConfig = {
    showMessage: true,
    useNotification: false,
    silent: false
  }

  /**
   * 设置默认配置
   */
  static setDefaultConfig(config: Partial<ErrorHandlerConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }

  /**
   * 智能处理错误（推荐使用）
   * 自动检查是否已被拦截器处理，避免重复显示
   */
  static handle(error: unknown, config?: ErrorHandlerConfig): StandardError {
    const finalConfig = { ...this.defaultConfig, ...config }
    return handleErrorSmart(error, finalConfig)
  }

  /**
   * 强制处理错误（忽略拦截器处理状态）
   */
  static forceHandle(error: unknown, config?: ErrorHandlerConfig): StandardError {
    const finalConfig = { ...this.defaultConfig, ...config, showMessage: true }
    return handleError(error, finalConfig)
  }

  /**
   * 静默处理错误（只记录日志，不显示提示）
   */
  static silent(error: unknown): StandardError {
    return standardizeError(error)
  }

  /**
   * 使用通知显示错误（如果未被处理）
   */
  static notify(error: unknown, title?: string): StandardError {
    return handleErrorSmart(error, { useNotification: true, title })
  }

  /**
   * 检查错误是否已被拦截器处理
   */
  static isHandled(error: unknown): boolean {
    return isErrorHandled(error)
  }
}

/** 503 / 网络抖动等临时失败，不应触发登出 */
export function isTransientRequestError(error: unknown): boolean {
  const err = toHandledError(error)
  const status = err?.response?.status
  if (status === 401) {
    return false
  }
  return !err?.response
    || err.code === 'ERR_NETWORK'
    || err.code === 'ECONNABORTED'
    || (typeof status === 'number' && (status >= 500 || status === 429))
}

/** 用户信息拉取失败且会话不可恢复时才应登出 */
export function isAuthRequestFailure(error: unknown): boolean {
  const err = toHandledError(error)
  const status = err?.response?.status
  const businessCode = err?.response?.data?.code ?? err?.code
  return status === 401 || businessCode === 401;
}
