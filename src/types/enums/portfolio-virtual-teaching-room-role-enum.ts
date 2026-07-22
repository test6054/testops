/** 虚拟教研室成员角色 - PortfolioVirtualTeachingRoomRoleEnum */
export enum PortfolioVirtualTeachingRoomRoleCode {
  LEADER = 'LEADER',
  CORE = 'CORE',
  MEMBER = 'MEMBER',
  EXTERNAL_MENTOR = 'EXTERNAL_MENTOR',
}

export const ALL_PORTFOLIO_VIRTUAL_TEACHING_ROOM_ROLE_CODES: readonly PortfolioVirtualTeachingRoomRoleCode[] = [
  PortfolioVirtualTeachingRoomRoleCode.LEADER,
  PortfolioVirtualTeachingRoomRoleCode.CORE,
  PortfolioVirtualTeachingRoomRoleCode.MEMBER,
  PortfolioVirtualTeachingRoomRoleCode.EXTERNAL_MENTOR,
]

export const PortfolioVirtualTeachingRoomRoleDescription: Record<PortfolioVirtualTeachingRoomRoleCode, string> = {
  [PortfolioVirtualTeachingRoomRoleCode.LEADER]: '负责人',
  [PortfolioVirtualTeachingRoomRoleCode.CORE]: '核心成员',
  [PortfolioVirtualTeachingRoomRoleCode.MEMBER]: '参与成员',
  [PortfolioVirtualTeachingRoomRoleCode.EXTERNAL_MENTOR]: '外部导师',
}
