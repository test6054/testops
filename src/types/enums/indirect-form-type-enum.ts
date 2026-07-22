/** 间接评价问卷类型 - 与后端 IndirectFormTypeEnum 逐值对齐 */
export enum IndirectFormTypeCode {
  STUDENT_SELF = 'STUDENT_SELF',
  GRADUATE_TRACKING = 'GRADUATE_TRACKING',
  EMPLOYER_FEEDBACK = 'EMPLOYER_FEEDBACK',
  TEACHER_EVALUATION = 'TEACHER_EVALUATION',
  EXPERT_EVALUATION = 'EXPERT_EVALUATION',
  SUPERVISOR_EVALUATION = 'SUPERVISOR_EVALUATION',
}

export const ALL_INDIRECT_FORM_TYPE_CODES: readonly IndirectFormTypeCode[] = [
  IndirectFormTypeCode.STUDENT_SELF,
  IndirectFormTypeCode.GRADUATE_TRACKING,
  IndirectFormTypeCode.EMPLOYER_FEEDBACK,
  IndirectFormTypeCode.TEACHER_EVALUATION,
  IndirectFormTypeCode.EXPERT_EVALUATION,
  IndirectFormTypeCode.SUPERVISOR_EVALUATION,
]

export const IndirectFormTypeDescription: Record<IndirectFormTypeCode, string> = {
  [IndirectFormTypeCode.STUDENT_SELF]: '学生自评',
  [IndirectFormTypeCode.GRADUATE_TRACKING]: '毕业生跟踪',
  [IndirectFormTypeCode.EMPLOYER_FEEDBACK]: '用人单位反馈',
  [IndirectFormTypeCode.TEACHER_EVALUATION]: '教师评价',
  [IndirectFormTypeCode.EXPERT_EVALUATION]: '行业或校外专家评价',
  [IndirectFormTypeCode.SUPERVISOR_EVALUATION]: '教学督导评价',
}
