/**
 * localStorage 存储键常量
 * 集中管理所有 localStorage key，避免硬编码分散在各个文件中
 */


/** 用户访问令牌 */
export const STORAGE_TOKEN = 'token'

/** 刷新令牌 */
export const STORAGE_REFRESH_TOKEN = 'refreshToken'

/** 令牌过期时间戳（秒级） */
export const STORAGE_TOKEN_EXPIRES_AT = 'tokenExpiresAt'


/** 用户信息（遗留 key，清除认证时需移除） */
export const STORAGE_USER = 'user'

/** @deprecated 遗留键，仅用于迁移清理；真源为 localStorage login-config */
export const STORAGE_REMEMBER_ME = 'rememberMe'

/** @deprecated 遗留键，仅用于迁移清理；真源为 localStorage login-config */
export const STORAGE_REMEMBERED_USERNAME = 'rememberedUsername'


/** 当前租户ID */
export const STORAGE_TENANT_ID = 'tenantId'

/** 租户信息（遗留 key，清除认证时需移除） */
export const STORAGE_TENANT = 'tenant'

/** 学生登录页缓存的上次学校名（仅 UX 便利项，不属于认证） */
export const STORAGE_LAST_STUDENT_SCHOOL = 'LAST_STUDENT_SCHOOL'

/** 设备唯一标识（雪花ID），用于风控审计与登录设备指纹 */
export const STORAGE_DEVICE_ID = 'deviceId'


/**
 * 认证相关的所有 key 列表
 * 用于清除认证状态时批量移除
 */
export const AUTH_STORAGE_KEYS = [
  STORAGE_TOKEN,
  STORAGE_REFRESH_TOKEN,
  STORAGE_TOKEN_EXPIRES_AT,
  STORAGE_USER,
  STORAGE_TENANT_ID,
  STORAGE_TENANT,
] as const
