/** 双评任务角色 */
export enum DualMarkRoleCode {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

export const ALL_DUAL_MARK_ROLE_CODES: readonly DualMarkRoleCode[] = [
  DualMarkRoleCode.PRIMARY,
  DualMarkRoleCode.SECONDARY,
]

export const DualMarkRoleDescription: Record<DualMarkRoleCode, string> = {
  [DualMarkRoleCode.PRIMARY]: '主评',
  [DualMarkRoleCode.SECONDARY]: '副评',
}
