/** 归档任务来源（v3.2 SSOT） */
export enum ArchiveTaskProvenanceCode {
  EXAM_GATE_AUTO = 'EXAM_GATE_AUTO',
  CURRENT_TERM_OFFLINE = 'CURRENT_TERM_OFFLINE',
  HISTORICAL_DIGITIZE = 'HISTORICAL_DIGITIZE',
  BATCH_EXCEL = 'BATCH_EXCEL',
  RESEARCH_PROJECT_AUTO = 'RESEARCH_PROJECT_AUTO',
  THESIS_AUTO = 'THESIS_AUTO',
  STUDENT_RECORD_AUTO = 'STUDENT_RECORD_AUTO',
}

export const ALL_ARCHIVE_TASK_PROVENANCE_CODES: readonly ArchiveTaskProvenanceCode[] = [
  ArchiveTaskProvenanceCode.EXAM_GATE_AUTO,
  ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE,
  ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE,
  ArchiveTaskProvenanceCode.BATCH_EXCEL,
  ArchiveTaskProvenanceCode.RESEARCH_PROJECT_AUTO,
  ArchiveTaskProvenanceCode.THESIS_AUTO,
  ArchiveTaskProvenanceCode.STUDENT_RECORD_AUTO,
]

export const ArchiveTaskProvenanceDescription: Record<ArchiveTaskProvenanceCode, string> = {
  [ArchiveTaskProvenanceCode.EXAM_GATE_AUTO]: '考试双门禁自动',
  [ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE]: '本学期线下考核归档',
  [ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE]: '历史档案数字化',
  [ArchiveTaskProvenanceCode.BATCH_EXCEL]: '批量 Excel 导入',
  [ArchiveTaskProvenanceCode.RESEARCH_PROJECT_AUTO]: '科研项目自动归档',
  [ArchiveTaskProvenanceCode.THESIS_AUTO]: '毕设自动归档',
  [ArchiveTaskProvenanceCode.STUDENT_RECORD_AUTO]: '学籍自动归档',
}

/** 向导 Step0 可选手工创建来源 */
export const MANUAL_ARCHIVE_TASK_PROVENANCE_CODES: readonly ArchiveTaskProvenanceCode[] = [
  ArchiveTaskProvenanceCode.CURRENT_TERM_OFFLINE,
  ArchiveTaskProvenanceCode.HISTORICAL_DIGITIZE,
]
