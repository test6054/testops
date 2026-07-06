import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'

export interface ArchiveTemplateMaterialEditRow {
  rowKey: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  delayAllowedFlag?: boolean
  sortOrder?: number
  categoryGroup?: string
}

export interface ArchiveTemplateSelfCheckEditRow {
  rowKey: string
  itemText: string
  requiredFlag: boolean
  sortOrder?: number
  itemOrder?: number
}
