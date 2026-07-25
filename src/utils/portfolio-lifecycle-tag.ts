import type {
  PortfolioTeacherLifecycleApprovalStatusCode,
  PortfolioTeacherLifecycleChangeTypeCode,
  PortfolioTeacherLifecycleSourceTypeCode,
  PortfolioTeacherLifecycleStatusCode,
} from '@/apis/portfolio/teacher-lifecycle'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  PORTFOLIO_TEACHER_LIFECYCLE_APPROVAL_STATUS_LABEL,
  PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_TYPE_LABEL,
  PORTFOLIO_TEACHER_LIFECYCLE_SOURCE_TYPE_LABEL,
  PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL,
} from '@/apis/portfolio/teacher-lifecycle'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

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

/**
 * 生命周期展示文案唯一真源：PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL。
 * 禁止消费后端 lifecycleStatusLabel 双轨字段，禁止英文枚举码兜底。
 */
export function portfolioLifecycleStatusDisplay(status: PortfolioTeacherLifecycleStatusCode | undefined | null): string {
  if (!status) {
    throw new Error('枚举合同不同步：教师生命周期状态缺失')
  }
  return strictEnumLabel(
    PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL,
    status,
    '教师生命周期状态',
  )
}

/**
 * 变更类型展示真源；缺省空串（状态行可能尚未发生变更）。
 */
export function portfolioLifecycleChangeTypeDisplay(
  changeType: PortfolioTeacherLifecycleChangeTypeCode | undefined | null,
): string {
  if (!changeType) {
    return ''
  }
  return strictEnumLabel(
    PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_TYPE_LABEL,
    changeType,
    '教师生命周期变更类型',
  )
}

/**
 * 变更来源展示真源；缺省空串。
 */
export function portfolioLifecycleSourceTypeDisplay(
  sourceType: PortfolioTeacherLifecycleSourceTypeCode | undefined | null,
): string {
  if (!sourceType) {
    return ''
  }
  return strictEnumLabel(
    PORTFOLIO_TEACHER_LIFECYCLE_SOURCE_TYPE_LABEL,
    sourceType,
    '教师生命周期变更来源',
  )
}

/**
 * 审批状态展示真源；缺省空串。
 */
export function portfolioLifecycleApprovalStatusDisplay(
  approvalStatus: PortfolioTeacherLifecycleApprovalStatusCode | undefined | null,
): string {
  if (!approvalStatus) {
    return ''
  }
  return strictEnumLabel(
    PORTFOLIO_TEACHER_LIFECYCLE_APPROVAL_STATUS_LABEL,
    approvalStatus,
    '教师生命周期审批状态',
  )
}
