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

import type { UserLoginResponseDto } from '@/types/auth'
import type { RoleEnum } from '@/types/enums'
import http from '@/config/axios'


/**
 * SSO配置响应 — 与后端 AuthSsoConfigVO 逐字段一致
 */
export interface AuthSsoConfigVO {
  /** 是否已开通且可发起统一认证跳转 */
  enabled: boolean
  /** SSO类型（CAS/SAML等） */
  type?: string
  /** CAS显示名称（如"统一认证"） */
  casDisplayName?: string
  /** CAS登录引导端点路径 */
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
  lockedRoleKey: RoleEnum
  /** 补录令牌 */
  completionToken: string
  /** 缺失字段 */
  missingFields: string[]
  /** 预填信息 */
  prefillData?: CasFirstLoginPrefillResponse
}

/**
 * CAS 登录成功响应
 */
export interface CasLoginSuccessResponse {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken?: string
  /** 令牌过期时间（秒） */
  expiresIn?: number
  /** 用户信息 */
  userInfo: UserLoginResponseDto
  /** 租户信息 */
  tenantInfo: {
    id: string
    tenantName: string
    logoUrl?: string
  }
  /** 是否强制修改密码 */
  forcePasswordChange?: boolean
}

/**
 * CAS 可选班级
 */
export interface CasAvailableClassResponse {
  /** 班级ID */
  id: string
  /** 班级名称 */
  className: string
  /** 专业 ID（关联 t_majors.id） */
  majorId?: string
  /** 专业名称（联表填充） */
  majorName?: string
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

function hasProfileCompletionStatus(
  response: CasLoginSuccessResponse | CasProfileCompletionResponse,
): response is CasProfileCompletionResponse {
  if (typeof response !== 'object' || response === null) {
    return false
  }
  return 'status' in response && response.status === 'PROFILE_COMPLETION_REQUIRED'
}

/**
 * 判断是否为首次补录分支响应
 */
export function isCasProfileCompletionResponse(
  response: CasLoginSuccessResponse | CasProfileCompletionResponse,
): response is CasProfileCompletionResponse {
  return hasProfileCompletionStatus(response)
}
/**
 * 获取租户的SSO配置
 * 用于判断当前租户是否启用CAS单点登录
 *
 * @param tenantId 租户ID（后端必填）
 */
export function getSsoConfig(tenantId: string): Promise<AuthSsoConfigVO> {
  return http.get<AuthSsoConfigVO>('/api/auth/sso-config', { params: { tenantId } })
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
export function casCallback(
  ticket: string,
  tenantId: string,
): Promise<CasLoginSuccessResponse | CasProfileCompletionResponse> {
  return http.post<CasLoginSuccessResponse | CasProfileCompletionResponse>(
    '/api/sso/cas/callback',
    { ticket, tenantId },
  )
}

/**
 * 获取首次补录上下文
 *
 * @param completionToken 补录令牌
 */
export function getCasFirstLoginContext(
  completionToken: string,
): Promise<CasProfileCompletionResponse> {
  return http.get<CasProfileCompletionResponse>('/api/sso/cas/first-login/context', {
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
  return http.get<CasAvailableClassResponse[]>('/api/sso/cas/first-login/classes', {
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
): Promise<CasLoginSuccessResponse> {
  return http.post<CasLoginSuccessResponse>('/api/sso/cas/complete-first-login', data)
}
