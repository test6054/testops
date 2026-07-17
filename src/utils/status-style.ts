import { PracticeStatusEnum } from '@/types/enums'
import { StudentTaskStatusEnum } from '@/types/enums/student-task-status'
import { TeacherReviewStatusEnum } from '@/types/enums/teacher-review-status'

export type StatusVariant
   = 'neutral' | 'info' | 'pending' | 'success' | 'warning' | 'danger' | 'purple'

export interface StatusStyle {
  bgColor: string
  textColor: string
  borderColor: string
}

export const STATUS_VARIANT_STYLES: Record<StatusVariant, StatusStyle> = {
  neutral: {
    bgColor: 'var(--dp-fill-secondary)',
    textColor: 'var(--dp-text-secondary)',
    borderColor: 'var(--dp-border-subtle)',
  },
  info: {
    bgColor: 'var(--dp-blue-50)',
    textColor: 'var(--dp-color-primary)',
    borderColor: 'var(--dp-blue-200)',
  },
  pending: {
    bgColor: 'var(--dp-warning-bg)',
    textColor: 'var(--dp-warning)',
    borderColor: 'var(--dp-warning-hover)',
  },
  success: {
    bgColor: 'var(--dp-success-bg)',
    textColor: 'var(--dp-success)',
    borderColor: 'var(--dp-green-200)',
  },
  warning: {
    bgColor: 'var(--dp-warning-bg)',
    textColor: 'var(--dp-warning)',
    borderColor: 'var(--dp-warning-hover)',
  },
  danger: {
    bgColor: 'var(--dp-error-bg)',
    textColor: 'var(--dp-danger)',
    borderColor: 'var(--dp-error-border)',
  },
  purple: {
    bgColor: 'var(--dp-blue-50)',
    textColor: 'var(--dp-color-primary-hover)',
    borderColor: 'var(--dp-border-hover)',
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
  if (!status) return 'neutral'
  switch (status.toUpperCase()) {
    case PracticeStatusEnum.DRAFT:
      return PRACTICE_STATUS_VARIANT_MAP[PracticeStatusEnum.DRAFT]
    case PracticeStatusEnum.NOT_STARTED:
      return PRACTICE_STATUS_VARIANT_MAP[PracticeStatusEnum.NOT_STARTED]
    case PracticeStatusEnum.ACTIVE:
      return PRACTICE_STATUS_VARIANT_MAP[PracticeStatusEnum.ACTIVE]
    case PracticeStatusEnum.FINISHED:
      return PRACTICE_STATUS_VARIANT_MAP[PracticeStatusEnum.FINISHED]
    case PracticeStatusEnum.CLOSED:
      return PRACTICE_STATUS_VARIANT_MAP[PracticeStatusEnum.CLOSED]
    default:
      return 'neutral'
  }
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
  if (!status) return 'neutral'

  const customStatusMap: Record<string, StatusVariant> = {
    "pending": 'pending',
    "completed": 'success',
    'review-needed': 'danger',
    'not-submitted': 'neutral',
  }

  if (customStatusMap[status]) {
    return customStatusMap[status]
  }

  switch (status.toUpperCase()) {
    case StudentTaskStatusEnum.NOT_STARTED:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.NOT_STARTED]
    case StudentTaskStatusEnum.IN_PROGRESS:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.IN_PROGRESS]
    case StudentTaskStatusEnum.PENDING_FIRST_REVIEW:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.PENDING_FIRST_REVIEW]
    case StudentTaskStatusEnum.PENDING_RESUBMISSION:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.PENDING_RESUBMISSION]
    case StudentTaskStatusEnum.PENDING_RE_REVIEW:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.PENDING_RE_REVIEW]
    case StudentTaskStatusEnum.COMPLETED:
      return STUDENT_STATUS_VARIANT_MAP[StudentTaskStatusEnum.COMPLETED]
    default:
      return 'neutral'
  }
}

export const TEACHER_REVIEW_STATUS_VARIANT_MAP: Record<TeacherReviewStatusEnum, StatusVariant> = {
  [TeacherReviewStatusEnum.NOT_STARTED]: 'neutral',
  [TeacherReviewStatusEnum.PENDING]: 'pending',
  [TeacherReviewStatusEnum.APPROVED]: 'success',
  [TeacherReviewStatusEnum.REJECTED]: 'danger',
}

export function mapTeacherReviewStatusToVariant(status?: string | null): StatusVariant {
  if (!status) return 'neutral'
  switch (status.toUpperCase()) {
    case TeacherReviewStatusEnum.NOT_STARTED:
      return TEACHER_REVIEW_STATUS_VARIANT_MAP[TeacherReviewStatusEnum.NOT_STARTED]
    case TeacherReviewStatusEnum.PENDING:
      return TEACHER_REVIEW_STATUS_VARIANT_MAP[TeacherReviewStatusEnum.PENDING]
    case TeacherReviewStatusEnum.APPROVED:
      return TEACHER_REVIEW_STATUS_VARIANT_MAP[TeacherReviewStatusEnum.APPROVED]
    case TeacherReviewStatusEnum.REJECTED:
      return TEACHER_REVIEW_STATUS_VARIANT_MAP[TeacherReviewStatusEnum.REJECTED]
    default:
      return 'neutral'
  }
}
