/** 一体机送纸物类型（教师工位视角，区别于制卷形态配置文案） */
export enum KioskScanMaterialKindCode {
  ANSWER_SHEET = 'ANSWER_SHEET',
  FULL_PAPER = 'FULL_PAPER',
}

export const ALL_KIOSK_SCAN_MATERIAL_KIND_CODES: readonly KioskScanMaterialKindCode[] = [
  KioskScanMaterialKindCode.ANSWER_SHEET,
  KioskScanMaterialKindCode.FULL_PAPER,
]

export const KioskScanMaterialKindDescription: Record<KioskScanMaterialKindCode, string> = {
  [KioskScanMaterialKindCode.ANSWER_SHEET]: '答卷页',
  [KioskScanMaterialKindCode.FULL_PAPER]: '试卷',
}

