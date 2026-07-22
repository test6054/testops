import type { ExamMaterialLayoutModeCode} from '@/types/enums/exam-material-layout-mode-enum';
import { ExamMaterialLayoutModeDescription } from '@/types/enums/exam-material-layout-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 扫描台材料类型标签：真源为 ExamMaterialLayoutMode（与制卷形态同一合同） */
export function kioskMaterialKindLabel(mode?: ExamMaterialLayoutModeCode): string {
  if (!mode) return '未配置'
  return strictEnumLabel(ExamMaterialLayoutModeDescription, mode, '扫描材料类型')
}
