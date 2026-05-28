import type { CandidateDraft, CandidateRow } from './types'

export function toCandidateRow(draft: CandidateDraft, candidateRosterId?: string): CandidateRow {
  const studentUserId = draft.studentUserId.trim()
  return {
    rowKey: studentUserId,
    candidateRosterId,
    studentUserId,
    studentNo: draft.studentNo.trim(),
    studentName: draft.studentName.trim(),
    classId: draft.classId.trim(),
    className: draft.className?.trim() || undefined,
  }
}

export function mergeCandidateDrafts(
  existing: CandidateRow[],
  incoming: CandidateDraft[],
): { rows: CandidateRow[]; added: number; skipped: number } {
  const byUserId = new Set(existing.map((row) => row.studentUserId))
  let added = 0
  let skipped = 0
  const rows = [...existing]
  for (const draft of incoming) {
    const userId = draft.studentUserId.trim()
    const studentNo = draft.studentNo.trim()
    const studentName = draft.studentName.trim()
    if (!userId || !studentNo || !studentName) {
      skipped += 1
      continue
    }
    if (byUserId.has(userId)) {
      skipped += 1
      continue
    }
    byUserId.add(userId)
    rows.push(toCandidateRow(draft))
    added += 1
  }
  return { rows, added, skipped }
}

export function removeCandidateByUserId(
  rows: CandidateRow[],
  studentUserId: string,
): CandidateRow[] {
  return rows.filter((row) => row.studentUserId !== studentUserId)
}
