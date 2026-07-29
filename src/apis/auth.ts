/**
 * 认证相关API - 统一对接后端认证接口
 * 对接后端Spring Security + OAuth2 Authorization Server
 *
 * 架构说明：
 * - edu-user模块：认证服务器，处理登录、注册、OAuth2授权
 * - edu-gateway模块：JWT验证和用户信息传递
 * - 其他模块：通过请求头获取用户信息
 */

import type {
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UserLoginResponseDto
} from '@/types'
import http from '@/config/axios'
import service from '@/config/axios/service'
import { getDeviceId } from '@/utils/device'


/** 用户详细信息VO - 对应后端 GET /api/user/detailed/me 响应 */
export interface UserDetailedInfoVO extends UserLoginResponseDto {
  /** 是否为租户管理员（UserDetailDto.isTenantAdmin） */
  isTenantAdmin?: boolean
}

/** 微信用户信息 - 对应后端 WechatUserInfoDto */
export interface WechatUserInfoDTO {
  /** 微信OpenID */
  openId: string
  /** 微信UnionID，用于多应用场景下的用户唯一标识 */
  unionId?: string
  /** 微信昵称 */
  nickname?: string
  /** 微信头像URL */
  avatarUrl?: string
  /** 性别（1：男，2：女，0：未知） */
  gender?: number
  /** 省份 */
  province?: string
  /** 城市 */
  city?: string
  /** 国家 */
  country?: string
  /** 手机号（需要单独授权） */
  phoneNumber?: string
  /** 邮箱 */
  email?: string
}

/** 微信登录/绑定返回的精简用户信息 - 对应后端 WechatLoginUserInfoDto */
export interface WechatLoginUserInfoDTO {
  /** 用户ID */
  userId: string
  /** 租户ID */
  tenantId?: string
  /** 用户名 */
  userName: string
  /** 昵称 */
  nickName: string
  /** 头像URL */
  avatarUrl?: string
  /** 角色键 */
  roleKey: string
}

/** 微信登录结果DTO - 对应后端 WechatLoginResultDto */
export interface WechatLoginResultDTO {
  /** 状态：success-成功, need_binding-需要绑定, error-失败 */
  status: 'success' | 'need_binding' | 'error' | string
  /** 登录成功后的用户信息（精简版） */
  userInfo?: WechatLoginUserInfoDTO
  /** 访问令牌（登录成功时返回） */
  accessToken?: string
  /** 刷新令牌（登录成功时返回） */
  refreshToken?: string
  /** 微信用户信息（需要绑定时返回） */
  wechatUserInfo?: WechatUserInfoDTO
  /** 错误消息 */
  errorMessage?: string
  /** 提示消息 */
  message?: string
}

/** 微信绑定结果DTO - 对应后端 WechatBindingResultDto */
export interface WechatBindingResultDTO {
  /** 状态：success-成功, error-失败 */
  status: 'success' | 'error' | string
  /** 绑定成功后的用户信息（精简版） */
  userInfo?: WechatLoginUserInfoDTO
  /** 访问令牌 */
  accessToken?: string
  /** 刷新令牌 */
  refreshToken?: string
  /** 错误消息 */
  errorMessage?: string
  /** 提示消息 */
  message?: string
}

/** 微信登录状态检查响应（后端 /api/auth/wechat/check-binding 实际返回精简版用户信息） */
export interface WechatLoginStatusDTO {
  /** 是否需要绑定账号 */
  needBinding?: boolean
  /** 访问令牌（登录成功时返回） */
  token?: string
  /** 用户信息（登录成功时返回，对应后端 WechatLoginResultDto.userInfo 即 WechatLoginUserInfoDto 精简版） */
  user?: WechatLoginUserInfoDTO
  /** 微信用户信息（需要绑定时返回） */
  wechatUserInfo?: WechatUserInfoDTO
}

/** 租户管理员权限检查响应 */
export interface TenantAdminPermissionDTO {
  /** 是否为租户管理员 */
  isTenantAdmin: boolean
  /** 服务端权限投影版本，变更后客户端必须丢弃旧菜单 */
  permissionVersion: number
}

export interface LoginRequest {
  userName: string
  password: string
  loginType: string
  tenantId?: string
  rememberMe?: boolean
  captchaVerification?: string // AJ-Captcha验证码令牌
}

export interface PhoneLoginRequest {
  userName: string
  password: string
  loginType: 'smsCaptcha'
}

export interface StudentLoginRequest {
  userName: string // 学号
  password: string
  loginType: 'studentNoLogin'
  schoolName: string // 学校名称（后端根据名称查找租户）
  captchaVerification?: string // AJ-Captcha验证码令牌
}

export interface TenantPublicInfo {
  tenantId: string
  tenantCode: string
  tenantName: string
  logoUrl?: string
}

export interface LoginResponse {
  /** 是否成功 */
  success: boolean
  /** 状态码 */
  code: number
  /** 提示信息 */
  msg: string
  /** 返回数据 - 与后端LoginSuccessHandler的responseData完全一致 */
  data: LoginSuccessResponse
}

/** 登录成功响应数据 - 与后端 LoginSuccessHandler.responseData 完全一致 */
export interface LoginSuccessResponse {
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
 * 密码登录 - 对接后端 POST /api/login
 */
export function passwordLogin(data: LoginRequest): Promise<LoginSuccessResponse> {
  return http.post<LoginSuccessResponse>('/api/login', data)
}

/**
 * 手机号登录 - 对接后端 POST /api/login
 */
export function phoneLogin(data: PhoneLoginRequest): Promise<LoginSuccessResponse> {
  return http.post<LoginSuccessResponse>('/api/login', data)
}

/**
 * 学号登录 - 对接后端 POST /api/login
 */
export function studentLogin(data: StudentLoginRequest): Promise<LoginSuccessResponse> {
  return http.post<LoginSuccessResponse>('/api/login', data)
}

/**
 * 获取可登录的租户列表（学校选择器用）
 */
export function getTenantList(): Promise<TenantPublicInfo[]> {
  return http.get<TenantPublicInfo[]>('/api/auth/tenant-list')
}

/**
 * 根据学号查询关联的租户列表（学号登录时学校选择用）
 * 用于学号登录场景：先输入学号，再根据学号查询该学号存在的学校，选择后登录
 */
export function getTenantsByStudentNo(studentNo: string): Promise<TenantPublicInfo[]> {
  return http.get<TenantPublicInfo[]>('/api/auth/tenants-by-student-no', {params: {studentNo}})
}

/**
 * 根据租户编码查询租户信息（子域名解析用）
 */
export function getTenantByCode(tenantCode: string): Promise<TenantPublicInfo> {
  return http.get<TenantPublicInfo>(`/api/auth/tenant-by-code/${tenantCode}`)
}

/**
 * 用户登出 - 对接后端 POST /api/logout
 */
export function logout(): Promise<void> {
  return http.post<void>('/api/logout')
}


/**
 * 获取用户详细信息 - 对接后端 GET /api/user/detailed/me
 */
export function getUserDetailedInfo(): Promise<UserDetailedInfoVO> {
  return http.get<UserDetailedInfoVO>('/api/user/detailed/me')
}


/**
 * 刷新Token - 对接后端 POST /api/oauth2/refresh
 * 注意：http.post已经解包了ResultInfo.data，直接返回RefreshTokenResponse
 */
export function refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const requestData = data.deviceId ? data : { ...data, deviceId: getDeviceId() }
  return http.post<RefreshTokenResponse>('/api/oauth2/refresh', requestData)
}


/**
 * 用户注册 - 对接后端 POST /api/auth/register
 */
export function register(data: RegisterRequest): Promise<void> {
  return http.post<void>('/api/auth/register', data)
}


/**
 * 发送密码重置验证码 - 对接后端 POST /api/auth/send-reset-code
 */
export function sendResetCode(email: string): Promise<void> {
  return http.post<void>('/api/auth/send-reset-code', { email }, {
    skipAuth: true,
    showErrorMessage: false,
  })
}

/**
 * 重置密码 - 对接后端 POST /api/auth/reset-password
 */
export function resetPassword(data: ResetPasswordRequest): Promise<void> {
  return http.post<void>('/api/auth/reset-password', data, {
    skipAuth: true,
    showErrorMessage: false,
  })
}

/**
 * 验证重置验证码 - 对接后端 POST /api/auth/verify-reset-code
 */
export function verifyResetCode(email: string, code: string): Promise<boolean> {
  return http.post<boolean>('/api/auth/verify-reset-code', { email, code }, {
    skipAuth: true,
    showErrorMessage: false,
  })
}


/** AJ-Captcha获取验证码请求 */
export interface CaptchaGetRequest {
  /** 验证码类型: blockPuzzle(滑块拼图) / clickWord(文字点选) */
  captchaType: 'blockPuzzle' | 'clickWord'
}

/** AJ-Captcha校验验证码请求 */
export interface CaptchaCheckRequest {
  /** 验证码类型 */
  captchaType: 'blockPuzzle' | 'clickWord'
  /** 加密后的验证坐标信息 */
  pointJson: string
  /** 验证码token */
  token: string
}

/** AJ-Captcha通用响应 */
export interface CaptchaResponseModel {
  /** 响应码，0000表示成功 */
  repCode: string
  /** 响应消息 */
  repMsg: string
  /** 响应数据 - 验证码图片、坐标等信息 */
  repData: CaptchaRepData | null
}

/** AJ-Captcha响应数据 */
export interface CaptchaRepData {
  /** 验证码底图 Base64 */
  originalImageBase64?: string
  /** 滑块图片Base64 */
  jigsawImageBase64?: string
  /** 验证码token */
  token?: string
  /** 验证码类型 */
  captchaType?: string
  /** 秘钥 */
  secretKey?: string
  /** 文字点选坐标列表 */
  wordList?: string[]
  /** 验证结果 */
  result?: boolean
  /** 加密后的坐标 */
  pointJson?: string
  /** 二次验证令牌（check接口返回） */
  captchaVerification?: string
}

/** 获取行为验证码（AJ-Captcha） */
export async function getCaptcha(data: CaptchaGetRequest): Promise<CaptchaResponseModel> {
  const response = await service.post<CaptchaResponseModel>('/api/auth/captcha/get', data)
  return response.data
}

/** 校验行为验证码（AJ-Captcha） */
export async function checkCaptcha(data: CaptchaCheckRequest): Promise<CaptchaResponseModel> {
  const response = await service.post<CaptchaResponseModel>('/api/auth/captcha/check', data)
  return response.data
}

/** 获取验证码配置（是否启用） */
export interface CaptchaConfigResponse {
  /** 验证码是否启用 */
  enabled: boolean
}

/** 获取验证码配置 */
export function getCaptchaConfig(): Promise<CaptchaConfigResponse> {
  return http.get<CaptchaConfigResponse>('/api/auth/captcha/config')
}

/** 获取邮箱验证码 - 对接后端 POST /api/auth/send-verification-code */
export function getEmailCaptcha(email: string) {
  return http.post<void>('/api/auth/send-verification-code', { email, codeType: 'LOGIN_VERIFICATION' })
}

/**
 * 获取短信验证码 - 对接后端 POST /api/auth/send-sms-code
 * 注意：当前后端尚未集成 SMS 服务提供商，调用会返回明确错误
 */
export function getSmsCaptcha(mobile: string): Promise<void> {
  return http.post<void>('/api/auth/send-sms-code', { mobile })
}


/**
 * 获取微信登录URL - 对接后端 GET /api/auth/wechat/login-url
 */
export function getWechatLoginUrl(): Promise<string> {
  return http.get<string>('/api/auth/wechat/login-url')
}

/**
 * 微信绑定现有账号 - 对接后端 POST /api/auth/wechat/bind-existing
 * 对应后端 WechatBindExistingRequest
 */
export function wechatBindExisting(data: {
  userName: string
  password: string
  wechatCode?: string
  wechatOpenId?: string
  wechatUnionId?: string
}): Promise<WechatBindingResultDTO> {
  return http.post<WechatBindingResultDTO>('/api/auth/wechat/bind-existing', data)
}

/**
 * 检查微信绑定状态 - 对接后端 POST /api/auth/wechat/check-binding
 * 历史方法名保留，入参按后端含义应为微信授权 code。
 */
export function checkWechatLoginStatus(code: string): Promise<WechatLoginStatusDTO> {
  return http.post<WechatLoginResultDTO>('/api/auth/wechat/check-binding', null, {
    params: { code },
  }).then((result) => {
    if (result.status === 'need_binding') {
      return {
        needBinding: true,
        wechatUserInfo: result.wechatUserInfo,
      }
    }
    if (result.status === 'success') {
      return {
        token: result.accessToken,
        user: result.userInfo,
      }
    }
    return {}
  })
}

/**
 * 绑定微信账号
 * 1) 传入 username/password 时走 POST /api/auth/wechat/bind-existing
 * 2) 已登录用户不传账号密码时走 POST /api/auth/wechat/bind-current-user
 */
export function bindWechatAccount(data: {
  username?: string
  password?: string
  state?: string
}): Promise<WechatLoginResultDTO> {
  if (data.username && data.password) {
    return wechatBindExisting({
      userName: data.username,
      password: data.password,
      wechatCode: data.state,
    }).then((result) => ({
      status: result.status,
      userInfo: result.userInfo,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      errorMessage: result.errorMessage,
      message: result.message,
    }))
  }

  return http.post<WechatBindingResultDTO>('/api/auth/wechat/bind-current-user').then((result) => ({
    status: result.status,
    userInfo: result.userInfo,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    errorMessage: result.errorMessage,
    message: result.message,
  }))
}

/**
 * 处理微信回调 - 对接后端 POST /api/auth/wechat/callback
 */
export function wechatCallback(data: {
  code: string
  state: string
}): Promise<WechatLoginResultDTO> {
  return http.post<WechatLoginResultDTO>('/api/auth/wechat/callback', data)
}


/**
 * 修改当前用户密码 - 对接后端 POST /api/user/management/changePassword
 */
export function changePassword(data: {
  oldPassword?: string
  newPassword: string
  confirmNewPassword: string
  force?: boolean
}): Promise<void> {
  return http.post<void>('/api/user/management/changePassword', data)
}
