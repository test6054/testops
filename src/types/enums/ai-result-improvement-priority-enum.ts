/** AI 改进建议优先级 / 分类协议值 - AiResultImprovementPriorityEnum */
export enum AiResultImprovementPriorityCode {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  VERIFICATION = 'VERIFICATION',
  OBSERVE = 'OBSERVE',
  TEACHING = 'TEACHING',
  ASSESSMENT = 'ASSESSMENT',
  STUDENT_SUPPORT = 'STUDENT_SUPPORT',
  FACULTY_PREPARATION = 'FACULTY_PREPARATION',
  RESOURCE = 'RESOURCE',
}

export const ALL_AI_RESULT_IMPROVEMENT_PRIORITY_CODES: readonly AiResultImprovementPriorityCode[] = [
  AiResultImprovementPriorityCode.URGENT,
  AiResultImprovementPriorityCode.HIGH,
  AiResultImprovementPriorityCode.VERIFICATION,
  AiResultImprovementPriorityCode.OBSERVE,
  AiResultImprovementPriorityCode.TEACHING,
  AiResultImprovementPriorityCode.ASSESSMENT,
  AiResultImprovementPriorityCode.STUDENT_SUPPORT,
  AiResultImprovementPriorityCode.FACULTY_PREPARATION,
  AiResultImprovementPriorityCode.RESOURCE,
]

export const AiResultImprovementPriorityDescription: Record<AiResultImprovementPriorityCode, string> = {
  [AiResultImprovementPriorityCode.URGENT]: '紧急',
  [AiResultImprovementPriorityCode.HIGH]: '高优先级',
  [AiResultImprovementPriorityCode.VERIFICATION]: '验证',
  [AiResultImprovementPriorityCode.OBSERVE]: '观察',
  [AiResultImprovementPriorityCode.TEACHING]: '教学',
  [AiResultImprovementPriorityCode.ASSESSMENT]: '考核',
  [AiResultImprovementPriorityCode.STUDENT_SUPPORT]: '学生支持',
  [AiResultImprovementPriorityCode.FACULTY_PREPARATION]: '师资',
  [AiResultImprovementPriorityCode.RESOURCE]: '资源',
}
