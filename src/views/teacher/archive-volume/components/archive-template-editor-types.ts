import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { ArchiveMaterialDeliveryModeCode } from '@/types/enums/archive-material-delivery-mode-enum'

export interface ArchiveTemplateMaterialEditRow {
  rowKey: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
  categoryGroup?: string
  deliveryMode?: ArchiveMaterialDeliveryModeCode
}

export interface ArchiveTemplateSelfCheckEditRow {
  rowKey: string
  itemText: string
  requiredFlag: boolean
  sortOrder?: number
  itemOrder?: number
}
