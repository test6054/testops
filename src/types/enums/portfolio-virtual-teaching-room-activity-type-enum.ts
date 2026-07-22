/** 虚拟教研室活动类型 - PortfolioVirtualTeachingRoomActivityTypeEnum */
export enum PortfolioVirtualTeachingRoomActivityTypeCode {
  NATIONAL_PROVINCIAL_TASK = 'NATIONAL_PROVINCIAL_TASK',
  JOINT_COURSE = 'JOINT_COURSE',
  JOINT_PREP = 'JOINT_PREP',
  RESOURCE_POOL = 'RESOURCE_POOL',
  TEXTBOOK_OR_TRAINING = 'TEXTBOOK_OR_TRAINING',
  PROMOTION = 'PROMOTION',
}

export const ALL_PORTFOLIO_VIRTUAL_TEACHING_ROOM_ACTIVITY_TYPE_CODES: readonly PortfolioVirtualTeachingRoomActivityTypeCode[] = [
  PortfolioVirtualTeachingRoomActivityTypeCode.NATIONAL_PROVINCIAL_TASK,
  PortfolioVirtualTeachingRoomActivityTypeCode.JOINT_COURSE,
  PortfolioVirtualTeachingRoomActivityTypeCode.JOINT_PREP,
  PortfolioVirtualTeachingRoomActivityTypeCode.RESOURCE_POOL,
  PortfolioVirtualTeachingRoomActivityTypeCode.TEXTBOOK_OR_TRAINING,
  PortfolioVirtualTeachingRoomActivityTypeCode.PROMOTION,
]

export const PortfolioVirtualTeachingRoomActivityTypeDescription: Record<
  PortfolioVirtualTeachingRoomActivityTypeCode,
  string
> = {
  [PortfolioVirtualTeachingRoomActivityTypeCode.NATIONAL_PROVINCIAL_TASK]: '国家级或省级虚拟教研室建设任务',
  [PortfolioVirtualTeachingRoomActivityTypeCode.JOINT_COURSE]: '校企联合课程开发',
  [PortfolioVirtualTeachingRoomActivityTypeCode.JOINT_PREP]: '联合备课与联合教研',
  [PortfolioVirtualTeachingRoomActivityTypeCode.RESOURCE_POOL]: '教学资源库共建',
  [PortfolioVirtualTeachingRoomActivityTypeCode.TEXTBOOK_OR_TRAINING]: '校企共同教材或实训项目开发',
  [PortfolioVirtualTeachingRoomActivityTypeCode.PROMOTION]: '教研成果推广应用',
}
