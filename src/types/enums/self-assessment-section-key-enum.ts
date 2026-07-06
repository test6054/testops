/** 自评章节键 - SelfAssessmentSectionKeyEnum */
export enum SelfAssessmentSectionKeyCode {
  STUDENT = 'STUDENT',
  TRAINING_OBJECTIVE = 'TRAINING_OBJECTIVE',
  GRADUATION_REQUIREMENT = 'GRADUATION_REQUIREMENT',
  CONTINUOUS_IMPROVEMENT = 'CONTINUOUS_IMPROVEMENT',
  CURRICULUM = 'CURRICULUM',
  FACULTY = 'FACULTY',
  SUPPORT = 'SUPPORT',
  ATTACHMENT = 'ATTACHMENT',
}

export const ALL_SELF_ASSESSMENT_SECTION_KEY_CODES: readonly SelfAssessmentSectionKeyCode[] = [
  SelfAssessmentSectionKeyCode.STUDENT,
  SelfAssessmentSectionKeyCode.TRAINING_OBJECTIVE,
  SelfAssessmentSectionKeyCode.GRADUATION_REQUIREMENT,
  SelfAssessmentSectionKeyCode.CONTINUOUS_IMPROVEMENT,
  SelfAssessmentSectionKeyCode.CURRICULUM,
  SelfAssessmentSectionKeyCode.FACULTY,
  SelfAssessmentSectionKeyCode.SUPPORT,
  SelfAssessmentSectionKeyCode.ATTACHMENT,
]

export const SelfAssessmentSectionKeyDescription: Record<SelfAssessmentSectionKeyCode, string> = {
  [SelfAssessmentSectionKeyCode.STUDENT]: '一、学生',
  [SelfAssessmentSectionKeyCode.TRAINING_OBJECTIVE]: '二、培养目标',
  [SelfAssessmentSectionKeyCode.GRADUATION_REQUIREMENT]: '三、毕业要求',
  [SelfAssessmentSectionKeyCode.CONTINUOUS_IMPROVEMENT]: '四、持续改进',
  [SelfAssessmentSectionKeyCode.CURRICULUM]: '五、课程体系',
  [SelfAssessmentSectionKeyCode.FACULTY]: '六、师资队伍',
  [SelfAssessmentSectionKeyCode.SUPPORT]: '七、支持条件',
  [SelfAssessmentSectionKeyCode.ATTACHMENT]: '八、附件索引',
}

