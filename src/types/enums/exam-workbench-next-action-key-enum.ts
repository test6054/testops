/** 考试工作台下一步动作 */
export enum WorkbenchNextActionKeyCode {
  START_SCAN = 'START_SCAN',
  ENTER_REVIEW = 'ENTER_REVIEW',
  ENTER_MARKING = 'ENTER_MARKING',
}

export const ALL_WORKBENCH_NEXT_ACTION_KEY_CODES: readonly WorkbenchNextActionKeyCode[] = [
  WorkbenchNextActionKeyCode.START_SCAN,
  WorkbenchNextActionKeyCode.ENTER_REVIEW,
  WorkbenchNextActionKeyCode.ENTER_MARKING,
]

export const WorkbenchNextActionKeyDescription: Record<WorkbenchNextActionKeyCode, string> = {
  [WorkbenchNextActionKeyCode.START_SCAN]: '开始扫描录入',
  [WorkbenchNextActionKeyCode.ENTER_REVIEW]: '进入阅卷复核',
  [WorkbenchNextActionKeyCode.ENTER_MARKING]: '进入阅卷任务池',
}

