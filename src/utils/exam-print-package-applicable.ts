import {
  ExamMaterialLayoutModeCode,
} from '@/types/enums/exam-material-layout-mode-enum'
import {
  ExamPrintSourceModeCode,
} from '@/types/enums/exam-print-source-mode-enum'

/** 仅整卷作答 + 系统制卷需要印刷包菜单与页面能力 */
export function isPrintPackageMenuApplicable(
  materialLayoutMode?: ExamMaterialLayoutModeCode,
  printSourceMode?: ExamPrintSourceModeCode,
): boolean {
  return materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER
    && printSourceMode === ExamPrintSourceModeCode.SYSTEM_PRINT
}
