/**
 * HTTP客户端封装
 * 提供类型安全的API调用接口，严格遵循项目约定：只使用GET和POST方法
 *
 * 重要说明：
 * - 所有API方法（get、post等）都会自动解包后端返回的ResultInfo格式
 * - 返回的是ResultInfo.data中的实际业务数据，而不是完整的ResultInfo对象
 * - 错误处理通过axios拦截器统一处理，业务代码只需处理成功的数据
 */

import type { BlobDownloadResponse, ExtendedAxiosRequestConfig, RequestOptions } from './types'
import { normalizePageResultPayload } from '@/utils/page-result'
import { config } from './config'
import service from './service'

/**
 * 内部基础请求函数
 *
 * 行为：
 * - 调用 axios `service`；service 的响应拦截器已经做过 `code !== successCode` 失败判断，
 *   失败情况会直接 reject；走到这里说明 code 校验通过。
 * - 返回的是后端 ResultInfo 整包（包含 code / message / data）；
 *   `http.get / http.post / http.upload` 会进一步 `.data` 解包，业务侧只看到 TResponse。
 *
 * 注意：这里不要直接给业务侧使用；业务侧只应通过 http.get / http.post 等门面方法。
 */
async function request<TResponse, TData = unknown, TParams = unknown>(
    options: RequestOptions<TData, TParams>,
): Promise<TResponse> {
    const {url, method = 'GET', data, params, headers, responseType, config: requestConfig} = options

    const axiosConfig: ExtendedAxiosRequestConfig = {
        url,
        method,
        data,
        params,
        headers: {
            'Content-Type': config.defaultContentType,
            ...headers,
        },
        responseType,
        ...requestConfig,
    }

    const response = await service<ResultInfo<TResponse>>(axiosConfig)
    return normalizePageResultPayload(response.data.data)
}

/**
 * HTTP客户端
 * 严格遵循项目约定：禁止使用PUT、DELETE等方法，统一使用POST处理数据修改和删除操作
 */
const http = {
    /**
     * GET请求 - 用于数据查询
     * @returns 直接返回业务数据（已从ResultInfo中解包）
     */
    async get<TResponse>(
        url: string,
        config?: ExtendedAxiosRequestConfig,
    ): Promise<TResponse> {
        return await request<TResponse, never, Record<string, unknown>>({
            url,
            method: 'GET',
            params: config?.params,
            config,
        })
    },

    /**
     * POST请求 - 用于数据创建、修改、删除等所有写操作
     * @returns 直接返回业务数据（已从ResultInfo中解包）
     */
    async post<TResponse, TData = unknown>(
        url: string,
        data?: TData,
        config?: ExtendedAxiosRequestConfig,
    ): Promise<TResponse> {
        return await request<TResponse, TData>({
            url,
            method: 'POST',
            data,
            config,
        })
    },

    /**
     * 文件下载 - GET方式
     * 返回完整的响应对象，包含headers信息用于文件名解析
     */
  async download(
      url: string,
      params?: Record<string, string | string[] | undefined>,
      config?: ExtendedAxiosRequestConfig,
  ): Promise<BlobDownloadResponse> {
    return await service({
        url,
        method: 'GET',
        params,
        responseType: 'blob',
        ...config,
      })
  },
    async downloadByPost(
        url: string,
        data?: object,
        config?: ExtendedAxiosRequestConfig,
    ): Promise<BlobDownloadResponse> {
      return await service({
        url,
        method: 'POST',
        data,
        responseType: 'blob',
        ...config,
      })
    },
  /**
   * 文件上传
   */
    async upload<TResponse>(
        url: string,
        formData: FormData,
        config?: ExtendedAxiosRequestConfig,
    ): Promise<TResponse> {
        return await request<TResponse, FormData>({
            url,
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            config,
        })
    },
}

export default http
