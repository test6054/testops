export enum ArchiveMaterialDeliveryModeCode {
  PHYSICAL_SCAN = 'PHYSICAL_SCAN',
  DIGITAL_CONFIRM = 'DIGITAL_CONFIRM',
}

export const ALL_ARCHIVE_MATERIAL_DELIVERY_MODE_CODES = [
  ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN,
  ArchiveMaterialDeliveryModeCode.DIGITAL_CONFIRM,
] as const

export const ArchiveMaterialDeliveryModeDescription: Record<ArchiveMaterialDeliveryModeCode, string> = {
  [ArchiveMaterialDeliveryModeCode.PHYSICAL_SCAN]: '纸质扫描',
  [ArchiveMaterialDeliveryModeCode.DIGITAL_CONFIRM]: '电子确认',
}
