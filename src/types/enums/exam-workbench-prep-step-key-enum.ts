/** 考试工作台准备步骤键 - 与后端 ExamWorkbenchPrepStepKey 逐值对齐 */
export enum ExamWorkbenchPrepStepKeyCode {
  MATERIAL_LAYOUT = 'MATERIAL_LAYOUT',
  CANDIDATE_ROSTER = 'CANDIDATE_ROSTER',
  PAPER_TEMPLATE = 'PAPER_TEMPLATE',
  LAYOUT_DESIGN = 'LAYOUT_DESIGN',
  PRINT_PACKAGE = 'PRINT_PACKAGE',
  EXPERIENCE_ASSIST = 'EXPERIENCE_ASSIST',
}

export const ALL_EXAM_WORKBENCH_PREP_STEP_KEY_CODES: readonly ExamWorkbenchPrepStepKeyCode[] = [
  ExamWorkbenchPrepStepKeyCode.MATERIAL_LAYOUT,
  ExamWorkbenchPrepStepKeyCode.CANDIDATE_ROSTER,
  ExamWorkbenchPrepStepKeyCode.PAPER_TEMPLATE,
  ExamWorkbenchPrepStepKeyCode.LAYOUT_DESIGN,
  ExamWorkbenchPrepStepKeyCode.PRINT_PACKAGE,
  ExamWorkbenchPrepStepKeyCode.EXPERIENCE_ASSIST,
]
