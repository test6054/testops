/**
 * 用户状态枚举 - 与后端 UserStatusEnum 完全对应
 */
export enum UserStatusEnum {
  /** 正常 */
  ACTIVE = 'ACTIVE',
  /** 停用 */
  INACTIVE = 'INACTIVE',
  /** 待审批 */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  /** 已锁定 */
  SUSPENDED = 'SUSPENDED',
  /** 注册拒绝 */
  REJECTED = 'REJECTED',
  /** 已删除 */
  DELETED = 'DELETED',
}

// 统一状态标签色板
export type UserStatusBadgeTone = 'gray' | 'blue' | 'orange' | 'green' | 'yellow' | 'red' | 'purple'

/** 用户状态配置 - 用于前端UI展示 */
export const USER_STATUS_CONFIG: Record<UserStatusEnum, {
  label: string
  color: string
  description: string
}> = {
  [UserStatusEnum.ACTIVE]: {
    label: '正常',
    color: 'var(--dp-success)',
    description: '用户状态正常，可以正常使用系统'
  },
  [UserStatusEnum.INACTIVE]: {
    label: '停用',
    color: 'var(--dp-border)',
    description: '用户已被停用，无法登录系统'
  },
  [UserStatusEnum.PENDING_APPROVAL]: {
    label: '待审批',
    color: 'var(--dp-warning)',
    description: '用户注册申请待管理员审批'
  },
  [UserStatusEnum.SUSPENDED]: {
    label: '已锁定',
    color: 'var(--dp-error)',
    description: '用户账户已被锁定'
  },
  [UserStatusEnum.REJECTED]: {
    label: '注册拒绝',
    color: 'var(--dp-error)',
    description: '用户注册申请已被拒绝'
  },
  [UserStatusEnum.DELETED]: {
    label: '已删除',
    color: 'var(--dp-text-secondary)',
    description: '用户已被删除'
  },
}

// 与组件库 Badge 一致的状态色映射
export const USER_STATUS_TONE_MAP: Record<UserStatusEnum, UserStatusBadgeTone> = {
  [UserStatusEnum.ACTIVE]: 'green',
  [UserStatusEnum.INACTIVE]: 'gray',
  [UserStatusEnum.PENDING_APPROVAL]: 'orange',
  [UserStatusEnum.SUSPENDED]: 'red',
  [UserStatusEnum.REJECTED]: 'red',
  [UserStatusEnum.DELETED]: 'gray',
}

/** 全部合法用户状态（显式枚举成员列表，禁止 Object.keys 反射推导）。 */
export const ALL_USER_STATUS_CODES: readonly UserStatusEnum[] = [
  UserStatusEnum.ACTIVE,
  UserStatusEnum.INACTIVE,
  UserStatusEnum.PENDING_APPROVAL,
  UserStatusEnum.SUSPENDED,
  UserStatusEnum.REJECTED,
  UserStatusEnum.DELETED,
]

/** 用户状态下拉筛选项 */
export const USER_STATUS_FILTER_OPTIONS: Array<{ value: UserStatusEnum, label: string }> = [
  { value: UserStatusEnum.ACTIVE, label: USER_STATUS_CONFIG[UserStatusEnum.ACTIVE].label },
  { value: UserStatusEnum.INACTIVE, label: USER_STATUS_CONFIG[UserStatusEnum.INACTIVE].label },
  { value: UserStatusEnum.PENDING_APPROVAL, label: USER_STATUS_CONFIG[UserStatusEnum.PENDING_APPROVAL].label },
  { value: UserStatusEnum.SUSPENDED, label: USER_STATUS_CONFIG[UserStatusEnum.SUSPENDED].label },
  { value: UserStatusEnum.REJECTED, label: USER_STATUS_CONFIG[UserStatusEnum.REJECTED].label },
  { value: UserStatusEnum.DELETED, label: USER_STATUS_CONFIG[UserStatusEnum.DELETED].label },
]

/**
 * 获取用户状态标签
 */
export function getUserStatusLabel(status: UserStatusEnum): string {
  return USER_STATUS_CONFIG[status].label
}

/**
 * 获取用户状态颜色
 */
export function getUserStatusColor(status: UserStatusEnum): string {
  return USER_STATUS_CONFIG[status].color
}

/**
 * 获取状态对应的 Badge tone（遵循 /style-guide 状态色板）
 */
export function getUserStatusTone(status: UserStatusEnum): UserStatusBadgeTone {
  return USER_STATUS_TONE_MAP[status]
}
