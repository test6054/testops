/** 考试工作台阶段完成度状态（与后端 ExamWorkbenchStageStatus 小写 code 对齐） */
export enum WorkbenchStageStatusCode {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  WARNING = 'warning',
  ERROR = 'error',
  BLOCKED = 'blocked',
}

export const ALL_WORKBENCH_STAGE_STATUS_CODES: readonly WorkbenchStageStatusCode[] = [
  WorkbenchStageStatusCode.PENDING,
  WorkbenchStageStatusCode.ACTIVE,
  WorkbenchStageStatusCode.COMPLETED,
  WorkbenchStageStatusCode.WARNING,
  WorkbenchStageStatusCode.ERROR,
  WorkbenchStageStatusCode.BLOCKED,
]

export const WorkbenchStageStatusDescription: Record<WorkbenchStageStatusCode, string> = {
  [WorkbenchStageStatusCode.PENDING]: '待开始',
  [WorkbenchStageStatusCode.ACTIVE]: '进行中',
  [WorkbenchStageStatusCode.COMPLETED]: '已完成',
  [WorkbenchStageStatusCode.WARNING]: '待完善',
  [WorkbenchStageStatusCode.ERROR]: '异常',
  [WorkbenchStageStatusCode.BLOCKED]: '已阻断',
}

