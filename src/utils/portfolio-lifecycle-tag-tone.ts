import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PortfolioTeacherLifecycleStatusCode as LifecycleStatus } from '@/types/enums/portfolio-teacher-lifecycle-status-enum'
import { PortfolioTeacherLifecycleStatusCode } from '@/types/enums/portfolio-teacher-lifecycle-status-enum'

type LifecycleStatusInput = LifecycleStatus | string | null | undefined

export type PortfolioLifecycleToneSource
  = | LifecycleStatusInput
    | {
      lifecycleStatus?: LifecycleStatusInput
      archiveWriteForbidden?: boolean
    }

/**
 * 教师生命周期 Tag 色调：ACTIVE 绿、TEMP_HOLD 橙、封存/迁出链路红，其余灰。
 * 接受状态码或含 lifecycleStatus / archiveWriteForbidden 的读模型行。
 */
export function portfolioLifecycleTagTone(input?: PortfolioLifecycleToneSource): BadgeTone {
  if (input == null) {
    return 'gray'
  }
  if (typeof input === 'string') {
    return toneFromStatus(input)
  }
  const status = input.lifecycleStatus
  if (status === PortfolioTeacherLifecycleStatusCode.ACTIVE) {
    return 'green'
  }
  if (status === PortfolioTeacherLifecycleStatusCode.TEMP_HOLD) {
    return 'orange'
  }
  if (
    status === PortfolioTeacherLifecycleStatusCode.SEALED
    || status === PortfolioTeacherLifecycleStatusCode.TRANSFERRED
    || status === PortfolioTeacherLifecycleStatusCode.TRANSFER_FROZEN
    || input.archiveWriteForbidden
  ) {
    return 'red'
  }
  return 'gray'
}

function toneFromStatus(status: string): BadgeTone {
  if (status === PortfolioTeacherLifecycleStatusCode.ACTIVE) {
    return 'green'
  }
  if (status === PortfolioTeacherLifecycleStatusCode.TEMP_HOLD) {
    return 'orange'
  }
  if (
    status === PortfolioTeacherLifecycleStatusCode.SEALED
    || status === PortfolioTeacherLifecycleStatusCode.TRANSFERRED
    || status === PortfolioTeacherLifecycleStatusCode.TRANSFER_FROZEN
  ) {
    return 'red'
  }
  return 'gray'
}
