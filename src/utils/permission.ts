// 从统一枚举导入角色枚举
import { ROLE_CONFIG, RoleEnum } from '@/types/enums'
import { strictEnumValue } from '@/utils/strict-enum'

// 路由配置统一从该入口导入角色枚举。
export {RoleEnum}

// 角色显示名称 - 使用统一配置
export const ROLE_NAMES: Record<RoleEnum, string> = {
  [RoleEnum.SUPER_ADMIN]: ROLE_CONFIG[RoleEnum.SUPER_ADMIN].name,
  [RoleEnum.SCH_TECH]: ROLE_CONFIG[RoleEnum.SCH_TECH].name,
  [RoleEnum.CROP_ADMIN]: ROLE_CONFIG[RoleEnum.CROP_ADMIN].name,
  [RoleEnum.CROP_USER]: ROLE_CONFIG[RoleEnum.CROP_USER].name,
  [RoleEnum.SCH_STU]: ROLE_CONFIG[RoleEnum.SCH_STU].name,
  [RoleEnum.SYSTEM]: ROLE_CONFIG[RoleEnum.SYSTEM].name,
}

// 角色描述
// 角色层级（数字越小权限越高）
// 角色分组（单角色模式：用于角色类型判断）
export const ADMIN_ROLES: readonly RoleEnum[] = [RoleEnum.SUPER_ADMIN]
export const TEACHER_ROLES: readonly RoleEnum[] = [RoleEnum.SCH_TECH, RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER]
export const STUDENT_ROLES: readonly RoleEnum[] = [RoleEnum.SCH_STU]

// 所有教师类角色（包括超级管理员）
export const ALL_TEACHER_ROLES: readonly RoleEnum[] = [...ADMIN_ROLES, ...TEACHER_ROLES]

/**
 * 权限检查工具函数
 */

/**
 * 检查是否为有效角色
 */
export function isValidRole(role: string): role is RoleEnum {
    for (const value of Object.values(RoleEnum)) {
        if (role === value) {
            return true
        }
    }
    return false
}

/**
 * 获取角色显示名称
 */
export function getRoleName(role: RoleEnum): string {
    return strictEnumValue(ROLE_NAMES, role, '角色')
}
/**
 * 检查是否为管理员角色
 */
export function isAdmin(role?: string): boolean {
    if (!role) return false
    return isValidRole(role) && ADMIN_ROLES.includes(role)
}

/**
 * 检查是否为教师角色
 */
export function isTeacher(role?: string): boolean {
    if (!role) return false
    return isValidRole(role) && ALL_TEACHER_ROLES.includes(role)
}

/**
 * 检查是否为学生角色
 */
export function isStudent(role?: string): boolean {
    if (!role) return false
    return isValidRole(role) && STUDENT_ROLES.includes(role)
}
/**
 * 检查用户是否具有指定角色
 */
export function hasRole(targetRole: string, userRole?: string): boolean {
    if (!userRole) return false
    return userRole === targetRole
}

/**
 * 检查用户是否具有任一指定角色
 */
export function hasAnyRole(targetRoles: string[], userRole?: string): boolean {
    if (!userRole || !targetRoles.length) return false
    return targetRoles.includes(userRole)
}
/**
 * 租户管理员权限检查
 * 注意：租户管理员不是角色，而是SCH_TECH角色的特殊属性
 * 基于后端UserDetailDto.isTenantAdmin字段判断
 */
export function isTenantAdmin(userInfo?: { roleKey?: string, isTenantAdmin?: boolean }): boolean {
    // 只有SCH_TECH角色的用户才可能是租户管理员
    if (!userInfo || userInfo.roleKey !== RoleEnum.SCH_TECH) {
        return false
    }

    // 检查用户是否具有租户管理员属性
    // 基于后端UserDetailDto.isTenantAdmin字段
    return userInfo.isTenantAdmin === true
}

/**
 * 检查教师是否具有租户管理权限
 */
export function hasTeacherTenantPermission(userInfo?: { roleKey?: string, isTenantAdmin?: boolean }): boolean {
    // 超级管理员始终具有租户管理权限
    if (userInfo?.roleKey === RoleEnum.SUPER_ADMIN) {
        return true
    }

    // SCH_TECH角色的租户管理员具有租户管理权限
    return isTenantAdmin(userInfo)
}

/**
 * 用户权限信息接口（单角色模式）
 */
export interface UserPermissionInfo {
  id: string
  userName: string
  nickName?: string
  roleKey?: string // 单角色模式，使用roleKey而不是roles数组
  isTenantAdmin?: boolean
  // 其他必要的用户信息
}

/**
 * 检查是否可以重置用户密码
 * @param targetUser 目标用户
 * @param currentUser 当前操作用户
 * @returns 权限检查结果
 */
export function canResetUserPassword(
  targetUser: UserPermissionInfo,
  currentUser?: UserPermissionInfo
): {
  canReset: boolean
  canUseCustomPassword: boolean
  reason?: string
} {
  if (!currentUser) {
    return {
      canReset: false,
      canUseCustomPassword: false,
      reason: '用户未登录'
    }
  }

  // 不能重置自己的密码（通过管理员重置功能）
  if (targetUser.id === currentUser.id) {
    return {
      canReset: false,
      canUseCustomPassword: false,
      reason: '不能重置自己的密码'
    }
  }

  const currentUserRole = currentUser.roleKey
  const targetUserRole = targetUser.roleKey

  if (!targetUserRole) {
    return {
      canReset: false,
      canUseCustomPassword: false,
      reason: '目标用户角色信息缺失',
    }
  }

  // 超级管理员可以重置所有用户密码，并可以使用自定义密码
  if (currentUserRole === RoleEnum.SUPER_ADMIN) {
    return {
      canReset: true,
      canUseCustomPassword: true
    }
  }

  // 租户管理员可以重置同租户教师和学生密码，并允许自定义密码
  if (currentUserRole === RoleEnum.SCH_TECH) {
    if (currentUser.isTenantAdmin === true) {
      if (targetUserRole !== RoleEnum.SCH_TECH && targetUserRole !== RoleEnum.SCH_STU) {
        return {
          canReset: false,
          canUseCustomPassword: false,
          reason: '租户管理员只能重置教师或学生密码',
        }
      }

      return {
        canReset: true,
        canUseCustomPassword: true,
      }
    }

    if (targetUserRole === RoleEnum.SCH_STU) {
      return {
        canReset: true,
        canUseCustomPassword: false,
      }
    }

    return {
      canReset: false,
      canUseCustomPassword: false,
      reason: '普通教师只能重置学生密码',
    }
  }

  // 其他角色不能重置密码
  return {
    canReset: false,
    canUseCustomPassword: false,
    reason: '权限不足'
  }
}
