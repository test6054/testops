import type { CandidateDraft, CandidateRow } from './types'

export function toCandidateRow(draft: CandidateDraft, candidateRosterId?: string): CandidateRow {
  const studentUserId = draft.studentUserId.trim()
  return {
    rowKey: studentUserId,
    candidateRosterId,
    studentUserId,
    studentNo: draft.studentNo?.trim() || undefined,
    studentName: draft.studentName?.trim() || undefined,
    classId: draft.classId.trim(),
    className: draft.className?.trim() || undefined,
  }
}
