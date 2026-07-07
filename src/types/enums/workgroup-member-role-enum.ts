/** 评价工作组成员角色 - WorkgroupMemberRoleEnum */
export enum WorkgroupMemberRoleCode {
  CONVENER = 'CONVENER',
  MEMBER = 'MEMBER',
  EXTERNAL_EXPERT = 'EXTERNAL_EXPERT',
}

export const ALL_WORKGROUP_MEMBER_ROLE_CODES: readonly WorkgroupMemberRoleCode[] = [
  WorkgroupMemberRoleCode.CONVENER,
  WorkgroupMemberRoleCode.MEMBER,
  WorkgroupMemberRoleCode.EXTERNAL_EXPERT,
]

export const WorkgroupMemberRoleDescription: Record<WorkgroupMemberRoleCode, string> = {
  [WorkgroupMemberRoleCode.CONVENER]: '召集人',
  [WorkgroupMemberRoleCode.MEMBER]: '成员',
  [WorkgroupMemberRoleCode.EXTERNAL_EXPERT]: '外部专家',
}

