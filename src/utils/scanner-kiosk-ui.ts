import type { ExamScannerKioskTaskContractVO } from '@/apis/mark/scanner-kiosk'
import { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import { ScannerKioskScanModeCode } from '@/apis/mark/scanner-kiosk'
import {
  KioskScanMaterialKindCode,
  KioskScanMaterialKindDescription,
} from '@/types/enums/kiosk-scan-material-kind-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export function kioskMaterialKindLabel(mode?: ExamMaterialLayoutModeCode): string {
  if (!mode) return '未配置'
  const materialKind = mode === ExamMaterialLayoutModeCode.ANSWER_SHEET
    ? KioskScanMaterialKindCode.ANSWER_SHEET
    : KioskScanMaterialKindCode.FULL_PAPER
  return strictEnumLabel(KioskScanMaterialKindDescription, materialKind, '扫描材料类型')
}

export const KIOSK_SUPPLEMENT_SCAN_MODE_ADVISORY
  = '补扫每次仅登记单页，须选择本工位已绑定试卷、指定目标页号并填写补扫原因；'
    + '开启「替换目标页」时旧扫描页失效并重新识别。'

export function kioskScanModeAdvisory(mode: ScannerKioskScanModeCode): string {
  return mode === ScannerKioskScanModeCode.SUPPLEMENT ? KIOSK_SUPPLEMENT_SCAN_MODE_ADVISORY : ''
}

/**
 * 参考班级或名册未配置时的软提醒；不阻断直扫登记。
 */
export function resolveKioskClassScopeAdvisory(classIds?: readonly string[]): string {
  if (!classIds || classIds.length === 0) {
    return '考试尚未配置参考班级或名册，已按直扫登记；后续请在 Web 端补配班级与考生名册以完成身份绑定'
  }
  return ''
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
