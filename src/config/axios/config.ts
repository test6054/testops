/**
 * Axios配置文件
 * 集中管理所有HTTP请求相关配置
 */

export type ContentType
  = | 'application/json'
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data'

/**
 * HTTP状态码映射
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const

/**
 * 业务响应码
 */
export const BUSINESS_CODE = {
    SUCCESS: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    VALIDATION_ERROR: 400,
    BUSINESS_ERROR: 500,
    AI_QUOTA_EXCEEDED: 4003, // AI配额不足
    TOKEN_KICKED: 4007, // 多点登录被踢出
} as const

/**
 * 需要重新登录的状态码
 * 只包括真正的认证失败（401未认证）
 * 注意：403是权限不足，不是认证失败，不应退出登录
 */
export const AUTH_FAILURE_STATUS: number[] = [
    HTTP_STATUS.UNAUTHORIZED, // 401 - 未授权/认证失效
]

/**
 * 需要重新登录的业务错误码
 *
 * 当前包含：
 * - 401 (UNAUTHORIZED)：access token 失效或未携带
 * - 4007 (TOKEN_KICKED)：同账号在其他设备登录被踢出，必须重新登录
 *
 * 注意：403 是权限不足（PERMISSION_DENIED），不是认证失败，不应退出登录。
 */
export const AUTH_FAILURE_BUSINESS_CODES: number[] = [
    BUSINESS_CODE.UNAUTHORIZED, // 401
    BUSINESS_CODE.TOKEN_KICKED, // 4007 - 多点登录被踢出
]


/**
 * 主配置对象
 */
export const config = {
    /**
     * API请求基础路径
     * 开发环境: 使用Vite代理，直接使用相对路径
     * 生产环境: 使用相对路径，通过Nginx代理转发
     */
    baseURL: '',

    /**
     * 请求超时时间(毫秒)
     * 10秒超时，超过这个时间基本可以判断为网络或服务问题
     */
    timeout: 30000,

    /**
     * 默认Content-Type
     */
    defaultContentType: 'application/json' as ContentType,

    /**
     * 成功响应码
     */
    successCode: BUSINESS_CODE.SUCCESS,

    /**
     * 是否启用请求/响应日志
     */
    enableLogging: true,

} as const
