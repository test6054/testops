/** 考试工作台下一步动作 */
export enum WorkbenchNextActionKeyCode {
  START_SCAN = 'START_SCAN',
  ENTER_REVIEW = 'ENTER_REVIEW',
  ENTER_MARKING = 'ENTER_MARKING',
  EXPERIENCE_ASSIST_CALIBRATION = 'EXPERIENCE_ASSIST_CALIBRATION',
  SUBMIT_PUBLISH_REVIEW = 'SUBMIT_PUBLISH_REVIEW',
  APPROVE_PUBLISH_REVIEW = 'APPROVE_PUBLISH_REVIEW',
}

export const ALL_WORKBENCH_NEXT_ACTION_KEY_CODES: readonly WorkbenchNextActionKeyCode[] = [
  WorkbenchNextActionKeyCode.START_SCAN,
  WorkbenchNextActionKeyCode.ENTER_REVIEW,
  WorkbenchNextActionKeyCode.ENTER_MARKING,
  WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION,
  WorkbenchNextActionKeyCode.SUBMIT_PUBLISH_REVIEW,
  WorkbenchNextActionKeyCode.APPROVE_PUBLISH_REVIEW,
]

export const WorkbenchNextActionKeyDescription: Record<WorkbenchNextActionKeyCode, string> = {
  [WorkbenchNextActionKeyCode.START_SCAN]: '开始扫描录入',
  [WorkbenchNextActionKeyCode.ENTER_REVIEW]: '进入阅卷复核',
  [WorkbenchNextActionKeyCode.ENTER_MARKING]: '进入阅卷任务池',
  [WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION]: '前往定标',
  [WorkbenchNextActionKeyCode.SUBMIT_PUBLISH_REVIEW]: '提交发布复核',
  [WorkbenchNextActionKeyCode.APPROVE_PUBLISH_REVIEW]: '去签审',
}
