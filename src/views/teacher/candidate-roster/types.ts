/** 考试考生名册行：以租户学生用户 ID 为表格主键与去重键 */
export interface CandidateRow {
  /** 与 studentUserId 一致，供表格 row-key */
  rowKey: string
  /** 名册持久化记录 ID（已保存时有值） */
  candidateRosterId?: string
  /** 租户学生用户 ID（主键） */
  studentUserId: string
  studentNo: string
  studentName: string
  classId: string
  className?: string
}

export interface CandidateDraft {
  studentUserId: string
  studentNo: string
  studentName: string
  classId: string
  className?: string
}
