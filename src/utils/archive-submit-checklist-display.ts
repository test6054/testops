import type {
  ArchiveVolumeSubmitChecklistDimensionCode
} from '@/types/enums/archive-volume-submit-checklist-dimension-enum'
import {
  ArchiveVolumeSubmitChecklistDimensionDescription
} from '@/types/enums/archive-volume-submit-checklist-dimension-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 提交清单阻塞项维度展示文案。 */
export function submitChecklistDimensionLabel(dimension: ArchiveVolumeSubmitChecklistDimensionCode): string {
  return strictEnumLabel(
    ArchiveVolumeSubmitChecklistDimensionDescription,
    dimension,
    '归档提交清单维度',
  )
}
