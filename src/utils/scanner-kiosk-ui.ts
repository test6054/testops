import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type { ExamScannerKioskTaskContractVO, ScannerKioskScanMode } from '@/apis/mark/scanner-kiosk'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 一体机送纸物类型（扫描员视角，区别于制卷形态配置文案） */
export const KIOSK_SCAN_MATERIAL_KIND_LABEL: Record<ExamMaterialLayoutModeCode, string> = {
  ANSWER_SHEET: '答卷页',
  FULL_PAPER: '试卷',
}

export function kioskMaterialKindLabel(mode?: ExamMaterialLayoutModeCode): string {
  if (!mode) return '未配置'
  return strictEnumLabel(KIOSK_SCAN_MATERIAL_KIND_LABEL, mode, '扫描材料类型')
}

export const KIOSK_SUPPLEMENT_SCAN_MODE_ADVISORY =
  '补扫每次仅登记单页，须选择本工位已绑定试卷、指定目标页号并填写补扫原因；'
  + '开启「替换目标页」时旧扫描页失效并重新识别。'

export function kioskScanModeAdvisory(mode: ScannerKioskScanMode): string {
  return mode === 'SUPPLEMENT' ? KIOSK_SUPPLEMENT_SCAN_MODE_ADVISORY : ''
}

/**
 * 制卷或模板未完备时的软提醒；不阻断扫描，仅提示 Web 端后续补配。
 */
export function resolveKioskScanMaterialAdvisory(contract?: ExamScannerKioskTaskContractVO | null): string {
  if (!contract) return ''
  if (!contract.materialLayoutMode) {
    return '考试尚未选择制卷形态，已按单面扫描登记；识别链路需在 Web 端补配制卷形态与模板'
  }
  const pages = contract.pagesPerSheet
  if (pages == null || pages <= 0) {
    return '考试模板页数未配置，已按单面扫描建议参数；送纸后可在 Web 端补配模板'
  }
  return ''
}
