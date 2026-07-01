export interface TaskStatusItem {
  code: string
  description: string
  color: string
  icon?: string
}

export type StudentTaskStatusTone = 'gray' | 'blue' | 'orange' | 'green' | 'yellow' | 'red' | 'purple'

export enum StudentTaskStatusEnum {
  /** 未开始 - 任务已分配但实践未开始 */
  NOT_STARTED = 'NOT_STARTED',
  /** 进行中 - 学生可多次上传文件但未确认最终提交 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 待审核 - 学生已确认最终提交，等待教师初次批阅 */
  PENDING_FIRST_REVIEW = 'PENDING_FIRST_REVIEW',
  /** 待重提交 - 教师打回作业，学生可在宽限期内继续上传 */
  PENDING_RESUBMISSION = 'PENDING_RESUBMISSION',
  /** 待复审 - 学生修改后重新确认最终提交，等待复审 */
  PENDING_RE_REVIEW = 'PENDING_RE_REVIEW',
  /** 已完成 - 教师评分通过，任务结束 */
  COMPLETED = 'COMPLETED'
}

/** 学生任务状态配置映射 */
export const STUDENT_TASK_STATUS_CONFIG: Record<StudentTaskStatusEnum, TaskStatusItem> = {
  [StudentTaskStatusEnum.NOT_STARTED]: {
    code: 'NOT_STARTED',
    description: '未开始',
    color: 'var(--ant-color-text-tertiary)',
    icon: 'icon-clock-circle',
  },
  [StudentTaskStatusEnum.IN_PROGRESS]: {
    code: 'IN_PROGRESS',
    description: '进行中',
    color: 'var(--ant-color-primary)',
    icon: 'icon-loading',
  },
  [StudentTaskStatusEnum.PENDING_FIRST_REVIEW]: {
    code: 'PENDING_FIRST_REVIEW',
    description: '待审核',
    color: 'var(--ant-color-primary-hover)',
    icon: 'icon-check',
  },
  [StudentTaskStatusEnum.PENDING_RESUBMISSION]: {
    code: 'PENDING_RESUBMISSION',
    description: '待重提交',
    color: 'var(--ant-color-error)',
    icon: 'icon-close-circle',
  },
  [StudentTaskStatusEnum.PENDING_RE_REVIEW]: {
    code: 'PENDING_RE_REVIEW',
    description: '待复审',
    color: 'var(--ant-color-warning)',
    icon: 'icon-redo',
  },
  [StudentTaskStatusEnum.COMPLETED]: {
    code: 'COMPLETED',
    description: '已完成',
    color: 'var(--ant-color-success)',
    icon: 'icon-check-circle',
  },
}

export const STUDENT_TASK_STATUS_TONE_MAP: Record<StudentTaskStatusEnum, StudentTaskStatusTone> = {
  [StudentTaskStatusEnum.NOT_STARTED]: 'gray',
  [StudentTaskStatusEnum.IN_PROGRESS]: 'blue',
  [StudentTaskStatusEnum.PENDING_FIRST_REVIEW]: 'orange',
  [StudentTaskStatusEnum.PENDING_RESUBMISSION]: 'red',
  [StudentTaskStatusEnum.PENDING_RE_REVIEW]: 'orange',
  [StudentTaskStatusEnum.COMPLETED]: 'green',
}

/**
 * 获取任务状态配置
 * @param status 学生任务状态
 * @returns 状态配置对象
 */
export function getTaskStatusConfig(status: StudentTaskStatusEnum): TaskStatusItem {
  return strictEnumValue(STUDENT_TASK_STATUS_CONFIG, status, '学生任务状态')
}

export function getTaskStatusTone(status: StudentTaskStatusEnum): StudentTaskStatusTone {
  return strictEnumTone(STUDENT_TASK_STATUS_TONE_MAP, status, '学生任务状态')
}

export function isInProgress(status: StudentTaskStatusEnum): boolean {
  return status === StudentTaskStatusEnum.IN_PROGRESS
}

export function isPendingResubmission(status: StudentTaskStatusEnum): boolean {
  return status === StudentTaskStatusEnum.PENDING_RESUBMISSION
}

export function canSubmit(status: StudentTaskStatusEnum): boolean {
  return (
    status === StudentTaskStatusEnum.IN_PROGRESS
    || status === StudentTaskStatusEnum.PENDING_RESUBMISSION
  )
}

import { strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
