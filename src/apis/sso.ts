/**
 * SSO单点登录相关API
 * 对接后端 edu-user 模块的 CAS 3.0 单点登录接口
 *
 * 流程说明：
 * 1. 调用 getSsoConfig 获取租户的 SSO 配置
 * 2. 如果启用 CAS，调用 getCasLoginUrl 获取 CAS 登录重定向地址
 * 3. 用户在 CAS 服务器完成认证后，回调到登录页
 * 4. 从 URL 提取 ticket，调用 casCallback 完成登录
 */

import type { LoginResponse } from '@/apis/auth'
import http from '@/config/axios'


/**
 * SSO配置响应
 * 注意：字段名与后端 SsoConfigController 返回保持一致
 */
export interface SsoConfigResponse {
  /** 是否启用CAS单点登录（后端字段名: enabled） */
  casEnabled: boolean
  /** SSO类型（CAS/SAML等） */
  type?: string
  /** CAS显示名称（如"统一认证"） */
  casDisplayName?: string
  /** CAS登录端点 */
  casLoginEndpoint?: string
}

/**
 * CAS登录URL响应
 */
export interface CasLoginUrlResponse {
  /** CAS登录重定向地址 */
  loginUrl: string
}

/**
 * CAS 首次补录预填信息
 */
export interface CasFirstLoginPrefillResponse {
  /** 昵称 */
  nickName?: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  mobile?: string
  /** 学号 */
  studentNumber?: string
  /** 工号 */
  teacherNumber?: string
  /** 院系 */
  department?: string
  /** 职称 */
  title?: string
  /** 班级ID */
  classId?: string
}

/**
 * CAS 首次补录上下文
 */
export interface CasProfileCompletionResponse {
  /** 处理状态 */
  status: 'PROFILE_COMPLETION_REQUIRED'
  /** 锁定角色 */
  lockedRoleKey: string
  /** 补录令牌 */
  completionToken: string
  /** 缺失字段 */
  missingFields: string[]
  /** 预填信息 */
  prefillData?: CasFirstLoginPrefillResponse
}

/**
 * CAS 可选班级
 */
export interface CasAvailableClassResponse {
  /** 班级ID */
  id: string
  /** 班级名称 */
  className: string
  /** 专业 */
  major?: string
}

/**
 * CAS 首次补录提交请求
 */
export interface CasFirstLoginSubmitRequest {
  /** 补录令牌 */
  completionToken: string
  /** 学号 */
  studentNumber?: string
  /** 工号 */
  teacherNumber?: string
  /** 班级ID */
  classId?: string
  /** 院系 */
  department?: string
  /** 职称 */
  title?: string
}

/**
 * CAS 回调响应
 */
export type CasCallbackResponse = LoginResponse['data'] | CasProfileCompletionResponse

interface CasProfileCompletionStatusCarrier {
  status?: unknown
}

function hasProfileCompletionStatus(
  response: unknown,
): response is { status: 'PROFILE_COMPLETION_REQUIRED' } {
  if (typeof response !== 'object' || response === null) {
    return false
  }
  return (response as CasProfileCompletionStatusCarrier).status === 'PROFILE_COMPLETION_REQUIRED'
}

/**
 * 判断是否为首次补录分支响应
 */
export function isCasProfileCompletionResponse(
  response: CasCallbackResponse,
): response is CasProfileCompletionResponse {
  return hasProfileCompletionStatus(response)
}
/** 后端SSO配置原始响应 */
interface SsoConfigRawResponse {
  enabled?: boolean
  type?: string
  casDisplayName?: string
  casLoginEndpoint?: string
}


/**
 * 获取租户的SSO配置
 * 用于判断当前租户是否启用CAS单点登录
 *
 * @param tenantId 租户ID（后端必填）
 */
export function getSsoConfig(tenantId: string): Promise<SsoConfigResponse> {
  return http.get<SsoConfigRawResponse>('/api/auth/sso-config', { params: { tenantId } }).then((res) => {
    // 后端返回 { enabled, type, casLoginEndpoint }，转换为前端期望格式
    return {
      casEnabled: res.enabled ?? false,
      type: res.type,
      casDisplayName: res.casDisplayName || '统一认证',
      casLoginEndpoint: res.casLoginEndpoint
    }
  })
}


/**
 * 获取CAS登录重定向URL
 * 调用后前端需要使用 window.location.href 跳转到返回的URL
 *
 * @param tenantId 租户ID
 */
export function getCasLoginUrl(tenantId: string): Promise<string> {
  return http.get<string | CasLoginUrlResponse>('/api/sso/cas/login', {
    params: { tenantId }
  }).then((res) => {
    // 后端返回 { loginUrl, service }，提取 loginUrl
    if (typeof res === 'string') return res
    return res.loginUrl || ''
  })
}

/**
 * CAS回调处理 - 验证票据并完成登录
 * CAS服务器重定向回来后，从URL中提取ticket，调用此接口完成登录
 *
 * @param ticket CAS服务票据
 * @param tenantId 租户ID
 * @returns 登录响应，包含 accessToken、userInfo 等
 */
export function casCallback(ticket: string, tenantId: string): Promise<CasCallbackResponse> {
  return http.post('/api/sso/cas/callback', { ticket, tenantId })
}

/**
 * 获取首次补录上下文
 *
 * @param completionToken 补录令牌
 */
export function getCasFirstLoginContext(
  completionToken: string,
): Promise<CasProfileCompletionResponse> {
  return http.get('/api/sso/cas/first-login/context', {
    params: { completionToken },
  })
}

/**
 * 获取首次补录可选班级列表
 *
 * @param completionToken 补录令牌
 */
export function getCasAvailableClasses(
  completionToken: string,
): Promise<CasAvailableClassResponse[]> {
  return http.get('/api/sso/cas/first-login/classes', {
    params: { completionToken },
  })
}

/**
 * 提交首次补录信息
 *
 * @param data 补录请求
 */
export function completeCasFirstLogin(
  data: CasFirstLoginSubmitRequest,
): Promise<LoginResponse['data']> {
  return http.post('/api/sso/cas/complete-first-login', data)
}
