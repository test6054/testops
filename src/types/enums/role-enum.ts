/**
 * 角色枚举 - 与后端 RoleEnum 完全对应
 * 平台固定角色定义
 */
export enum RoleEnum {
  /** 超级管理员 */
  SUPER_ADMIN = 'SUPER_ADMIN',
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

/**
 * 获取角色显示名称
 */
export function getRoleName(role: RoleEnum): string {
  return ROLE_CONFIG[role].name
}

/**
 * 获取角色颜色
 */
export function getRoleColor(role: RoleEnum): string {
  return ROLE_CONFIG[role].color
}
