/** 归档考核形式 */
export enum ArchiveExamFormCode {
  WRITTEN_EXAM = 'WRITTEN_EXAM',
  INSPECTION = 'INSPECTION',
  EXPERIMENT = 'EXPERIMENT',
  THESIS = 'THESIS',
  WORK = 'WORK',
  DEFENSE = 'DEFENSE',
  PAPERLESS = 'PAPERLESS',
}

export const ALL_ARCHIVE_EXAM_FORM_CODES: readonly ArchiveExamFormCode[] = [
  ArchiveExamFormCode.WRITTEN_EXAM,
  ArchiveExamFormCode.INSPECTION,
  ArchiveExamFormCode.EXPERIMENT,
  ArchiveExamFormCode.THESIS,
  ArchiveExamFormCode.WORK,
  ArchiveExamFormCode.DEFENSE,
  ArchiveExamFormCode.PAPERLESS,
]
export const ArchiveExamFormDescription: Record<ArchiveExamFormCode, string> = {
  [ArchiveExamFormCode.WRITTEN_EXAM]: '笔试',
  [ArchiveExamFormCode.INSPECTION]: '考查',
  [ArchiveExamFormCode.EXPERIMENT]: '实验',
  [ArchiveExamFormCode.THESIS]: '论文',
  [ArchiveExamFormCode.WORK]: '作品',
  [ArchiveExamFormCode.DEFENSE]: '答辩',
  [ArchiveExamFormCode.PAPERLESS]: '无纸化',
}
