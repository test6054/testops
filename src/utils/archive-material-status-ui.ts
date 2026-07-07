import type { ArchiveMaterialSubmissionStatusCode } from '@/apis/mark/archive-volume'
import { ArchiveMaterialSubmissionStatusDescription } from '@/apis/mark/archive-volume'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 原型 material-status-icon 三态：就绪 / 缺件 / 待处理。 */
export type ArchiveMaterialStatusVariant = 'ok' | 'missing' | 'pending'

export interface ArchiveMaterialStatusView {
  variant: ArchiveMaterialStatusVariant
  icon: string
  label: string
}

/** 将提交状态映射为原型 material-status 展示视图。 */
export function buildArchiveMaterialStatusView(
  status?: ArchiveMaterialSubmissionStatusCode,
): ArchiveMaterialStatusView {
  if (!status) {
    return { variant: 'pending', icon: '…', label: '待处理' }
  }
  if (status === 'SUBMITTED' || status === 'DELAY_ALLOWED') {
    return { variant: 'ok', icon: '✓', label: '已就绪' }
  }
  if (status === 'MISSING' || status === 'OVERDUE') {
    return { variant: 'missing', icon: '…', label: '缺件' }
  }
  return {
    variant: 'pending',
    icon: '…',
    label: strictEnumLabel(ArchiveMaterialSubmissionStatusDescription, status, 'submissionStatus'),
  }
}

/** 材料就绪计数：与原型 x/y 就绪口径一致（已提交或允许延迟补交）。 */
export function countArchiveMaterialsReady(
  materials: { submissionStatus?: ArchiveMaterialSubmissionStatusCode }[],
): number {
  return materials.filter(
    (item) =>
      item.submissionStatus === 'SUBMITTED' || item.submissionStatus === 'DELAY_ALLOWED',
  ).length
}
