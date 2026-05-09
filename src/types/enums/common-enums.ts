/**
 * 通用状态枚举集合
 * 合并自 common-status.ts, warning-status.ts, invite-code-status.ts, course-status.ts
 */


/** 异步任务状态枚举 */
export enum AsyncTaskStatusEnum {
  /** 等待中 */
  PENDING = 'PENDING',
  /** 处理中 */
  PROCESSING = 'PROCESSING',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 失败 */
  FAILED = 'FAILED',
}
/** 启用/禁用状态枚举 */
export enum EnableStatusEnum {
  /** 启用 */
  ENABLED = 'ENABLED',
  /** 禁用 */
  DISABLED = 'DISABLED',
}


/** 告警状态枚举 - 与后端 WarningStatusEnum 完全对应 */
export enum WarningStatusEnum {
  /** 未读 */
  UNREAD = 'UNREAD',
  /** 处理中 */
  PROCESSING = 'PROCESSING',
  /** 已完成 */
  DONE = 'DONE',
}

/** 邀请码状态枚举 - 严格对应后端 InviteCodeStatusEnum */
export enum InviteCodeStatusEnum {
  /** 有效 - 邀请码可以正常使用 */
  ACTIVE = 'ACTIVE',
  /** 已禁用 - 邀请码被管理员禁用 */
  DISABLED = 'DISABLED',
}
