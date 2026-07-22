/**
 * 通用状态枚举集合
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
