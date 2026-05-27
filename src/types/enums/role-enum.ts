/**
 * 角色枚举 - 与后端 RoleEnum 完全对应
 * 平台固定角色定义
 */
export enum RoleEnum {
  /** 超级管理员 */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** 企业负责人 */
  CROP_ADMIN = 'CROP_ADMIN',
  /** 企业助教 */
  CROP_USER = 'CROP_USER',
  /** 教师 */
  SCH_TECH = 'SCH_TECH',
  /** 学生 */
  SCH_STU = 'SCH_STU',
  /** 系统（用于自动操作、定时任务等场景的操作者标识） */
  SYSTEM = 'SYSTEM',
}

/** 角色配置 */
export const ROLE_CONFIG: Record<RoleEnum, { name: string, description: string, color: string }> = {
  [RoleEnum.SUPER_ADMIN]: {
    name: '超级管理员',
    description: '平台超级管理员，拥有所有权限',
    color: 'var(--ant-color-error)'
  },
  [RoleEnum.CROP_ADMIN]: {
    name: '企业负责人',
    description: '企业/机构负责人',
    color: 'var(--ant-color-primary-hover)'
  },
  [RoleEnum.CROP_USER]: {
    name: '企业助教',
    description: '企业/机构助教人员',
    color: 'var(--ant-color-success-hover)'
  },
  [RoleEnum.SCH_TECH]: {
    name: '教师',
    description: '学校教师',
    color: 'var(--ant-color-primary)'
  },
  [RoleEnum.SCH_STU]: {
    name: '学生',
    description: '学校学生',
    color: 'var(--ant-color-success)'
  },
  [RoleEnum.SYSTEM]: {
    name: '系统',
    description: '系统自动操作',
    color: 'var(--ant-color-text-tertiary)'
  },
}

function requireRoleConfig(role: RoleEnum | string): { name: string, description: string, color: string } {
  const config = ROLE_CONFIG[role as RoleEnum]
  if (!config) {
    throw new Error(`角色存在未定义枚举值：${role}`)
  }
  return config
}

/**
 * 获取角色显示名称
 */
export function getRoleName(role: RoleEnum | string): string {
  return requireRoleConfig(role).name
}

/**
 * 获取角色颜色
 */
export function getRoleColor(role: RoleEnum | string): string {
  return requireRoleConfig(role).color
}
