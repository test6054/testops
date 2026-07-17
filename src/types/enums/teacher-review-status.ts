/**
 * 教师审核状态枚举
 * V4.0重构：与后端TeacherReviewStatusEnum完全对齐
 *
 * 4状态：NOT_STARTED, PENDING, APPROVED, REJECTED
 * @version 4.0 - 状态重构版本
 */

export interface TeacherReviewStatusItem {
  code: string
  description: string
  color: string
  icon?: string
}

/**
 * 教师审核状态枚举
 * V4.0重构：表示教师审核流程的状态
 * 与后端TeacherReviewStatusEnum完全对齐（4个状态）
 */
export enum TeacherReviewStatusEnum {
  /** 未开始 - 学生尚未提交或实践未截止 */
  NOT_STARTED = 'NOT_STARTED',
  /** 待审核 - 等待教师审核 */
  PENDING = 'PENDING',
  /** 已通过 - 教师审核通过并给出最终成绩（任务完成） */
  APPROVED = 'APPROVED',
  /** 已打回 - 教师打回作业要求重新提交 */
  REJECTED = 'REJECTED'
}

/** 教师审核状态配置映射 */
export const TEACHER_REVIEW_STATUS_CONFIG: Record<TeacherReviewStatusEnum, TeacherReviewStatusItem> = {
  [TeacherReviewStatusEnum.NOT_STARTED]: {
    code: 'NOT_STARTED',
    description: '未开始',
    color: 'var(--dp-text-tertiary)',
    icon: 'icon-file'
  },
  [TeacherReviewStatusEnum.PENDING]: {
    code: 'PENDING',
    description: '待审核',
    color: 'var(--dp-warning)',
    icon: 'icon-clock-circle'
  },
  [TeacherReviewStatusEnum.APPROVED]: {
    code: 'APPROVED',
    description: '已通过',
    color: 'var(--dp-success)',
    icon: 'icon-check-circle'
  },
  [TeacherReviewStatusEnum.REJECTED]: {
    code: 'REJECTED',
    description: '已打回',
    color: 'var(--dp-error)',
    icon: 'icon-close-circle'
  }
}
