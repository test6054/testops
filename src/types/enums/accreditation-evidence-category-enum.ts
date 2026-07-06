/** 认证证据类别 - AccreditationEvidenceCategoryEnum */
export enum AccreditationEvidenceCategoryCode {
  EXAM_PAPER = 'EXAM_PAPER',
  HOMEWORK = 'HOMEWORK',
  LAB_REPORT = 'LAB_REPORT',
  GRADUATION_PROJECT = 'GRADUATION_PROJECT',
  COURSE_MATERIAL = 'COURSE_MATERIAL',
  FACILITY = 'FACILITY',
  MANAGEMENT_DOC = 'MANAGEMENT_DOC',
  OTHER = 'OTHER',
}

export const ALL_ACCREDITATION_EVIDENCE_CATEGORY_CODES: readonly AccreditationEvidenceCategoryCode[] = [
  AccreditationEvidenceCategoryCode.EXAM_PAPER,
  AccreditationEvidenceCategoryCode.HOMEWORK,
  AccreditationEvidenceCategoryCode.LAB_REPORT,
  AccreditationEvidenceCategoryCode.GRADUATION_PROJECT,
  AccreditationEvidenceCategoryCode.COURSE_MATERIAL,
  AccreditationEvidenceCategoryCode.FACILITY,
  AccreditationEvidenceCategoryCode.MANAGEMENT_DOC,
  AccreditationEvidenceCategoryCode.OTHER,
]

export const AccreditationEvidenceCategoryDescription: Record<AccreditationEvidenceCategoryCode, string> = {
  [AccreditationEvidenceCategoryCode.EXAM_PAPER]: '试卷样本',
  [AccreditationEvidenceCategoryCode.HOMEWORK]: '作业样本',
  [AccreditationEvidenceCategoryCode.LAB_REPORT]: '实验报告',
  [AccreditationEvidenceCategoryCode.GRADUATION_PROJECT]: '毕业设计',
  [AccreditationEvidenceCategoryCode.COURSE_MATERIAL]: '课程材料',
  [AccreditationEvidenceCategoryCode.FACILITY]: '实验设施',
  [AccreditationEvidenceCategoryCode.MANAGEMENT_DOC]: '管理文件',
  [AccreditationEvidenceCategoryCode.OTHER]: '其他',
}
