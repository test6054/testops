import type { CandidateDraft, CandidateRow } from './types'
import type { ClassStudentTreeSelectedStudentVO } from '@/apis/edu/class'
import type { ExamCandidateResponse, ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import type { UserDto } from '@/types/api-types.d'

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
    removable: draft.removable,
    removalBlockReason: draft.removalBlockReason,
  }
}

/** 将分页考生 API 响应映射为表格行模型 */
export function candidateRowFromExamCandidate(item: ExamCandidateResponse): CandidateRow {
  return toCandidateRow(
    {
      studentUserId: item.studentUserId,
      studentNo: item.studentNo,
      studentName: item.studentName,
      classId: item.classId ?? '',
      className: item.className,
      removable: item.removable,
      removalBlockReason: item.removalBlockReason,
    },
    item.candidateRosterId,
  )
}

/** 由班级学生树选中项构建增量合并名册请求 */
export function buildExamCandidateMergeRequests(
  rows: ClassStudentTreeSelectedStudentVO[],
  existingStudentUserIds: readonly string[],
): ExamCandidateRosterRequest[] {
  const existing = new Set(existingStudentUserIds)
  const request: ExamCandidateRosterRequest[] = []
  for (const row of rows) {
    const studentUserId = row.id.trim()
    const classId = String(row.classId ?? '').trim()
    if (!studentUserId || !classId || existing.has(studentUserId)) {
      continue
    }
    request.push({ studentUserId, classId })
  }
  return request
}

/** 由 UserDto 与班级构建单条名册合并请求 */
export function examCandidateRosterRequestFromUser(
  classId: string,
  student: UserDto,
): ExamCandidateRosterRequest {
  return {
    classId: classId.trim(),
    studentUserId: student.id.trim(),
  }
}
