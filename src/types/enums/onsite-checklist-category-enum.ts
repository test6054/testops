/** 现场考查清单类别 - OnsiteChecklistCategoryEnum */
export enum OnsiteChecklistCategoryCode {
  FACILITY = 'FACILITY',
  PAPER_SAMPLE = 'PAPER_SAMPLE',
  CLASS_OBSERVATION = 'CLASS_OBSERVATION',
  INTERVIEW = 'INTERVIEW',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

export const ALL_ONSITE_CHECKLIST_CATEGORY_CODES: readonly OnsiteChecklistCategoryCode[] = [
  OnsiteChecklistCategoryCode.FACILITY,
  OnsiteChecklistCategoryCode.PAPER_SAMPLE,
  OnsiteChecklistCategoryCode.CLASS_OBSERVATION,
  OnsiteChecklistCategoryCode.INTERVIEW,
  OnsiteChecklistCategoryCode.DOCUMENT,
  OnsiteChecklistCategoryCode.OTHER,
]

export const OnsiteChecklistCategoryDescription: Record<OnsiteChecklistCategoryCode, string> = {
  [OnsiteChecklistCategoryCode.FACILITY]: '实验与工程训练设施',
  [OnsiteChecklistCategoryCode.PAPER_SAMPLE]: '试卷与作业样本',
  [OnsiteChecklistCategoryCode.CLASS_OBSERVATION]: '课堂听课',
  [OnsiteChecklistCategoryCode.INTERVIEW]: '访谈座谈',
  [OnsiteChecklistCategoryCode.DOCUMENT]: '支撑材料与档案',
  [OnsiteChecklistCategoryCode.OTHER]: '其他',
}

