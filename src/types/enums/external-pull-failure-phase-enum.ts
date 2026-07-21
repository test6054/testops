/** 外部拔取失败阶段 - ExternalPullFailurePhaseEnum */
export enum ExternalPullFailurePhaseCode {
  INIT = 'INIT',
  LOAD_DATA_SOURCE = 'LOAD_DATA_SOURCE',
  EXECUTE_QUERY = 'EXECUTE_QUERY',
  UPLOAD_RESULT_FILE = 'UPLOAD_RESULT_FILE',
  INSERT_RESULT = 'INSERT_RESULT',
  UPDATE_TASK_STATUS = 'UPDATE_TASK_STATUS',
  RUNNING_TIMEOUT_RECOVERY = 'RUNNING_TIMEOUT_RECOVERY',
}

export const ALL_EXTERNAL_PULL_FAILURE_PHASE_CODES: readonly ExternalPullFailurePhaseCode[] = [
  ExternalPullFailurePhaseCode.INIT,
  ExternalPullFailurePhaseCode.LOAD_DATA_SOURCE,
  ExternalPullFailurePhaseCode.EXECUTE_QUERY,
  ExternalPullFailurePhaseCode.UPLOAD_RESULT_FILE,
  ExternalPullFailurePhaseCode.INSERT_RESULT,
  ExternalPullFailurePhaseCode.UPDATE_TASK_STATUS,
  ExternalPullFailurePhaseCode.RUNNING_TIMEOUT_RECOVERY,
]

export const ExternalPullFailurePhaseDescription: Record<ExternalPullFailurePhaseCode, string> = {
  [ExternalPullFailurePhaseCode.INIT]: '初始化',
  [ExternalPullFailurePhaseCode.LOAD_DATA_SOURCE]: '加载数据源',
  [ExternalPullFailurePhaseCode.EXECUTE_QUERY]: '执行查询',
  [ExternalPullFailurePhaseCode.UPLOAD_RESULT_FILE]: '上传结果文件',
  [ExternalPullFailurePhaseCode.INSERT_RESULT]: '写入预览结果',
  [ExternalPullFailurePhaseCode.UPDATE_TASK_STATUS]: '更新任务状态',
  [ExternalPullFailurePhaseCode.RUNNING_TIMEOUT_RECOVERY]: '运行超时回收',
}
