/**
 * Axios相关类型定义
 * 提供核心类型安全支持
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios'


/**
 * 扩展的请求配置
 */
export interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  /** 是否跳过认证 */
  skipAuth?: boolean
  /** 是否跳过错误处理 */
  skipErrorHandler?: boolean
  /** 是否显示加载状态 */
  showLoading?: boolean
  /** 加载提示文本 */
  loadingText?: string
  /** 是否显示错误提示 */
  showErrorMessage?: boolean
  /** 自定义错误提示 */
  errorMessage?: string
  /** 是否显示成功提示 */
  showSuccessMessage?: boolean
  /** 成功提示文本 */
  successMessage?: string
}

/**
 * HTTP方法类型
 */
export type HttpMethod = 'GET' | 'POST'

/**
 * 请求选项接口
 */
/**
 * Blob下载响应类型
 * 用于文件下载接口（http.download / http.downloadByPost）返回的原始 axios 响应
 */
export type BlobDownloadResponse = AxiosResponse<Blob>

/**
 * 带扩展属性的业务错误
 * 用于拦截器中附加 code / response / _handledByInterceptor 等字段
 */
export interface InterceptorError extends Error {
  code?: number | string
  response?: AxiosResponse<ResultInfo<unknown>>
  _handledByInterceptor?: boolean
}

/**
 * 请求选项接口
 */
export interface RequestOptions<TData = unknown, TParams = unknown> {
  /** 请求URL */
  url: string
  /** 请求方法 */
  method?: HttpMethod
  /** 请求数据 */
  data?: TData
  /** 查询参数 */
  params?: TParams
  /** 请求头 */
  headers?: Record<string, string>
  /** 响应类型 */
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'text'
  /** 扩展配置 */
  config?: Partial<ExtendedAxiosRequestConfig>
}
