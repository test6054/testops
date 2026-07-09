import { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import {
  KioskScanMaterialKindCode,
  KioskScanMaterialKindDescription,
} from '@/types/enums/kiosk-scan-material-kind-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export function kioskMaterialKindLabel(mode?: ExamMaterialLayoutModeCode): string {
  if (!mode) return '未配置'
  const materialKind
    = mode === ExamMaterialLayoutModeCode.ANSWER_SHEET
      ? KioskScanMaterialKindCode.ANSWER_SHEET
      : KioskScanMaterialKindCode.FULL_PAPER
  return strictEnumLabel(KioskScanMaterialKindDescription, materialKind, '扫描材料类型')
}
