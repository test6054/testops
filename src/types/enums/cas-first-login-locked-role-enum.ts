import { RoleEnum } from '@/types/enums/role-enum'

/** CAS 首次登录补录页允许锁定的业务角色 */
export const ALL_CAS_FIRST_LOGIN_LOCKED_ROLE_CODES: readonly RoleEnum[] = [
  RoleEnum.SCH_STU,
  RoleEnum.SCH_TECH,
]

/** CAS 补录页角色展示文案，仅登记后端会锁定到补录页的业务角色 */
const CAS_FIRST_LOGIN_LOCKED_ROLE_DESCRIPTION = new Map<RoleEnum, string>([
  [RoleEnum.SCH_STU, '学生'],
  [RoleEnum.SCH_TECH, '教师'],
])

export function casFirstLoginLockedRoleDescription(role: RoleEnum): string {
  const description = CAS_FIRST_LOGIN_LOCKED_ROLE_DESCRIPTION.get(role)
  if (!description) {
    throw new Error(`CAS 锁定角色缺少展示映射：${role}`)
  }
  return description
}
