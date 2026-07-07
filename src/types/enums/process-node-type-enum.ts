/** 过程性评价节点类型 - ProcessNodeTypeEnum */
export enum ProcessNodeTypeCode {
  CLASS_INTERACTION = 'CLASS_INTERACTION',
  STAGE_HOMEWORK = 'STAGE_HOMEWORK',
  PROJECT_MILESTONE = 'PROJECT_MILESTONE',
  LAB_RECORD = 'LAB_RECORD',
  PRACTICE_LOG = 'PRACTICE_LOG',
  WORK_ITERATION = 'WORK_ITERATION',
  CASE_DISCUSSION = 'CASE_DISCUSSION',
  INTERNSHIP_EVALUATION = 'INTERNSHIP_EVALUATION',
}

export const ALL_PROCESS_NODE_TYPE_CODES: readonly ProcessNodeTypeCode[] = [
  ProcessNodeTypeCode.CLASS_INTERACTION,
  ProcessNodeTypeCode.STAGE_HOMEWORK,
  ProcessNodeTypeCode.PROJECT_MILESTONE,
  ProcessNodeTypeCode.LAB_RECORD,
  ProcessNodeTypeCode.PRACTICE_LOG,
  ProcessNodeTypeCode.WORK_ITERATION,
  ProcessNodeTypeCode.CASE_DISCUSSION,
  ProcessNodeTypeCode.INTERNSHIP_EVALUATION,
]

export const ProcessNodeTypeDescription: Record<ProcessNodeTypeCode, string> = {
  [ProcessNodeTypeCode.CLASS_INTERACTION]: '课堂互动',
  [ProcessNodeTypeCode.STAGE_HOMEWORK]: '阶段作业',
  [ProcessNodeTypeCode.PROJECT_MILESTONE]: '项目里程碑',
  [ProcessNodeTypeCode.LAB_RECORD]: '实验记录',
  [ProcessNodeTypeCode.PRACTICE_LOG]: '实践日志',
  [ProcessNodeTypeCode.WORK_ITERATION]: '作品迭代',
  [ProcessNodeTypeCode.CASE_DISCUSSION]: '案例研讨',
  [ProcessNodeTypeCode.INTERNSHIP_EVALUATION]: '实习过程评价',
}
