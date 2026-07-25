import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { strictEnumTone } from '@/utils/strict-enum'

/** 教师生命周期状态 → UiTag tone（合同全量键，禁止页面私有 string 宽化）。 */
export const PORTFOLIO_TEACHER_LIFECYCLE_STATUS_TONE: Record<
  PortfolioTeacherLifecycleStatusCode,
  BadgeTone
> = {
  ACTIVE: 'green',
  TEMP_HOLD: 'orange',
  SEALED: 'red',
  TRANSFERRED: 'red',
  TRANSFER_FROZEN: 'gray',
}

/**
 * 解析教师生命周期标签色。
 * ACTIVE 优先于写禁；无状态返回 gray；非法状态由 strictEnumTone 显式失败。
 */
export function portfolioLifecycleTagTone(
  status: PortfolioTeacherLifecycleStatusCode | undefined | null,
  options?: { archiveWriteForbidden?: boolean },
): BadgeTone {
  if (status === 'ACTIVE') {
    return 'green'
  }
  if (options?.archiveWriteForbidden) {
    return 'red'
  }
  if (!status) {
    return 'gray'
  }
  return strictEnumTone(
    PORTFOLIO_TEACHER_LIFECYCLE_STATUS_TONE,
    status,
    '教师生命周期状态',
  )
}
