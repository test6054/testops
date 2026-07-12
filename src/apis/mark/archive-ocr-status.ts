import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ALL_ARCHIVE_MATERIAL_OCR_STATUS_CODES,
  ArchiveMaterialOcrStatusCode,
  ArchiveMaterialOcrStatusDescription,
} from '@/types/enums/archive-material-ocr-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_ARCHIVE_MATERIAL_OCR_STATUS_CODES,
  ArchiveMaterialOcrStatusCode,
  ArchiveMaterialOcrStatusDescription,
} from '@/types/enums/archive-material-ocr-status-enum'

export const ARCHIVE_MATERIAL_OCR_STATUS_TONE: Record<ArchiveMaterialOcrStatusCode, BadgeTone> = {
  [ArchiveMaterialOcrStatusCode.NONE]: 'gray',
  [ArchiveMaterialOcrStatusCode.PENDING]: 'blue',
  [ArchiveMaterialOcrStatusCode.RUNNING]: 'orange',
  [ArchiveMaterialOcrStatusCode.COMPLETED]: 'green',
  [ArchiveMaterialOcrStatusCode.FAILED]: 'red',
}

export const ARCHIVE_MATERIAL_OCR_STATUS_OPTIONS: Array<{
  label: string
  value: ArchiveMaterialOcrStatusCode
}> = ALL_ARCHIVE_MATERIAL_OCR_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveMaterialOcrStatusDescription, value, '归档材料 OCR 状态'),
}))
