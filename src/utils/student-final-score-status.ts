import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  StudentFacingFinalScoreStatusCode,
  StudentFacingFinalScoreStatusDescription,
} from '@/types/enums/student-facing-final-score-status-enum'

/**
 * 学生端成绩态展示真源：只认后端 StudentFacingFinalScoreStatus 四态合同。
 */
export function studentFacingFinalScoreStatusLabel(status: StudentFacingFinalScoreStatusCode): string {
  return StudentFacingFinalScoreStatusDescription[status]
}

/** 学生端成绩态色调。 */
export function studentFacingFinalScoreStatusTone(status: StudentFacingFinalScoreStatusCode): BadgeTone {
  if (status === StudentFacingFinalScoreStatusCode.PUBLISHED) {
    return 'green'
  }
  if (status === StudentFacingFinalScoreStatusCode.CORRECTED) {
    return 'orange'
  }
  return 'gray'
}

/** 学生端分数字段旁文案（非已发布时）。 */
export function studentFacingUnpublishedScoreText(status: StudentFacingFinalScoreStatusCode): string {
  if (status === StudentFacingFinalScoreStatusCode.CORRECTED) {
    return StudentFacingFinalScoreStatusDescription[StudentFacingFinalScoreStatusCode.CORRECTED]
  }
  if (status === StudentFacingFinalScoreStatusCode.WITHDRAWN) {
    return '成绩已撤回'
  }
  return StudentFacingFinalScoreStatusDescription[StudentFacingFinalScoreStatusCode.UNPUBLISHED]
}
