import {
  ExamMaterialLayoutModeCode,
} from '@/types/enums/exam-material-layout-mode-enum'
import {
  ExamPrintSourceModeCode,
} from '@/types/enums/exam-print-source-mode-enum'

/**
 * 空白印刷母版菜单是否适用：
 * - 试卷+答题页：始终可生成空白答题页母版按座位送印
 * - 单独试卷：仅系统制卷需要生成空白整卷母版
 */
export function isPrintPackageMenuApplicable(
  materialLayoutMode?: ExamMaterialLayoutModeCode,
  printSourceMode?: ExamPrintSourceModeCode,
): boolean {
  if (materialLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET) {
    return true
  }
  return materialLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER
    && printSourceMode === ExamPrintSourceModeCode.SYSTEM_PRINT
}
