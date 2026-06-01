import { PracticeStatusEnum } from '@/types/enums'
import { StudentTaskStatusEnum } from '@/types/enums/student-task-status'
import { TeacherReviewStatusEnum } from '@/types/enums/teacher-review-status'
import { strictEnumTone } from '@/utils/strict-enum'

export type StatusVariant =
  | 'neutral'
  | 'info'
  | 'pending'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'

export interface StatusStyle {
  bgColor: string
  textColor: string
  borderColor: string
}

export const STATUS_VARIANT_STYLES: Record<StatusVariant, StatusStyle> = {
  neutral: {
    bgColor: 'var(--ant-color-fill-secondary)',
    textColor: 'var(--ant-color-text-secondary)',
    borderColor: 'var(--ant-color-border-secondary)',
  },
  info: {
    bgColor: 'var(--ant-color-primary-bg)',
    textColor: 'var(--ant-color-primary)',
    borderColor: 'var(--ant-color-primary-border)',
  },
  pending: {
    bgColor: 'var(--ant-color-warning-bg)',
    textColor: 'var(--ant-color-warning)',
    borderColor: 'var(--ant-color-warning-hover)',
  },
  success: {
    bgColor: 'var(--ant-color-success-bg)',
    textColor: 'var(--ant-color-success)',
    borderColor: 'var(--ant-color-success-border)',
  },
  warning: {
    bgColor: 'var(--ant-color-warning-bg)',
    textColor: 'var(--ant-color-warning)',
    borderColor: 'var(--ant-color-warning-hover)',
  },
  danger: {
    bgColor: 'var(--ant-color-error-bg)',
    textColor: 'var(--ant-color-error)',
    borderColor: 'var(--ant-color-error-border)',
  },
  purple: {
    bgColor: 'var(--ant-color-primary-bg)',
    textColor: 'var(--ant-color-primary-hover)',
    borderColor: 'var(--ant-color-primary-border-hover)',
  },
}

export const PRACTICE_STATUS_VARIANT_MAP: Record<PracticeStatusEnum, StatusVariant> = {
  [PracticeStatusEnum.DRAFT]: 'neutral',
  [PracticeStatusEnum.NOT_STARTED]: 'info',
  [PracticeStatusEnum.ACTIVE]: 'info',
  [PracticeStatusEnum.FINISHED]: 'success',
  [PracticeStatusEnum.CLOSED]: 'danger',
}

export function mapPracticeStatusToVariant(status?: string | null): StatusVariant {
  if (!status) {
    throw new Error('实践状态不符合前后端契约')
  }
  const upper = status.toUpperCase() as PracticeStatusEnum
  return strictEnumTone(PRACTICE_STATUS_VARIANT_MAP, upper, '实践状态')
}

export const STUDENT_STATUS_VARIANT_MAP: Record<StudentTaskStatusEnum, StatusVariant> = {
  [StudentTaskStatusEnum.NOT_STARTED]: 'neutral',
  [StudentTaskStatusEnum.IN_PROGRESS]: 'info',
  [StudentTaskStatusEnum.PENDING_FIRST_REVIEW]: 'pending',
  [StudentTaskStatusEnum.PENDING_RESUBMISSION]: 'pending',
  [StudentTaskStatusEnum.PENDING_RE_REVIEW]: 'pending',
  [StudentTaskStatusEnum.COMPLETED]: 'success',
}

export function mapStudentStatusToVariant(status?: string | null): StatusVariant {
  if (!status) {
    throw new Error('学生任务状态不符合前后端契约')
  }

  // 先检查前端自定义状态（GradingCenterTab使用的状态）
  const customStatusMap: Record<string, StatusVariant> = {
    pending: 'pending', // 待审核 - 橙色
    completed: 'success', // 已通过 - 绿色
    'review-needed': 'danger', // 已驳回 - 红色
    'not-submitted': 'neutral', // 未提交 - 灰色
  }

  if (customStatusMap[status]) {
    return customStatusMap[status]
  }

  // 再检查后端枚举状态
  const upper = status.toUpperCase() as StudentTaskStatusEnum
  return strictEnumTone(STUDENT_STATUS_VARIANT_MAP, upper, '学生任务状态')
}

export const TEACHER_REVIEW_STATUS_VARIANT_MAP: Record<TeacherReviewStatusEnum, StatusVariant> = {
  [TeacherReviewStatusEnum.NOT_STARTED]: 'neutral',
  [TeacherReviewStatusEnum.PENDING]: 'pending',
  [TeacherReviewStatusEnum.APPROVED]: 'success',
  [TeacherReviewStatusEnum.REJECTED]: 'danger',
}

export function mapTeacherReviewStatusToVariant(status?: string | null): StatusVariant {
  if (!status) {
    throw new Error('教师评阅状态不符合前后端契约')
  }
  const upper = status.toUpperCase() as TeacherReviewStatusEnum
  return strictEnumTone(TEACHER_REVIEW_STATUS_VARIANT_MAP, upper, '教师评阅状态')
}
