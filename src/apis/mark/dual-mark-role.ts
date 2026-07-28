import {
  ALL_DUAL_MARK_ROLE_CODES,
  DualMarkRoleCode,
  DualMarkRoleDescription,
} from '@/types/enums/dual-mark-role-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_DUAL_MARK_ROLE_CODES,
  DualMarkRoleCode,
  DualMarkRoleDescription,
} from '@/types/enums/dual-mark-role-enum'

export const DUAL_MARK_ROLE_OPTIONS: Array<{
  label: string
  value: DualMarkRoleCode
}> = ALL_DUAL_MARK_ROLE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(DualMarkRoleDescription, value, '双评角色'),
}))

export function dualMarkRoleLabel(value: DualMarkRoleCode): string {
  return strictEnumLabel(DualMarkRoleDescription, value, '双评角色')
}
