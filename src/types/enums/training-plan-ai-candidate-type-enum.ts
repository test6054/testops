/** 培养方案 AI 候选类别 - TrainingPlanAiCandidateTypeEnum */
export enum TrainingPlanAiCandidateTypeCode {
  OBJECTIVE = 'OBJECTIVE',
  REQUIREMENT = 'REQUIREMENT',
  COURSE_MATRIX = 'COURSE_MATRIX',
}

export const ALL_TRAINING_PLAN_AI_CANDIDATE_TYPE_CODES: readonly TrainingPlanAiCandidateTypeCode[] = [
  TrainingPlanAiCandidateTypeCode.OBJECTIVE,
  TrainingPlanAiCandidateTypeCode.REQUIREMENT,
  TrainingPlanAiCandidateTypeCode.COURSE_MATRIX,
]

export const TrainingPlanAiCandidateTypeDescription: Record<TrainingPlanAiCandidateTypeCode, string> = {
  [TrainingPlanAiCandidateTypeCode.OBJECTIVE]: '培养目标',
  [TrainingPlanAiCandidateTypeCode.REQUIREMENT]: '毕业要求',
  [TrainingPlanAiCandidateTypeCode.COURSE_MATRIX]: '课程矩阵',
}
